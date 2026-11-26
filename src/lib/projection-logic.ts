// Team 5 logic for calculating outcome shifts
//
// Status (2026-11-12, for the halfway team switch):
// Done
//   - Wage projection: findCareerById, createWageProjection, createOutcomeShift.
//   - Look Forward: projectOutcomes(current, scenario, options) for three
//     scenarios (gain a skill, finish an education step, add experience),
//     each with a score shift and a one-line reason. Plus ranking, wording
//     helpers, default scenarios, and toCareerMatches for Team 6.
//   - Tests: src/lib/projection-logic.test.ts (pnpm run test:projection).
// Left
//   - Import Team 4's DEFAULT_ALPHA once it is exported; MATCH_ALPHA mirrors
//     it until then. Skill projections read the weight each match was scored
//     with, so MATCH_ALPHA is only a fallback.
//   - Agree a real rule for education and experience. EDUCATION_GAP_SHARE and
//     EXPERIENCE_GAP_SHARE_PER_YEAR are placeholders, not research figures.
//   - Let the user choose which skill to gain (today it suggests the skill
//     missing from the most matches).
// Hand-off notes: src/components/look-forward/README.md

import careersData from "../data/careers.json";
import wagesData from "../data/wages.json";
import type {
	Career,
	CareerMatch,
	OutcomeShift,
	ProjectedOutcome,
	Scenario,
	WageProjection,
} from "@/types/outcomes";

const careers = careersData as Career[];

// Job Bank's wages per NOC code (src/data/wages.json). Hourly unless
// isAnnual; low or high can be missing.
interface JobBankWage {
	code: string;
	medianWage: number | null;
	lowWage: number | null;
	highWage: number | null;
	isAnnual: boolean;
	referencePeriod?: string;
}

const wages = wagesData as JobBankWage[];

export function findWage(careerId: string): JobBankWage | undefined {
	return wages.find((wage) => wage.code === careerId);
}

// Placeholder full-time year (37.5 hours x 52 weeks) for turning an hourly
// wage into a yearly one. careers.json's medianWage uses the same rule.
export const HOURS_PER_YEAR = 1950;

export function toAnnualWage(amount: number, isAnnual: boolean): number {
	return Math.round(isAnnual ? amount : amount * HOURS_PER_YEAR);
}

// A career's median wage a year, from Job Bank. Undefined when unpublished.
export function medianAnnualWage(careerId: string): number | undefined {
	const wage = findWage(careerId);
	return wage?.medianWage != null ? toAnnualWage(wage.medianWage, wage.isAnnual) : undefined;
}

// Placeholder milestones, not research figures: Job Bank publishes low,
// median and high wages, not pay by years worked. The wage path assumes the
// low wage at the start, the median after WAGE_YEARS_TO_MEDIAN years and the
// high wage after WAGE_YEARS_TO_HIGH, in straight lines between, capped at
// the high wage, until the class agrees on a rule.
export const WAGE_YEARS_TO_MEDIAN = 5;
export const WAGE_YEARS_TO_HIGH = 15;

export type WageRange = Pick<JobBankWage, "medianWage" | "lowWage" | "highWage" | "isAnnual">;

export interface WageEstimate {
	// In the wage's own unit: per hour unless isAnnual.
	amount: number;
	// A year, at HOURS_PER_YEAR for hourly careers.
	annual: number;
	isAnnual: boolean;
	// False when low or high isn't published, so only the median is given.
	rangePublished: boolean;
}

// A rough wage after `years` in the career, along the placeholder path
// above. Undefined when the median isn't published.
export function estimateWageAfterYears(
	wage: WageRange | undefined,
	years: number,
): WageEstimate | undefined {
	if (wage?.medianWage == null) return undefined;
	const { medianWage: median, lowWage: low, highWage: high, isAnnual } = wage;
	const estimate = (amount: number, rangePublished: boolean): WageEstimate => ({
		amount,
		annual: toAnnualWage(amount, isAnnual),
		isAnnual,
		rangePublished,
	});
	if (low == null || high == null) return estimate(median, false);

	const counted = Math.max(0, Number.isFinite(years) ? years : 0);
	if (counted <= WAGE_YEARS_TO_MEDIAN) {
		return estimate(low + ((median - low) * counted) / WAGE_YEARS_TO_MEDIAN, true);
	}
	const share = (counted - WAGE_YEARS_TO_MEDIAN) / (WAGE_YEARS_TO_HIGH - WAGE_YEARS_TO_MEDIAN);
	return estimate(Math.min(high, median + (high - median) * share), true);
}

