// Team 5 — The Next Step: one career's summary for /next-step. Title, NOC,
// match score, Job Bank wages, the Nova Scotia outlook with its employment
// trends as plain text, the user's skills against it, and a Job Bank link.
// Pure: no React, no storage, no fetch. Missing data comes back undefined;
// nothing here throws.
//
// job_outlook.json is 45 MB, so it is never imported here (it would land in
// the client bundle). Callers pass the outlook records they have; the page
// gets the Nova Scotia ones for its picks from src/app/next-step/actions.ts.
// Tests: src/lib/career-summary.test.ts (pnpm run test:career-summary).

import type { CareerMatch } from "@/types/careers";
import type { Scenario } from "@/types/outcomes";

import { toProjectable } from "./match-adapter";
import {
	buildScenarios,
	estimateWageAfterYears,
	findCareerById,
	findWage,
	formatScore,
	HOURS_PER_YEAR,
	projectOutcomes,
	toAnnualWage,
} from "./projection-logic";

// One record from Job Bank's outlook data (src/data/job_outlook.json).
export interface OutlookRecord {
	nocCode: string;
	outlook?: string;
	employmentTrends?: string;
	releaseDate?: string;
	province?: string;
	economicRegionCode?: string;
	lang?: string;
}

// Province-wide Nova Scotia, in English: the same records Team 4's
// career-data.ts reads for the outlook label on each match.
export const NS_PROVINCE = "NS";
export const NS_REGION_CODE = "1200";

export function isNovaScotiaOutlook(record: OutlookRecord): boolean {
	return (
		record.province === NS_PROVINCE &&
		record.economicRegionCode === NS_REGION_CODE &&
		record.lang === "EN"
	);
}

// "NOC_21232" -> "21232".
export function outlookCode(record: OutlookRecord): string {
	return String(record.nocCode ?? "").replace(/^NOC_/, "");
}

// NOC 2021 codes are five digits, leading zeroes kept ("00010").
export function isNocCode(code: unknown): code is string {
	return typeof code === "string" && /^\d{5}$/.test(code);
}

// Job Bank's job search, filtered to Nova Scotia. Job Bank's occupation
// report pages (/marketreport/...) take Job Bank's own job-title IDs, not
// NOC codes, so a NOC there opens the wrong job. searchstring=<NOC> resolves
// to the NOC group ("Software developers and programmers") and fprov=NS keeps
// it in Nova Scotia (checked 2026-11-26 for 00010, 10010, 21232 and 72400).
export function jobBankUrl(code: string): string | undefined {
	return isNocCode(code)
		? `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${code}&fprov=${NS_PROVINCE}`
		: undefined;
}

// ---------------------------------------------------------------------------
// Employment trends: Job Bank's HTML as plain paragraphs and lists, so the
// page renders text, never markup.
// ---------------------------------------------------------------------------

export interface TrendItem {
	text: string;
	// A nested list under this item, e.g. the sectors under "mainly work in".
	items: TrendItem[];
}

export type TrendBlock =
	| { kind: "paragraph"; text: string }
	| { kind: "list"; items: TrendItem[] };

const ENTITIES: Record<string, string> = {
	amp: "&",
	nbsp: " ",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name[0] === "#") {
			const point =
				name[1] === "x" || name[1] === "X"
					? parseInt(name.slice(2), 16)
					: parseInt(name.slice(1), 10);
			return Number.isFinite(point) && point > 0 && point <= 0x10ffff
				? String.fromCodePoint(point)
				: "";
		}
		return ENTITIES[name.toLowerCase()] ?? entity;
	});
}

