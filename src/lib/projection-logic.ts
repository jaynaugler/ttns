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
//   - Import Team 4's DEFAULT_ALPHA and ScoredCareerMatch once
//     feature/matching-logic is on main; MATCH_ALPHA mirrors it until then.
//   - Agree a real rule for education and experience. EDUCATION_GAP_SHARE and
//     EXPERIENCE_GAP_SHARE_PER_YEAR are placeholders, not research figures.
//   - Let the user choose which skill to gain (today it suggests the skill
//     missing from the most matches).
// Hand-off notes: src/components/look-forward/README.md

import careersData from "../data/careers.json";
import type {
	Career,
	CareerMatch,
	OutcomeShift,
	ProjectedOutcome,
	Scenario,
	WageProjection,
} from "@/types/outcomes";

const careers = careersData as Career[];

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
		delta: projectedScore - currentScore,
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
	// Team 4's weight between job coverage and user coverage, 0 to 1.
	alpha?: number;
}

// Mirrors DEFAULT_ALPHA in Team 4's matching algorithm. Import it from
// "@/lib/matching-algo" once Team 4's branch is merged.
export const MATCH_ALPHA = 0.7;

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

function cleanAlpha(alpha: number | undefined): number {
	if (alpha === undefined || !Number.isFinite(alpha)) return MATCH_ALPHA;
	return Math.max(0, Math.min(1, alpha));
}

// Team 4's formula: S = alpha x C + (1 - alpha) x U, where C is the share of
// the career's skills the user has and U the share of the user's skills the
// career uses.
function skillMatchScore(
	matchedCount: number,
	careerSkillCount: number,
	userSkillCount: number,
	alpha: number,
): number {
	const careerCoverage = (matchedCount / careerSkillCount) * 100;
	const userCoverage = (matchedCount / userSkillCount) * 100;
	return alpha * careerCoverage + (1 - alpha) * userCoverage;
}

interface Projection {
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

	const alpha = cleanAlpha(options.alpha);
	const matchedCount = new Set(matchedSkills).size;

	if (missingSkills.includes(skill)) {
		return {
			score: skillMatchScore(matchedCount + 1, careerSkillCount, userSkills.size + 1, alpha),
			reason: `${skill} is one of the ${careerSkillCount} skills this career uses.`,
		};
	}

	// The career doesn't use the skill, so it covers a smaller share of what
	// the user can do and the score drops slightly.
	return {
		score: skillMatchScore(matchedCount, careerSkillCount, userSkills.size + 1, alpha),
		reason: `This career doesn't use ${skill}, so less of your skill set fits it.`,
	};
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
		case "finish-education":
			projection = projectEducation(match, scenario.step);
			break;
		case "add-experience":
			projection = projectExperience(match, scenario.years);
			break;
	}

	const score = roundScore(Math.min(FULL_MATCH, projection.score));
	return {
		careerId: match.careerId,
		score,
		rationale: match.rationale,
		currentScore: match.score,
		scenario,
		scoreShift: roundScore(score - match.score),
		reason: projection.reason,
	};
}

function byScoreThenId(a: CareerMatch, b: CareerMatch): number {
	return b.score - a.score || a.careerId.localeCompare(b.careerId);
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

// The projected top N, each with its rank before and after the scenario.
export function rankProjections(
	current: readonly CareerMatch[],
	projected: readonly ProjectedOutcome[],
	limit: number = TOP_MATCH_COUNT,
): RankedProjection[] {
	const previousRanks = new Map(
		rankMatches(current).map((match, index) => [match.careerId, index + 1]),
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
		case "finish-education":
			return `Finish ${scenario.step.trim() || "an education step"}`;
		case "add-experience":
			return `Add ${scenario.years} ${yearUnit(scenario.years)} of experience`;
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

// The three scenarios Look Forward offers by default. "Gain a skill" is left
// out when it can't be projected: no current skills, or no skill lists.
export function buildDefaultScenarios(
	matches: readonly ProjectableMatch[],
	userSkills: readonly string[],
): Scenario[] {
	const skill = userSkills.length > 0 ? suggestSkillToGain(matches, userSkills) : undefined;
	return [
		...(skill ? [{ kind: "gain-skill", skill } as const] : []),
		{ kind: "finish-education", step: "a diploma or certificate" },
		{ kind: "add-experience", years: 1 },
	];
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
		case "finish-education":
			return `finish-education:${scenario.step}`;
		case "add-experience":
			return `add-experience:${scenario.years}`;
	}
}

// Bridges a projection to the OutcomeShift shape used elsewhere in Team 5.
export function toOutcomeShift(outcome: ProjectedOutcome): OutcomeShift {
	return createOutcomeShift(outcome.careerId, outcome.currentScore, outcome.score);
}