// How much more (or less) a year one career's median pays than another's.
export function medianWageChange(fromId: string, toId: string): number | undefined {
	const from = medianAnnualWage(fromId);
	const to = medianAnnualWage(toId);
	return from !== undefined && to !== undefined ? to - from : undefined;
}

export function findCareerById(careerId: string): Career | undefined {
	return careers.find((career) => career.id === careerId);
}

export function createWageProjection(
	careerId: string,
	currentWage?: number,
): WageProjection | undefined {
	const career = findCareerById(careerId);

	if (career?.medianWage === undefined) {
		return undefined;
	}

	const validCurrentWage =
		typeof currentWage === "number" &&
		Number.isFinite(currentWage) &&
		currentWage >= 0
			? currentWage
			: undefined;

	return {
		currentWage: validCurrentWage,
		projectedWage: career.medianWage,
		delta:
			validCurrentWage !== undefined
				? career.medianWage - validCurrentWage
				: undefined,
		periodLabel: "per year",
	};
}


export function createOutcomeShift(
	careerId: string,
	currentScore: number,
	projectedScore: number,
): OutcomeShift {
	return {
		careerId,
		currentScore,
		projectedScore,
		// One decimal place, like Team 4's scores: 85 - 65.4 is 19.6, not
		// 19.599999999999994.
		delta: roundScore(projectedScore - currentScore),
	};
}

// ---------------------------------------------------------------------------
// Look Forward scenarios: re-score matches under a "what if" change.
// Everything below is pure: no fetch, no React, no browser storage.
// ---------------------------------------------------------------------------

// Team 4's matcher (feature/matching-logic, not on main yet) attaches these
// lists to each match. They are optional so a plain CareerMatch still works;
// without them a skill scenario can't be re-scored and reports why.
export interface MatchSkillBreakdown {
	matchedSkills?: string[];
	missingSkills?: string[];
}

export type ProjectableMatch = CareerMatch & MatchSkillBreakdown;

export interface ProjectionOptions {
	// Every skill the user has today. Required by "gain-skill".
	userSkills?: readonly string[];
	// Team 4's weight between job coverage and user coverage, 0 to 1. Leave it
	// out to use the weight each match was scored with.
	alpha?: number;
}

// Mirrors DEFAULT_ALPHA in Team 4's src/components/careerResults.tsx (0.3
// since 1f7ea7b, "Flip default weights to 30/70"). Only a fallback: the user
// can move Team 4's weights slider, so projectSkill reads each match's own
// weight from its score where it can.
export const MATCH_ALPHA = 0.3;

// Mirrors MIN_CAREER_SKILLS in Team 4's src/lib/career-data.ts (line 36): a
// career that lists fewer skills is scored as if it listed this many, so
// 1-skill careers don't always rank #1. Team 4 doesn't export it yet.
export const MIN_CAREER_SKILLS = 5;

// Placeholder weights, not research figures: the share of the remaining gap
// to a full match that an education step, or one year of experience, closes.
// Team 4's score has no education or experience input yet, so these stand in
// until the class agrees on a rule.
export const EDUCATION_GAP_SHARE = 0.25;
export const EXPERIENCE_GAP_SHARE_PER_YEAR = 0.1;
export const MAX_EXPERIENCE_YEARS = 5;

export const TOP_MATCH_COUNT = 3;

const FULL_MATCH = 100;

// One decimal place, like Team 4's scores. Normalises -0 to 0.
function roundScore(value: number): number {
	const rounded = Math.round(value * 10) / 10;
	return rounded === 0 ? 0 : rounded;
}

// A score for display, one decimal place like the projections: 79.2, not
// 79.23076923076923. Display only; stored scores keep full precision.
export function formatScore(score: number): string {
	return String(roundScore(score));
}