function cleanText(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

type Frame = { kind: "list"; items: TrendItem[] } | { kind: "item"; item: TrendItem };

// Job Bank's trends use p, ul, li, br and h2 for structure; span, strong, em,
// u, sup and a are inline and keep only their text. Lists can sit inside a
// paragraph (invalid HTML Job Bank publishes), so a list always ends the
// paragraph before it. Unclosed tags are closed at the end.
export function parseTrends(html: string | undefined): TrendBlock[] {
	if (typeof html !== "string" || html.trim() === "") return [];

	const blocks: TrendBlock[] = [];
	const stack: Frame[] = [];
	let paragraph = "";

	const top = () => stack[stack.length - 1];
	const flushParagraph = () => {
		const text = cleanText(paragraph);
		if (text) blocks.push({ kind: "paragraph", text });
		paragraph = "";
	};
	const addText = (raw: string) => {
		const frame = top();
		if (!frame) paragraph += raw;
		else if (frame.kind === "item") frame.item.text += raw;
		// Text loose between <li>s has nowhere to go; Job Bank's is whitespace.
	};
	const closeList = () => {
		while (stack.length > 0) {
			const frame = stack.pop()!;
			if (frame.kind === "list") {
				if (stack.length === 0) blocks.push({ kind: "list", items: prune(frame.items) });
				return;
			}
		}
	};

	// Comments, scripts and styles go entirely, contents and all.
	const source = html
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");
	const tag = /<\s*(\/?)\s*([a-z][a-z0-9]*)[^>]*>/gi;
	let last = 0;
	for (let found = tag.exec(source); found; found = tag.exec(source)) {
		addText(decodeEntities(source.slice(last, found.index)));
		last = tag.lastIndex;
		const closing = found[1] === "/";
		const name = found[2].toLowerCase();

		if (name === "ul" || name === "ol") {
			if (closing) {
				closeList();
			} else {
				const frame = top();
				if (!frame) {
					flushParagraph();
					stack.push({ kind: "list", items: [] });
				} else if (frame.kind === "item") {
					stack.push({ kind: "list", items: frame.item.items });
				} else {
					// A list straight inside a list: hang it off the last item.
					const parent = frame.items[frame.items.length - 1];
					if (parent) {
						stack.push({ kind: "item", item: parent });
						stack.push({ kind: "list", items: parent.items });
					} else {
						stack.push({ kind: "list", items: frame.items });
					}
				}
			}
		} else if (name === "li") {
			if (closing) {
				if (top()?.kind === "item") stack.pop();
			} else {
				if (top()?.kind === "item") stack.pop(); // an unclosed <li>
				const frame = top();
				if (frame?.kind === "list") {
					const item: TrendItem = { text: "", items: [] };
					frame.items.push(item);
					stack.push({ kind: "item", item });
				}
			}
		} else if (name === "p" || name === "h2" || name === "br") {
			if (stack.length === 0) flushParagraph();
			else addText(" ");
		}
		// Inline tags: their text is kept, the tag is not.
	}
	addText(decodeEntities(source.slice(last)));

	while (stack.length > 0) closeList();
	flushParagraph();
	return blocks.filter((block) => block.kind === "paragraph" || block.items.length > 0);
}

// Trims every item's text and drops empty ones (no text and no sub-items).
function prune(items: TrendItem[]): TrendItem[] {
	return items
		.map((item) => ({ text: cleanText(item.text), items: prune(item.items) }))
		.filter((item) => item.text !== "" || item.items.length > 0);
}

// ---------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------

// The "After N years" tile on /next-step.
export const SUMMARY_YEARS = 5;

export interface WageFigure {
	hourly: number;
	yearly: number;
}

export interface CareerWages {
	// Job Bank's lowest 10%, median and top 10%. Undefined when unpublished.
	startingOut?: WageFigure;
	typical?: WageFigure;
	topEarners?: WageFigure;
	// estimateWageAfterYears at SUMMARY_YEARS: a rough guide, not pay by years.
	afterYears?: WageFigure;
	// True when Job Bank publishes the wage yearly, so `hourly` is the yearly
	// figure over HOURS_PER_YEAR rather than a published rate.
	isAnnual: boolean;
	referencePeriod?: string;
}

// The wage path's milestones: starting out, after 5 years (the median by
// estimateWageAfterYears' placeholder rule) and after 15 years (top earners).
export const WAGE_MILESTONES = [
	{ years: 0, label: "Starting out" },
	{ years: 5, label: "After 5 years" },
	{ years: 15, label: "After 15 years" },
] as const;

export interface WagePoint {
	label: string;
	// Yearly, at HOURS_PER_YEAR for hourly careers.
	annual: number;
}

// The wage growth chart's three points, or none when Job Bank doesn't
// publish the full range (so a lone median isn't drawn as "growth").
export function wageGrowth(careerCode: string): WagePoint[] {
	const wage = findWage(careerCode);
	const points: WagePoint[] = [];
	for (const { years, label } of WAGE_MILESTONES) {
		const estimate = estimateWageAfterYears(wage, years);
		if (!estimate?.rangePublished) return [];
		points.push({ label, annual: estimate.annual });
	}
	return points;
}

export interface CareerSummary {
	code: string;
	title?: string;
	// formatScore of the saved match, e.g. "79.2". Undefined when the career
	// isn't in the saved matches.
	score?: string;
	wages?: CareerWages;
	// Job Bank's label for Nova Scotia, e.g. "Good".
	outlook?: string;
	outlookReleaseDate?: string;
	trends?: TrendBlock[];
	// Skills the user has that this career uses, and ones it uses they don't.
	matchedSkills?: string[];
	skillsToDevelop?: string[];
	jobBankUrl?: string;
}

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

function toFigure(amount: number | null | undefined, isAnnual: boolean): WageFigure | undefined {
	if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;
	return {
		hourly: roundCents(isAnnual ? amount / HOURS_PER_YEAR : amount),
		yearly: toAnnualWage(amount, isAnnual),
	};
}

function careerWages(code: string): CareerWages | undefined {
	const wage = findWage(code);
	if (!wage) return undefined;
	const isAnnual = wage.isAnnual === true;
	const after = estimateWageAfterYears(wage, SUMMARY_YEARS);
	const wages: CareerWages = {
		startingOut: toFigure(wage.lowWage, isAnnual),
		typical: toFigure(wage.medianWage, isAnnual),
		topEarners: toFigure(wage.highWage, isAnnual),
		afterYears: after ? toFigure(after.amount, isAnnual) : undefined,
		isAnnual,
		referencePeriod: wage.referencePeriod || undefined,
	};
	return wages.typical || wages.startingOut || wages.topEarners ? wages : undefined;
}

function skillList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const skills = [
		...new Set(
			value
				.filter((skill): skill is string => typeof skill === "string")
				.map((skill) => skill.trim())
				.filter(Boolean),
		),
	];
	return skills;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// Everything /next-step shows for one career. `savedMatches` are Team 4's
// matches from /current-pathways; `outlooks` any Job Bank outlook records
// (only Nova Scotia's province-wide English one counts). Undefined when the
// code is blank or nothing at all is known about it.
export function getCareerSummary(
	code: string,
	savedMatches: readonly CareerMatch[] | undefined,
	outlooks: readonly OutlookRecord[] = [],
): CareerSummary | undefined {
	const noc = text(code);
	if (!noc) return undefined;

	const match = Array.isArray(savedMatches)
		? savedMatches.find((item) => item && typeof item === "object" && item.code === noc)
		: undefined;
	const record = Array.isArray(outlooks)
		? outlooks.find(
				(item) => item && typeof item === "object" && isNovaScotiaOutlook(item) && outlookCode(item) === noc,
			)
		: undefined;

	const title = text(match?.title) ?? text(findCareerById(noc)?.title);
	const wages = careerWages(noc);
	if (!match && !title && !wages && !record) return undefined;

	const trends = parseTrends(record?.employmentTrends);
	return {
		code: noc,
		title,
		score:
			typeof match?.matchPercentage === "number" && Number.isFinite(match.matchPercentage)
				? formatScore(match.matchPercentage)
				: undefined,
		wages,
		outlook: text(record?.outlook) ?? text(match?.outlook),
		outlookReleaseDate: text(record?.releaseDate) ?? text(match?.outlookReleaseDate),
		trends: trends.length > 0 ? trends : undefined,
		matchedSkills: skillList(match?.matchedSkills),
		skillsToDevelop: skillList(match?.missingSkills),
		jobBankUrl: jobBankUrl(noc),
	};
}

// ---------------------------------------------------------------------------
// The path chosen on /updated-pathways
// ---------------------------------------------------------------------------

export interface PathSummary {
	scenario: Scenario;
	// The plan as short steps, e.g. ["Learn A, B", "Finish High School",
	// "1 year of experience"].
	plan: string[];
	// formatScore of today's score and the projected one, e.g. "80.5", "86".
	scoreToday: string;
	scoreAfter: string;
	// Why it moved, from the projection.
	reason: string;
	// The rough wage after the plan's years of experience, when it has some.
	years?: number;
	afterYears?: WageFigure;
}

function yearsText(years: number): string {
	return `${years} ${years === 1 ? "year" : "years"} of experience`;
}

// The plan's steps, in the order "Do all three" applies them.
export function describePlan(scenario: Scenario): string[] {
	const learn = (skills: readonly string[]) =>
		skills.length > 0 ? [`Learn ${skills.join(", ")}`] : [];
	switch (scenario.kind) {
		case "gain-skill":
			return learn([scenario.skill]);
		case "gain-skills":
			return learn(scenario.skills);
		case "finish-education":
			return [`Finish ${scenario.step.trim() || "an education step"}`];
		case "add-experience":
			return [yearsText(scenario.years)];
		case "combined":
			return [
				...learn(scenario.skills),
				`Finish ${scenario.step.trim() || "an education step"}`,
				yearsText(scenario.years),
			];
	}
}

// One career under the chosen change, re-projected with the same functions
// Look Forward uses, so the scores match what the user saw. Undefined when
// the career isn't in the saved matches or anything is malformed.
export function getPathSummary(
	choice: { scenario: Scenario; careerCode: string } | undefined,
	savedMatches: readonly CareerMatch[] | undefined,
	userSkills: readonly string[] | undefined,
): PathSummary | undefined {
	if (!choice || !Array.isArray(savedMatches)) return undefined;
	const { scenario, careerCode } = choice;
	try {
		const matches = toProjectable(
			savedMatches.filter(
				(match) => match && typeof match === "object" && Number.isFinite(match.matchPercentage),
			),
		);
		const outcome = projectOutcomes(matches, scenario, {
			userSkills: Array.isArray(userSkills) ? userSkills : [],
		}).find((item) => item.careerId === careerCode);
		if (!outcome) return undefined;

		const years =
			scenario.kind === "add-experience" || scenario.kind === "combined"
				? scenario.years
				: undefined;
		const wage = findWage(careerCode);
		const after = years !== undefined ? estimateWageAfterYears(wage, years) : undefined;
		return {
			scenario,
			plan: describePlan(scenario),
			scoreToday: formatScore(outcome.currentScore),
			scoreAfter: formatScore(outcome.score),
			reason: outcome.reason,
			years,
			afterYears: after ? toFigure(after.amount, after.isAnnual) : undefined,
		};
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------
// "Your next moves": a ranked list of changes for the lead career
// ---------------------------------------------------------------------------

export type NextMoveKind = "plan" | "skill" | "education" | "experience" | "job-search";

export interface NextMove {
	kind: NextMoveKind;
	title: string;
	// One line on why this move helps this career.
	why: string;
	// Match score today and after, formatScore'd, and the rounded change.
	// Missing on the job-search card.
	scoreToday?: string;
	scoreAfter?: string;
	gain?: number;
	// Starting wage now and after the experience, for the experience card.
	wageNow?: number;
	wageAfter?: number;
	// The scenario behind a change (not the job-search card).
	scenario?: Scenario;
}

export const MAX_NEXT_MOVES = 4;

// Moves that raise the match, biggest gain first. Array.prototype.sort is
// stable, so equal gains keep their order.
export function rankByGain<T extends { gain?: number }>(moves: readonly T[]): T[] {
	return moves
		.filter((move) => (move.gain ?? 0) > 0)
		.sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0));
}

export interface NextMovesInput {
	careerCode: string;
	savedMatches: readonly CareerMatch[] | undefined;
	userSkills: readonly string[] | undefined;
	// The Look Forward choice, when it is for this career.
	plan?: Scenario;
	// The profile's degree, for the education step (as Look Forward uses).
	degree?: string;
	// For the job-search card.
	outlook?: string;
	jobBankUrl?: string;
}

// The moves for the lead career, best first:
// 1. The Look Forward plan, if any, with its real match change (even none).
// 2. Finishing the education step, one more year of experience, and the
//    skill this career lists that the user's other matches list most, each
//    re-scored with Look Forward's projection. Ranked by match gain; ties
//    keep that order. Anything the plan already covers, or that doesn't
//    raise the match, is left out.
// 3. A job-search card when there is a Job Bank link.
// At most MAX_NEXT_MOVES: the ranked changes are trimmed first, so the plan
// and the job search always stay. Empty when nothing applies.
export function rankNextMoves(input: NextMovesInput): NextMove[] {
	const { careerCode, plan } = input;
	const saved = (Array.isArray(input.savedMatches) ? input.savedMatches : []).filter(
		(match) => match && typeof match === "object" && Number.isFinite(match.matchPercentage),
	);
	if (!saved.some((match) => match.code === careerCode)) return [];
	const matches = toProjectable(saved);
	const userSkills = Array.isArray(input.userSkills) ? input.userSkills : [];

	const project = (scenario: Scenario) => {
		try {
			return projectOutcomes(matches, scenario, { userSkills }).find(
				(outcome) => outcome.careerId === careerCode,
			);
		} catch {
			return undefined;
		}
	};
	const scored = (scenario: Scenario) => {
		const outcome = project(scenario);
		return outcome
			? {
					scenario,
					scoreToday: formatScore(outcome.currentScore),
					scoreAfter: formatScore(outcome.score),
					gain: outcome.scoreShift,
				}
			: undefined;
	};

	const moves: NextMove[] = [];
	const planMove = plan ? scored(plan) : undefined;
	if (planMove) {
		moves.push({
			kind: "plan",
			title: "Your chosen plan",
			why: `The path you chose on Updated Pathways: ${describePlan(plan!).join(" · ")}.`,
			...planMove,
		});
	}

	const inPlan = new Set<NextMoveKind>();
	if (plan?.kind === "finish-education" || plan?.kind === "combined") inPlan.add("education");
	if (plan?.kind === "add-experience" || plan?.kind === "combined") inPlan.add("experience");
	const planned = new Set(planSkills(plan));

	// The same scenarios Look Forward builds: the profile's education step
	// and one more year of experience.
	const built = buildScenarios(matches, userSkills, [], input.degree);
	const education = built.find((scenario) => scenario.kind === "finish-education");
	const experience = built.find((scenario) => scenario.kind === "add-experience");
	const topGap = skillGapsFor(careerCode, saved, [...planned]).skills[0];

	const candidates: NextMove[] = [];
	if (education && !inPlan.has("education")) {
		const move = scored(education);
		if (move && education.kind === "finish-education") {
			candidates.push({
				kind: "education",
				title: `Finish ${education.step}`,
				why: `Finishing ${education.step} closes part of the gap for this career.`,
				...move,
			});
		}
	}
	if (experience && !inPlan.has("experience")) {
		const move = scored(experience);
		if (move) {
			const wage = findWage(careerCode);
			const now = toFigure(wage?.lowWage, wage?.isAnnual === true);
			const after = estimateWageAfterYears(wage, 1);
			candidates.push({
				kind: "experience",
				title: "Get 1 year of experience",
				why: "A year of work, co-op or volunteering in the field strengthens this match.",
				...move,
				wageNow: now?.yearly,
				wageAfter: after?.rangePublished ? after.annual : undefined,
			});
		}
	}
	if (topGap) {
		const move = scored({ kind: "gain-skill", skill: topGap.skill });
		if (move) {
			candidates.push({
				kind: "skill",
				title: `Learn ${topGap.skill}`,
				why:
					topGap.alsoNeededBy > 0
						? `This career lists it, and so do ${topGap.alsoNeededBy} of your other matches.`
						: "This career lists it, and you didn't select it.",
				...move,
			});
		}
	}
	const ranked = rankByGain(candidates);

	const job: NextMove | undefined = input.jobBankUrl
		? {
				kind: "job-search",
				title: "Search Nova Scotia job postings",
				why: input.outlook
					? `Job Bank rates the Nova Scotia outlook for this career as ${input.outlook}.`
					: "See who is hiring for this career in Nova Scotia now.",
			}
		: undefined;

	const room = MAX_NEXT_MOVES - moves.length - (job ? 1 : 0);
	moves.push(...ranked.slice(0, Math.max(0, room)));
	if (job) moves.push(job);
	return moves;
}

// ---------------------------------------------------------------------------
// "Save my plan": one plan document for print and for "Copy plan as text"
// ---------------------------------------------------------------------------

const dollars = (n: number) =>
	new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

// A move's impact in words, e.g. "Match 94 → 96, up 2", plus the starting
// wage climb on the experience card. Shared by the cards, print and copy.
export function moveImpact(move: NextMove): string[] {
	const lines: string[] = [];
	if (move.scoreToday !== undefined && move.scoreAfter !== undefined) {
		lines.push(
			move.gain
				? `Match ${move.scoreToday} → ${move.scoreAfter}, up ${formatScore(move.gain)}`
				: `Match ${move.scoreToday}, no change from this plan`,
		);
	}
	if (move.wageNow !== undefined && move.wageAfter !== undefined) {
		lines.push(`Starting wage ${dollars(move.wageNow)} → about ${dollars(move.wageAfter)} a year after 1 year`);
	}
	return lines;
}

export interface PlanSection {
	heading: string;
	items: string[];
}

export interface PlanDocument {
	title: string;
	sections: PlanSection[];
}

export interface PlanInput {
	name?: string;
	date: Date;
	summary: CareerSummary;
	path?: PathSummary;
	// Skills this career lists that the user didn't select, most common first.
	gaps: readonly string[];
	moves: readonly NextMove[];
	// Where "Try it on Updated Pathways" points, e.g. https://…/updated-pathways.
	updatedPathwaysUrl?: string;
}

// Everything "My career plan" says, as headed lists: who and when, the
// career, the plan, match, wages and growth, the Nova Scotia outlook, skills
// to build and the next moves with full links. Print and copy both use it.
export function buildPlanDocument(input: PlanInput): PlanDocument {
	const { summary, path } = input;
	const career = summary.title ?? `Career ${summary.code}`;
	const date = new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(input.date);
	const wages = summary.wages;
	const growth = wageGrowth(summary.code);
	const sections: PlanSection[] = [
		{ heading: "About this plan", items: [...(input.name?.trim() ? [`Name: ${input.name.trim()}`] : []), `Date: ${date}`] },
		{ heading: "Career", items: [`${career} (NOC ${summary.code})`, ...(summary.jobBankUrl ? [`Nova Scotia job postings: ${summary.jobBankUrl}`] : [])] },
		{ heading: "The plan", items: path ? path.plan : ["No plan chosen yet. Try changes on Updated Pathways."] },
		{
			heading: "Match",
			items: [
				path
					? path.scoreToday === path.scoreAfter
						? `${path.scoreToday} out of 100, no change from this plan`
						: `${path.scoreToday} → ${path.scoreAfter} out of 100 after this plan`
					: summary.score !== undefined
						? `${summary.score} out of 100`
						: "Not saved",
			],
		},
		{
			heading: "Wages (Job Bank)",
			items: wages
				? [
						...(wages.startingOut ? [`Starting out: ${dollars(wages.startingOut.yearly)} a year`] : []),
						...(wages.typical ? [`Typical (median): ${dollars(wages.typical.yearly)} a year`] : []),
						...(wages.topEarners ? [`Top earners: ${dollars(wages.topEarners.yearly)} a year`] : []),
						...(wages.referencePeriod ? [`Reference period: ${wages.referencePeriod}`] : []),
					]
				: ["Not published"],
		},
		...(growth.length > 0
			? [{ heading: "Wage growth (a rough guide)", items: growth.map((p) => `${p.label}: about ${dollars(p.annual)} a year`) }]
			: []),
		{
			heading: "Nova Scotia outlook",
			items: [summary.outlook ? `${summary.outlook}${summary.outlookReleaseDate ? ` (published ${summary.outlookReleaseDate})` : ""}` : "Not published"],
		},
		{ heading: "Skills to build", items: input.gaps.length > 0 ? [...input.gaps] : ["None listed beyond your plan."] },
		{
			heading: "Next moves",
			items: input.moves.map((move, i) => {
				const link = move.kind === "job-search" ? summary.jobBankUrl : input.updatedPathwaysUrl;
				return [`${i + 1}. ${move.title}`, ...moveImpact(move), ...(link ? [link] : [])].join(" · ");
			}),
		},
	];
	return { title: "My career plan", sections: sections.filter((s) => s.items.length > 0) };
}

// The same plan as plain text, for the clipboard.
export function planAsText(doc: PlanDocument): string {
	return [
		doc.title,
		"",
		...doc.sections.flatMap((s) => [s.heading, ...s.items.map((item) => `- ${item}`), ""]),
		"Estimates only: wages and match scores are a rough guide.",
	].join("\n");
}

export interface PickSplit {
	// Picks in the current saved matches, in pick order.
	current: string[];
	// Picks that aren't: left over from earlier skills or another session.
	stale: string[];
}

// The user's Top-3 picks against the matches Current Pathways last saved.
// /next-step only summarises current picks, so a pick made under different
// skills never stands in as the user's #1.
export function splitPicks(
	codes: readonly string[] | undefined,
	savedMatches: readonly CareerMatch[] | undefined,
): PickSplit {
	const saved = new Set(
		(Array.isArray(savedMatches) ? savedMatches : [])
			.filter((match) => match && typeof match === "object")
			.map((match) => match.code),
	);
	const picks = [...new Set((Array.isArray(codes) ? codes : []).filter(isNocCode))];
	return {
		current: picks.filter((code) => saved.has(code)),
		stale: picks.filter((code) => !saved.has(code)),
	};
}

export interface SkillToDevelop {
	skill: string;
	// How many of the user's saved matches list it as missing.
	missingFrom: number;
}

// A career's skills to develop, most common gap across the user's matches
// first (counts from missingSkillCounts in match-adapter.ts), then
// alphabetically.
export function rankSkillsToDevelop(
	skills: readonly string[] | undefined,
	counts: ReadonlyMap<string, number> | undefined,
): SkillToDevelop[] {
	return (skillList(skills) ?? [])
		.map((skill) => ({ skill, missingFrom: counts?.get(skill) ?? 0 }))
		.sort((a, b) => b.missingFrom - a.missingFrom || a.skill.localeCompare(b.skill));
}

// The skills a plan learns (none for education or experience alone).
export function planSkills(scenario: Scenario | undefined): string[] {
	if (!scenario) return [];
	switch (scenario.kind) {
		case "gain-skill":
			return [scenario.skill];
		case "gain-skills":
		case "combined":
			return Array.isArray(scenario.skills) ? [...scenario.skills] : [];
		default:
			return [];
	}
}

// The recommended skill a plan learns, when the user picked none of their
// own: Look Forward's "Try the recommended skill" (gain-skill), or "Do all
// three" built around it. Undefined for the user's own picks.
export function recommendedSkill(scenario: Scenario | undefined): string | undefined {
	if (scenario?.kind === "gain-skill") return scenario.skill.trim() || undefined;
	if (scenario?.kind === "combined" && scenario.recommended && Array.isArray(scenario.skills)) {
		return scenario.skills[0]?.trim() || undefined;
	}
	return undefined;
}

export interface SkillGap {
	skill: string;
	// How many of the user's other saved matches also list it as missing.
	alsoNeededBy: number;
}

export interface SkillGaps {
	skills: SkillGap[];
	// False when every skill has the same count, so showing it says nothing.
	countsVary: boolean;
	// How many other matches the counts are out of.
	otherMatches: number;
}

// The lead career's skills to develop: its own missing skills (from its
// saved match), minus any the plan already learns, the ones the user's other
// matches also need first, then A to Z.
export function skillGapsFor(
	code: string,
	savedMatches: readonly CareerMatch[] | undefined,
	plan: readonly string[] = [],
): SkillGaps {
	const matches = (Array.isArray(savedMatches) ? savedMatches : []).filter(
		(match) => match && typeof match === "object",
	);
	const lead = matches.find((match) => match.code === code);
	const others = matches.filter((match) => match.code !== code);
	const counts = new Map<string, number>();
	for (const match of others) {
		for (const skill of new Set(skillList(match.missingSkills) ?? [])) {
			counts.set(skill, (counts.get(skill) ?? 0) + 1);
		}
	}
	const learning = new Set(plan);
	const skills = rankSkillsToDevelop(
		(skillList(lead?.missingSkills) ?? []).filter((skill) => !learning.has(skill)),
		counts,
	).map(({ skill, missingFrom }) => ({ skill, alsoNeededBy: missingFrom }));
	return {
		skills,
		countsVary: new Set(skills.map((gap) => gap.alsoNeededBy)).size > 1,
		otherMatches: others.length,
	};
}

export interface SkillInCareer {
	skill: string;
	// True when the career lists the skill (matched or to develop).
	used: boolean;
}

// The user's "skills you're working on" against one career, at most `limit`.
export function markSkillsForCareer(
	skills: readonly string[] | undefined,
	summary: CareerSummary | undefined,
	limit = 3,
): SkillInCareer[] {
	const career = new Set([...(summary?.matchedSkills ?? []), ...(summary?.skillsToDevelop ?? [])]);
	return (skillList(skills) ?? [])
		.slice(0, Math.max(0, limit))
		.map((skill) => ({ skill, used: career.has(skill) }));
}
