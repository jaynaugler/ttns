// Team 5 tests for the Look Forward projection logic.
// Run with `pnpm run test:projection` (compiled by tsconfig.projection-test.json).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CareerMatch, ProjectedOutcome } from "@/types/outcomes";
import {
	MOCK_MATCHES,
	MOCK_USER_SKILLS,
} from "../components/look-forward/mock-matches";
import {
	buildDefaultScenarios,
	describeRankChange,
	describeScenario,
	describeShift,
	projectOutcomes,
	rankProjections,
	suggestSkillToGain,
	toCareerMatches,
	toOutcomeShift,
	type ProjectableMatch,
} from "./projection-logic";

const ORAL = "Oral Communication: Oral Comprehension";
const gainOral = { kind: "gain-skill", skill: ORAL } as const;

function find(outcomes: ProjectedOutcome[], careerId: string): ProjectedOutcome {
	const outcome = outcomes.find((o) => o.careerId === careerId);
	assert.ok(outcome, `expected an outcome for ${careerId}`);
	return outcome;
}

function plain(score: number, careerId = "99999"): CareerMatch {
	return { careerId, score };
}

describe("projectOutcomes: gain a skill", () => {
	const outcomes = projectOutcomes(MOCK_MATCHES, gainOral, {
		userSkills: MOCK_USER_SKILLS,
	});

	it("raises careers that use the new skill, using Team 4's formula", () => {
		const payroll = find(outcomes, "13102");
		assert.equal(payroll.currentScore, 65.4);
		assert.equal(payroll.score, 85);
		assert.equal(payroll.scoreShift, 19.6);
		assert.equal(payroll.reason, `${ORAL} is one of the 4 skills this career uses.`);
		assert.deepEqual(payroll.scenario, gainOral);

		assert.equal(find(outcomes, "12113").scoreShift, 5.9);
		assert.equal(find(outcomes, "12200").scoreShift, 8.1);
		assert.equal(find(outcomes, "21230").scoreShift, 3.5);
	});

	it("gives a negative shift when the career doesn't use the skill", () => {
		const admin = find(outcomes, "13110");
		assert.equal(admin.score, 73.8);
		assert.equal(admin.scoreShift, -0.5);
		assert.match(admin.reason, /doesn't use/);
	});

	it("doesn't change a match for a skill the user already has", () => {
		const [first] = projectOutcomes(
			[MOCK_MATCHES[1]],
			{ kind: "gain-skill", skill: "Writing" },
			{ userSkills: MOCK_USER_SKILLS },
		);
		assert.equal(first.scoreShift, 0);
		assert.equal(first.score, first.currentScore);
		assert.match(first.reason, /already have Writing/);
	});

	it("explains instead of guessing when data is missing", () => {
		const [noLists] = projectOutcomes([plain(60)], gainOral, {
			userSkills: MOCK_USER_SKILLS,
		});
		assert.equal(noLists.scoreShift, 0);
		assert.match(noLists.reason, /skill list/);

		const [noUserSkills] = projectOutcomes([MOCK_MATCHES[1]], gainOral);
		assert.equal(noUserSkills.scoreShift, 0);
		assert.match(noUserSkills.reason, /current skills/);

		const [blank] = projectOutcomes(
			[MOCK_MATCHES[1]],
			{ kind: "gain-skill", skill: "   " },
			{ userSkills: MOCK_USER_SKILLS },
		);
		assert.equal(blank.scoreShift, 0);
	});

	it("doesn't call a skill unused when the match already counted it", () => {
		// Writing is in 13102's matchedSkills but left out of userSkills here.
		const [outcome] = projectOutcomes(
			[MOCK_MATCHES[1]],
			{ kind: "gain-skill", skill: "Writing" },
			{ userSkills: ["Numeracy"] },
		);
		assert.equal(outcome.scoreShift, 0);
		assert.equal(outcome.reason, "Writing already counts toward this match.");
	});
});

describe("projectOutcomes: finish an education step", () => {
	const scenario = { kind: "finish-education", step: "a diploma" } as const;

	it("closes a quarter of the gap to a full match", () => {
		const [outcome] = projectOutcomes([plain(60)], scenario);
		assert.equal(outcome.score, 70);
		assert.equal(outcome.scoreShift, 10);
		assert.equal(outcome.reason, "Finishing a diploma closes part of the gap for this career.");
	});

	it("leaves a full match alone", () => {
		const [outcome] = projectOutcomes([plain(100)], scenario);
		assert.equal(outcome.scoreShift, 0);
		assert.equal(outcome.reason, "This is already a full match.");
	});
});

describe("projectOutcomes: add experience", () => {
	it("closes a tenth of the gap per year", () => {
		const [outcome] = projectOutcomes([plain(60)], { kind: "add-experience", years: 1 });
		assert.equal(outcome.score, 64);
		assert.equal(outcome.scoreShift, 4);
		assert.equal(outcome.reason, "1 more year of experience strengthens this match.");
	});

	it("counts at most five years", () => {
		const [outcome] = projectOutcomes([plain(60)], { kind: "add-experience", years: 10 });
		assert.equal(outcome.score, 80);
	});

	it("ignores zero, negative and non-numeric years", () => {
		for (const years of [0, -2, Number.NaN]) {
			const [outcome] = projectOutcomes([plain(60)], { kind: "add-experience", years });
			assert.equal(outcome.scoreShift, 0);
		}
	});
});

describe("no matches and bad input", () => {
	it("returns an empty list for every scenario when there are no matches", () => {
		for (const scenario of buildDefaultScenarios(MOCK_MATCHES, MOCK_USER_SKILLS)) {
			assert.deepEqual(projectOutcomes([], scenario, { userSkills: MOCK_USER_SKILLS }), []);
		}
		assert.deepEqual(rankProjections([], []), []);
	});

	it("drops matches with a non-finite score", () => {
		const outcomes = projectOutcomes(
			[plain(Number.NaN, "a"), plain(50, "b")],
			{ kind: "add-experience", years: 1 },
		);
		assert.deepEqual(outcomes.map((o) => o.careerId), ["b"]);
	});

	it("does not mutate its input", () => {
		const before = structuredClone(MOCK_MATCHES);
		projectOutcomes(MOCK_MATCHES, gainOral, { userSkills: MOCK_USER_SKILLS });
		assert.deepEqual(MOCK_MATCHES, before);
	});
});

describe("ranking", () => {
	const outcomes = projectOutcomes(MOCK_MATCHES, gainOral, {
		userSkills: MOCK_USER_SKILLS,
	});

	it("sorts best projected score first, breaking ties by careerId", () => {
		assert.deepEqual(
			outcomes.map((o) => o.careerId),
			["13102", "14201", "13110", "12200", "12113", "21230"],
		);
	});

	it("reports each top-3 match's rank before and after", () => {
		const top = rankProjections(MOCK_MATCHES, outcomes);
		assert.deepEqual(
			top.map(({ careerId, rank, previousRank }) => ({ careerId, rank, previousRank })),
			[
				{ careerId: "13102", rank: 1, previousRank: 2 },
				{ careerId: "14201", rank: 2, previousRank: 3 },
				{ careerId: "13110", rank: 3, previousRank: 1 },
			],
		);
	});

	it("describes rank changes in words", () => {
		assert.equal(describeRankChange(1, 2), "Moved up from #2");
		assert.equal(describeRankChange(3, 1), "Moved down from #1");
		assert.equal(describeRankChange(2, 2), "Still #2");
		assert.equal(describeRankChange(3, 5), "New to your top 3, up from #5");
		assert.equal(describeRankChange(3, undefined), "New to your top 3");
	});
});

describe("plain-language helpers", () => {
	it("describes shifts in words, not just a sign", () => {
		assert.deepEqual(describeShift(19.6), { direction: "up", text: "Up 19.6 points" });
		assert.deepEqual(describeShift(-0.5), { direction: "down", text: "Down 0.5 points" });
		assert.deepEqual(describeShift(1), { direction: "up", text: "Up 1 point" });
		assert.deepEqual(describeShift(0.01), { direction: "none", text: "No change" });
	});

	it("names each scenario", () => {
		assert.equal(describeScenario(gainOral), `Learn ${ORAL}`);
		assert.equal(
			describeScenario({ kind: "finish-education", step: "a diploma" }),
			"Finish a diploma",
		);
		assert.equal(describeScenario({ kind: "add-experience", years: 2 }), "Add 2 years of experience");
	});

	it("suggests the skill missing from the most matches", () => {
		assert.equal(suggestSkillToGain(MOCK_MATCHES, MOCK_USER_SKILLS), ORAL);
		assert.equal(suggestSkillToGain([plain(50)], MOCK_USER_SKILLS), undefined);
	});

	it("builds three default scenarios, or two without skill lists", () => {
		const kinds = (matches: readonly ProjectableMatch[]) =>
			buildDefaultScenarios(matches, MOCK_USER_SKILLS).map((s) => s.kind);
		assert.deepEqual(kinds(MOCK_MATCHES), ["gain-skill", "finish-education", "add-experience"]);
		assert.deepEqual(kinds([plain(50)]), ["finish-education", "add-experience"]);
	});

	it("leaves out the skill scenario when the user has no skills yet", () => {
		const kinds = buildDefaultScenarios(MOCK_MATCHES, []).map((s) => s.kind);
		assert.deepEqual(kinds, ["finish-education", "add-experience"]);
	});
});

describe("exports for other teams", () => {
	const [first] = projectOutcomes(MOCK_MATCHES, gainOral, { userSkills: MOCK_USER_SKILLS });

	it("converts projections to plain CareerMatch objects for Team 6", () => {
		const [match] = toCareerMatches([first]);
		assert.deepEqual(Object.keys(match).sort(), ["careerId", "rationale", "score"]);
		assert.equal(match.score, 85);
		assert.equal(match.rationale?.[0], first.reason);
	});

	it("converts a projection to an OutcomeShift", () => {
		const shift = toOutcomeShift(first);
		assert.equal(shift.careerId, "13102");
		assert.equal(shift.projectedScore, 85);
		assert.equal(shift.currentScore, 65.4);
	});
});