function cleanAlpha(alpha: number | undefined): number {
	if (alpha === undefined || !Number.isFinite(alpha)) return MATCH_ALPHA;
	return Math.max(0, Math.min(1, alpha));
}

// C in Team 4's formula: the share of the career's skills the user has, out
// of at least MIN_CAREER_SKILLS.
function careerCoverage(matchedCount: number, careerSkillCount: number): number {
	return (matchedCount / Math.max(careerSkillCount, MIN_CAREER_SKILLS)) * 100;
}

// Team 4's formula: S = alpha x C + (1 - alpha) x U, where C is the share of
// the career's skills the user has (see careerCoverage) and U the share of the
// user's skills the career uses.
function skillMatchScore(
	matchedCount: number,
	careerSkillCount: number,
	userSkillCount: number,
	alpha: number,
): number {
	const career = careerCoverage(matchedCount, careerSkillCount);
	const userCoverage = (matchedCount / userSkillCount) * 100;
	return alpha * career + (1 - alpha) * userCoverage;
}

// Solves S = alpha x C + (1 - alpha) x U for alpha, giving the weight a saved
// match was actually scored with. Undefined when it can't be told apart: C
// and U equal (any alpha gives the same score), or a result that isn't a real
// weight, which means the score didn't come from Team 4's formula.
function scoredAlpha(
	score: number,
	matchedCount: number,
	careerSkillCount: number,
	userSkillCount: number,
): number | undefined {
	const career = careerCoverage(matchedCount, careerSkillCount);
	const userCoverage = (matchedCount / userSkillCount) * 100;
	if (Math.abs(userCoverage - career) <= 0.001) return undefined;

	const alpha = (userCoverage - score) / (userCoverage - career);
	if (!Number.isFinite(alpha) || alpha < -0.01 || alpha > 1.01) return undefined;
	return Math.max(0, Math.min(1, alpha));
}

export interface Projection {
	score: number;
	reason: string;
}

function unchanged(match: CareerMatch, reason: string): Projection {
	return { score: match.score, reason };
}

function projectSkill(
	match: ProjectableMatch,
	rawSkill: string,
	options: ProjectionOptions,
): Projection {
	const skill = rawSkill.trim();
	if (!skill) {
		return unchanged(match, "Pick a skill to see how it changes this match.");
	}

	const userSkills = new Set(options.userSkills ?? []);
	if (userSkills.size === 0) {
		return unchanged(match, "We need your current skills to project a new one.");
	}
	if (userSkills.has(skill)) {
		return unchanged(match, `You already have ${skill}, so this match stays the same.`);
	}

	const { matchedSkills, missingSkills } = match;
	const careerSkillCount = new Set([...(matchedSkills ?? []), ...(missingSkills ?? [])]).size;
	if (!matchedSkills || !missingSkills || careerSkillCount === 0) {
		return unchanged(match, "We need this career's skill list to project a new skill.");
	}
	// The match already counted this skill, even though userSkills omits it.
	if (matchedSkills.includes(skill)) {
		return unchanged(match, `${skill} already counts toward this match.`);
	}
	// Team 4's formula would lower the score here (the career covers a smaller
	// share of a bigger skill set), but learning a skill doesn't make anyone
	// worse at a career, so an unused skill leaves the match as it is.
	if (!missingSkills.includes(skill)) {
		return unchanged(match, `This career doesn't use ${skill}, so this match doesn't change.`);
	}

	return {
		score: withAddedSkills(match, careerSkillCount, userSkills.size, 1, options),
		reason: `${skill} is one of the ${careerSkillCount} skills this career uses.`,
	};
}

// The user's own picks, projected together. Only the picks a career uses
// count: C = (matched + used) / max(career skills, 5) and
// U = (matched + used) / (user skills + used). A career that uses none of
// them is left unchanged, for the same reason as in projectSkill.
function projectSkills(
	match: ProjectableMatch,
	rawSkills: readonly string[],
	options: ProjectionOptions,
): Projection {
	const skills = [...new Set(rawSkills.map((skill) => skill.trim()).filter(Boolean))];
	if (skills.length === 0) {
		return unchanged(match, "Pick a skill to see how it changes this match.");
	}

	const userSkills = new Set(options.userSkills ?? []);
	if (userSkills.size === 0) {
		return unchanged(match, "We need your current skills to project new ones.");
	}

	const { matchedSkills, missingSkills } = match;
	const careerSkillCount = new Set([...(matchedSkills ?? []), ...(missingSkills ?? [])]).size;
	if (!matchedSkills || !missingSkills || careerSkillCount === 0) {
		return unchanged(match, "We need this career's skill list to project new skills.");
	}

	const used = skillsUsed(match, skills, options.userSkills);
	if (used.length === 0) {
		return unchanged(
			match,
			skills.length === 1
				? `This career doesn't use ${skills[0]}, so this match doesn't change.`
				: "This career doesn't use these skills, so this match doesn't change.",
		);
	}

	return {
		score: withAddedSkills(match, careerSkillCount, userSkills.size, used.length, options),
		reason:
			skills.length === 1
				? `${used[0]} is one of the ${careerSkillCount} skills this career uses.`
				: `Uses ${used.length} of your ${skills.length} new skills: ${used.join(", ")}.`,
	};
}

// The new skills a career would count: ones it lists as missing that the
// user doesn't already have.
export function skillsUsed(
	match: ProjectableMatch,
	skills: readonly string[],
	userSkills: readonly string[] = [],
): string[] {
	const owned = new Set(userSkills);
	return skills.filter(
		(skill) =>
			!owned.has(skill) &&
			!(match.matchedSkills ?? []).includes(skill) &&
			(match.missingSkills ?? []).includes(skill),
	);
}

// Team 4's score for a match with `added` more of its skills.
function withAddedSkills(
	match: ProjectableMatch,
	careerSkillCount: number,
	userSkillCount: number,
	added: number,
	options: ProjectionOptions,
): number {
	const matchedCount = new Set(match.matchedSkills).size;
	// An explicit weight wins; otherwise use the one this match was scored
	// with, so the projection starts from the same formula as today's score.
	const alpha =
		options.alpha !== undefined
			? cleanAlpha(options.alpha)
			: (scoredAlpha(match.score, matchedCount, careerSkillCount, userSkillCount) ??
				MATCH_ALPHA);
	return skillMatchScore(
		matchedCount + added,
		careerSkillCount,
		userSkillCount + added,
		alpha,
	);
}

function closeGap(score: number, share: number): number {
	return score + Math.max(0, FULL_MATCH - score) * share;
}

function projectEducation(match: CareerMatch, rawStep: string): Projection {
	if (match.score >= FULL_MATCH) {
		return unchanged(match, "This is already a full match.");
	}
	const step = rawStep.trim() || "this education step";
	return {
		score: closeGap(match.score, EDUCATION_GAP_SHARE),
		reason: `Finishing ${step} closes part of the gap for this career.`,
	};
}

function projectExperience(match: CareerMatch, years: number): Projection {
	if (!Number.isFinite(years) || years <= 0) {
		return unchanged(match, "Add some experience to see how it changes this match.");
	}
	if (match.score >= FULL_MATCH) {
		return unchanged(match, "This is already a full match.");
	}
	const counted = Math.min(years, MAX_EXPERIENCE_YEARS);
	return {
		score: closeGap(match.score, counted * EXPERIENCE_GAP_SHARE_PER_YEAR),
		reason: `${years} more ${yearUnit(years)} of experience strengthens this match.`,
	};
}

// "A", "A and B", "A, B and C".
function joinWords(words: readonly string[]): string {
	return words.length <= 2
		? words.join(" and ")
		: `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

// "Do all three": the skills (scored as in projectSkills), then the
// education step and the experience, each closing part of the gap left by
// the step before. Never lower than any one of the three alone, and capped
// at a full match by projectMatch.
export function projectCombined(
	match: ProjectableMatch,
	scenario: Extract<Scenario, { kind: "combined" }>,
	options: ProjectionOptions = {},
): Projection {
	const afterSkills =
		scenario.skills.length > 0 ? projectSkills(match, scenario.skills, options).score : match.score;
	const afterEducation = closeGap(afterSkills, EDUCATION_GAP_SHARE);
	const years = Number.isFinite(scenario.years) ? Math.max(0, scenario.years) : 0;
	const score = closeGap(
		afterEducation,
		Math.min(years, MAX_EXPERIENCE_YEARS) * EXPERIENCE_GAP_SHARE_PER_YEAR,
	);

	const used = skillsUsed(match, scenario.skills, options.userSkills);
	const experience = `${years} ${years === 1 ? "year's" : "years'"} experience`;
	const reason =
		used.length > 0
			? scenario.recommended
				? `Uses the recommended skill: ${used.join(", ")}, plus education and ${experience}.`
				: `Uses ${used.length} of your new skills, plus education and ${experience}.`
			: scenario.skills.length > 0
				? `Education and ${experience}; it doesn't use ${scenario.skills.length === 1 ? "this skill" : "these skills"}.`
				: `Education and ${experience}.`;
	return { score: Math.min(FULL_MATCH, score), reason };
}

function yearUnit(years: number): string {
	return years === 1 ? "year" : "years";
}

function projectMatch(
	match: ProjectableMatch,
	scenario: Scenario,
	options: ProjectionOptions,
): ProjectedOutcome {
	let projection: Projection;
	switch (scenario.kind) {
		case "gain-skill":
			projection = projectSkill(match, scenario.skill, options);
			break;
		case "gain-skills":
			projection = projectSkills(match, scenario.skills, options);
			break;
		case "finish-education":
			projection = projectEducation(match, scenario.step);
			break;
		case "add-experience":
			projection = projectExperience(match, scenario.years);
			break;
		case "combined":
			projection = projectCombined(match, scenario, options);
			break;
	}

	const exactScore = Math.min(FULL_MATCH, projection.score);
	const score = roundScore(exactScore);
	return {
		careerId: match.careerId,
		score,
		exactScore,
		rationale: match.rationale,
		currentScore: match.score,
		scenario,
		scoreShift: roundScore(score - match.score),
		reason: projection.reason,
	};
}

// Projections rank by their unrounded score; plain matches by their score.
function rankingScore(match: CareerMatch): number {
	return (match as Partial<ProjectedOutcome>).exactScore ?? match.score;
}

function byScoreThenId(a: CareerMatch, b: CareerMatch): number {
	return rankingScore(b) - rankingScore(a) || a.careerId.localeCompare(b.careerId);
}

// Best first; ties break on careerId so the order is stable.
export function rankMatches<T extends CareerMatch>(matches: readonly T[]): T[] {
	return matches.filter((match) => Number.isFinite(match.score)).sort(byScoreThenId);
}

// Re-score every current match under one scenario, best projected score first.
// Matches with a non-finite score are dropped. An empty list returns [].
export function projectOutcomes(
	current: readonly ProjectableMatch[],
	scenario: Scenario,
	options: ProjectionOptions = {},
): ProjectedOutcome[] {
	return rankMatches(current.map((match) => projectMatch(match, scenario, options)));
}

export interface RankedProjection extends ProjectedOutcome {
	rank: number;
	// Rank before the scenario (1-based), or undefined if it wasn't a match.
	previousRank?: number;
}

export interface RankLabel {
	// The best rank in its group of equal displayed scores.
	rank: number;
	// True when another career shows the same score.
	tied: boolean;
}

// Ranks by the score people see: careers whose scores show the same to one
// decimal share the group's best rank and are marked tied, so none is
// presented as ahead of the others. `ranked` must be best first.
export function labelRanks(ranked: readonly CareerMatch[]): RankLabel[] {
	const shown = ranked.map((match) => roundScore(match.score));
	return shown.map((score) => {
		const first = shown.indexOf(score);
		return { rank: first + 1, tied: shown.lastIndexOf(score) !== first };
	});
}

export interface PathEntry extends RankedProjection {
	tied: boolean;
}

// The projected top N with tie-aware ranks (every career sharing rank N
// included, so a tie is never cut in half), plus today's #1 at its new rank
// when it has dropped below that, so the user can see where it went.
export function projectedPaths(
	current: readonly CareerMatch[],
	projected: readonly ProjectedOutcome[],
	limit: number = TOP_MATCH_COUNT,
): PathEntry[] {
	const ranked = rankProjections(current, projected, Number.POSITIVE_INFINITY);
	const labels = labelRanks(ranked);
	const entries = ranked.map((outcome, index) => ({ ...outcome, ...labels[index] }));
	const todayTop = rankMatches(current)[0]?.careerId;
	const top = entries.filter((entry) => entry.rank <= limit);
	const leader = entries.find((entry) => entry.careerId === todayTop);
	return leader && !top.includes(leader) ? [...top, leader] : top;
}

// The projected top N, each with its rank before and after the scenario.
export function rankProjections(
	current: readonly CareerMatch[],
	projected: readonly ProjectedOutcome[],
	limit: number = TOP_MATCH_COUNT,
): RankedProjection[] {
	// Before the change, ties share a rank too (see labelRanks).
	const today = rankMatches(current);
	const todayLabels = labelRanks(today);
	const previousRanks = new Map(
		today.map((match, index) => [match.careerId, todayLabels[index].rank]),
	);
	return rankMatches(projected)
		.slice(0, limit)
		.map((outcome, index) => ({
			...outcome,
			rank: index + 1,
			previousRank: previousRanks.get(outcome.careerId),
		}));
}

export type ShiftDirection = "up" | "down" | "none";

// The shift in words, so it never relies on colour alone.
export function describeShift(scoreShift: number): {
	direction: ShiftDirection;
	text: string;
} {
	const shift = roundScore(scoreShift);
	if (shift === 0) return { direction: "none", text: "No change" };
	const size = Math.abs(shift);
	const unit = size === 1 ? "point" : "points";
	return shift > 0
		? { direction: "up", text: `Up ${size} ${unit}` }
		: { direction: "down", text: `Down ${size} ${unit}` };
}

export function describeRankChange(
	rank: number,
	previousRank: number | undefined,
	limit: number = TOP_MATCH_COUNT,
): string {
	if (previousRank === undefined || previousRank > limit) {
		return previousRank === undefined
			? `New to your top ${limit}`
			: `New to your top ${limit}, up from #${previousRank}`;
	}
	if (previousRank > rank) return `Moved up from #${previousRank}`;
	if (previousRank < rank) return `Moved down from #${previousRank}`;
	return `Still #${rank}`;
}

export function describeScenario(scenario: Scenario): string {
	switch (scenario.kind) {
		case "gain-skill":
			return `Learn ${scenario.skill.trim() || "a new skill"}`;
		case "gain-skills":
			return `Learn ${joinWords(scenario.skills) || "new skills"}`;
		case "finish-education":
			return `Finish ${scenario.step.trim() || "an education step"}`;
		case "add-experience":
			return `Add ${scenario.years} ${yearUnit(scenario.years)} of experience`;
		case "combined":
			return [
				scenario.skills.length > 0 ? `Learn ${scenario.skills.join(", ")}` : undefined,
				`Finish ${scenario.step.trim() || "an education step"}`,
				`${scenario.years} ${yearUnit(scenario.years)} of experience`,
			]
				.filter(Boolean)
				.join(" · ");
	}
}

// The skill missing from the most matches that the user doesn't already
// have. Ties go alphabetically. Undefined when matches carry no skill lists.
export function suggestSkillToGain(
	matches: readonly ProjectableMatch[],
	userSkills: readonly string[],
): string | undefined {
	const owned = new Set(userSkills);
	const counts = new Map<string, number>();
	for (const match of matches) {
		for (const skill of new Set(match.missingSkills ?? [])) {
			if (!owned.has(skill)) counts.set(skill, (counts.get(skill) ?? 0) + 1);
		}
	}
	return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const DEFAULT_EDUCATION_STEP = "a diploma or certificate";

// The three scenarios Look Forward offers by default. "Gain a skill" is left
// out when it can't be projected: no current skills, or no skill lists.
export function buildDefaultScenarios(
	matches: readonly ProjectableMatch[],
	userSkills: readonly string[],
): Scenario[] {
	const skill = userSkills.length > 0 ? suggestSkillToGain(matches, userSkills) : undefined;
	return [
		...(skill ? [{ kind: "gain-skill", skill } as const] : []),
		{ kind: "finish-education", step: DEFAULT_EDUCATION_STEP },
		{ kind: "add-experience", years: 1 },
	];
}

// How many skills the user can pick to learn at once.
export const MAX_SKILL_PICKS = 3;

// The scenarios on /updated-pathways: learn the user's picks together (up to
// MAX_SKILL_PICKS), or the suggested skill before any pick; finish the
// education step named by the profile's degree (the same label with or
// without picks); one more year of experience (the page lets the user choose
// more); and all three together. Experience starts at +1 year, because
// deriving it from the user's current experience would be fake
// personalization.
export function buildScenarios(
	matches: readonly ProjectableMatch[],
	userSkills: readonly string[],
	picks: readonly string[] = [],
	degree?: string,
): Scenario[] {
	const skills = [...new Set(picks.map((skill) => skill.trim()).filter(Boolean))].slice(
		0,
		MAX_SKILL_PICKS,
	);
	const suggested = userSkills.length > 0 ? suggestSkillToGain(matches, userSkills) : undefined;
	const learn: Scenario[] =
		skills.length > 0
			? [{ kind: "gain-skills", skills }]
			: suggested
				? [{ kind: "gain-skill", skill: suggested }]
				: [];

	const step = degree?.trim() || DEFAULT_EDUCATION_STEP;
	const learnSkills = skills.length > 0 ? skills : suggested ? [suggested] : [];

	return [
		...learn,
		{ kind: "finish-education", step },
		{ kind: "add-experience", years: 1 },
		{
			kind: "combined",
			skills: learnSkills,
			step,
			years: 1,
			recommended: skills.length === 0 && learnSkills.length > 0,
		},
	];
}

export interface SkillToLearn {
	skill: string;
	// How many of the matches list the skill as missing.
	missingFrom: number;
	recommended: boolean;
}

// Every skill the user doesn't have yet, recommended first (the one
// suggestSkillToGain picks), then by how many matches are missing it, then
// alphabetically.
export function rankSkillsToLearn(
	matches: readonly ProjectableMatch[],
	userSkills: readonly string[],
	allSkills: readonly string[],
): SkillToLearn[] {
	const owned = new Set(userSkills);
	const suggested = suggestSkillToGain(matches, userSkills);
	const counts = new Map<string, number>();
	for (const match of matches) {
		for (const skill of new Set(match.missingSkills ?? [])) {
			counts.set(skill, (counts.get(skill) ?? 0) + 1);
		}
	}

	return [...new Set(allSkills)]
		.filter((skill) => !owned.has(skill))
		.map((skill) => ({
			skill,
			missingFrom: counts.get(skill) ?? 0,
			recommended: skill === suggested,
		}))
		.sort(
			(a, b) =>
				Number(b.recommended) - Number(a.recommended) ||
				b.missingFrom - a.missingFrom ||
				a.skill.localeCompare(b.skill),
		);
}

export interface WageCareer {
	careerId: string;
	// The career its wage is compared with, and which #1 that is.
	comparedWith?: string;
	comparedAs?: "today" | "new";
}

// The career the wage card shows, and what to compare it with.
// - Shows `selectedId` while it's in the list on screen, otherwise the #1
//   (projected with a change selected, today's without).
// - The projected #1, when it isn't today's #1: compared with today's #1.
// - Any other career, with a change selected: compared with the projected #1.
// - No change selected, or the #1 itself with nothing above it moved: no
//   comparison.
// - Careers tied at #1: compared with today's #1 (see labelRanks).
// Undefined when there are no matches.
export function pickWageCareer(
	currentTop: readonly CareerMatch[],
	projectedTop?: readonly CareerMatch[],
	selectedId?: string | null,
): WageCareer | undefined {
	const today = currentTop[0];
	if (!today) return undefined;
	const changed = projectedTop !== undefined && projectedTop.length > 0;
	const shown = changed ? projectedTop : currentTop;
	const careerId =
		selectedId && shown.some((match) => match.careerId === selectedId)
			? selectedId
			: shown[0].careerId;
	if (!changed) return { careerId };

	const newTop = projectedTop[0].careerId;
	// Careers tied at #1 share it, so none is "your new #1": compare with
	// today's #1 instead.
	if (labelRanks(projectedTop.slice(0, 2))[0].tied) {
		return careerId === today.careerId
			? { careerId }
			: { careerId, comparedWith: today.careerId, comparedAs: "today" };
	}
	if (careerId === newTop) {
		return newTop === today.careerId
			? { careerId }
			: { careerId, comparedWith: today.careerId, comparedAs: "today" };
	}
	return { careerId, comparedWith: newTop, comparedAs: "new" };
}

export interface SummaryWage {
	// The career both lines of the tile describe: the one the wage card shows.
	careerId?: string;
	// True when careers are tied at the projected #1.
	tied: boolean;
	// Its yearly median against today's #1.
	change?: number;
	// Its rough wage after `years`, when experience applies.
	afterYears?: WageEstimate;
}

// The summary's wage tile. It always describes the career the wage card is
// showing (pickWageCareer's careerId): the row picked automatically on the
// first change, or the row the user selected, in every change including
// Add experience. Falls back to the projected #1 when that career isn't
// listed. The headline and the "after N years" line come from this one
// career.
export function summaryWage(
	todayId: string,
	projectedTop: readonly CareerMatch[],
	shownId?: string | null,
	years?: number,
): SummaryWage | undefined {
	if (projectedTop.length === 0) return undefined;
	const tied = labelRanks(projectedTop.slice(0, 2))[0].tied;
	const careerId =
		shownId && projectedTop.some((match) => match.careerId === shownId)
			? shownId
			: projectedTop[0].careerId;
	return {
		careerId,
		tied,
		change: medianWageChange(todayId, careerId),
		afterYears: years !== undefined ? estimateWageAfterYears(findWage(careerId), years) : undefined,
	};
}

// Team 6's request limits for POST /api/steps (MAX_ARRAY_ITEMS and
// MAX_STRING_LENGTH in src/lib/next-steps-validation.ts). One bad match
// fails the whole request, so toCareerMatches keeps within them. Mirrored
// rather than imported to keep Team 6's validator out of the client bundle;
// projection-logic.test.ts fails if they drift.
export const STEPS_API_MAX_ITEMS = 500;
export const STEPS_API_MAX_TEXT = 500;

function fitText(text: string): string {
	return text.length <= STEPS_API_MAX_TEXT
		? text
		: `${text.slice(0, STEPS_API_MAX_TEXT - 1)}…`;
}

// For Team 6: projections as plain CareerMatch objects, ready to send as
// `matches` to POST /api/steps. The reason leads the rationale. Stays within
// Team 6's validation: blank or over-long career IDs are dropped (Team 6
// would reject them), the list keeps the best 500, and rationale holds at
// most 500 lines of at most 500 characters each.
export function toCareerMatches(projected: readonly ProjectedOutcome[]): CareerMatch[] {
	return rankMatches(projected)
		.filter(
			(outcome) =>
				outcome.careerId.trim() !== "" && outcome.careerId.length <= STEPS_API_MAX_TEXT,
		)
		.slice(0, STEPS_API_MAX_ITEMS)
		.map((outcome) => ({
			careerId: outcome.careerId,
			score: outcome.score,
			rationale: [outcome.reason, ...(outcome.rationale ?? [])]
				.slice(0, STEPS_API_MAX_ITEMS)
				.map(fitText),
		}));
}

// A stable string for one scenario, e.g. for a radio value or React key.
export function scenarioKey(scenario: Scenario): string {
	switch (scenario.kind) {
		case "gain-skill":
			return `gain-skill:${scenario.skill}`;
		case "gain-skills":
			return `gain-skills:${scenario.skills.join("|")}`;
		case "finish-education":
			return `finish-education:${scenario.step}`;
		case "add-experience":
			return `add-experience:${scenario.years}`;
		case "combined":
			return `combined:${scenario.skills.join("|")}:${scenario.step}:${scenario.years}`;
	}
}

// Bridges a projection to the OutcomeShift shape used elsewhere in Team 5.
export function toOutcomeShift(outcome: ProjectedOutcome): OutcomeShift {
	return createOutcomeShift(outcome.careerId, outcome.currentScore, outcome.score);
}
