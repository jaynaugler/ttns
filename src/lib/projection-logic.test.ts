// Team 5 tests for the Look Forward projection logic.
// Run with `pnpm run test:projection` (compiled by tsconfig.projection-test.json).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CareerMatch, ProjectedOutcome, Scenario } from "@/types/outcomes";
import {
	MOCK_MATCHES,
	MOCK_USER_SKILLS,
} from "../components/look-forward/mock-matches";
import {
	buildDefaultScenarios,
	buildScenarios,
	summaryWage,
	labelRanks,
	projectedPaths,
	estimateWageAfterYears,
	findWage,
	WAGE_YEARS_TO_HIGH,
	WAGE_YEARS_TO_MEDIAN,
	findCareerById,
	HOURS_PER_YEAR,
	medianAnnualWage,
	medianWageChange,
	skillsUsed,
	MAX_SKILL_PICKS,
	pickWageCareer,
	rankMatches,
	rankSkillsToLearn,
	createOutcomeShift,
	describeRankChange,
	describeScenario,
	describeShift,
	formatScore,
	MATCH_ALPHA,
	MIN_CAREER_SKILLS,
	projectOutcomes,
	rankProjections,
	scenarioKey,
	STEPS_API_MAX_ITEMS,
	STEPS_API_MAX_TEXT,
	suggestSkillToGain,
	toCareerMatches,
	toOutcomeShift,
	type ProjectableMatch,
} from "./projection-logic";
import {
	MAX_ARRAY_ITEMS,
	MAX_STRING_LENGTH,
	validateNextStepsRequest,
} from "./next-steps-validation";

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
		// Payroll lists 4 skills, so it is scored out of 5: 0.7 x 3/5 + 0.3 x 3/7
		// today; 0.7 x 4/5 + 0.3 x 4/8 projected.
		const payroll = find(outcomes, "13102");
		assert.equal(payroll.currentScore, 54.85714285714286);
		assert.equal(payroll.score, 71);
		assert.equal(payroll.scoreShift, 16.1);
		assert.equal(payroll.reason, `${ORAL} is one of the 4 skills this career uses.`);
		assert.deepEqual(payroll.scenario, gainOral);

		assert.equal(find(outcomes, "12113").scoreShift, 5.9);
		assert.equal(find(outcomes, "12200").scoreShift, 8.1);
		assert.equal(find(outcomes, "12201").scoreShift, 5.2);
		assert.equal(find(outcomes, "21230").scoreShift, 3.5);
	});

	it("never lowers a match for a skill the career uses", () => {
		const missing = new Set(MOCK_MATCHES.flatMap((m) => m.missingSkills ?? []));
		for (const skill of missing) {
			const projected = projectOutcomes(MOCK_MATCHES, { kind: "gain-skill", skill }, {
				userSkills: MOCK_USER_SKILLS,
			});
			for (const outcome of projected) {
				const match = MOCK_MATCHES.find((m) => m.careerId === outcome.careerId);
				if (match?.missingSkills?.includes(skill)) {
					assert.ok(outcome.scoreShift > 0, `${skill} lowered ${outcome.careerId}`);
				}
			}
		}
	});

	it("leaves a match unchanged when the career doesn't use the skill", () => {
		// Team 4's formula would give Payroll 53.3 (down 1.6) for Evaluation.
		const [payroll] = projectOutcomes(
			MOCK_MATCHES.filter((m) => m.careerId === "13102"),
			{ kind: "gain-skill", skill: "Evaluation" },
			{ userSkills: MOCK_USER_SKILLS },
		);
		assert.equal(payroll.scoreShift, 0);
		assert.equal(payroll.score, 54.9);
		assert.equal(payroll.reason, "This career doesn't use Evaluation, so this match doesn't change.");
	});

	it("gives exactly 0 for every skill a career doesn't use", () => {
		const skills = new Set(MOCK_MATCHES.flatMap((m) => m.missingSkills ?? []));
		let checked = 0;
		for (const skill of skills) {
			const projected = projectOutcomes(MOCK_MATCHES, { kind: "gain-skill", skill }, {
				userSkills: MOCK_USER_SKILLS,
			});
			for (const outcome of projected) {
				const match = MOCK_MATCHES.find((m) => m.careerId === outcome.careerId);
				if (!match?.missingSkills?.includes(skill)) {
					checked++;
					assert.ok(Object.is(outcome.scoreShift, 0), `${skill} moved ${outcome.careerId}`);
				}
			}
		}
		assert.ok(checked > 0);
	});

	it("doesn't change a match for a skill the user already has", () => {
		const [first] = projectOutcomes(
			[MOCK_MATCHES[1]],
			{ kind: "gain-skill", skill: "Writing" },
			{ userSkills: MOCK_USER_SKILLS },
		);
		assert.equal(first.scoreShift, 0);
		// The projected score is rounded to one decimal; the current one isn't.
		assert.equal(first.score, Math.round(first.currentScore * 10) / 10);
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
		// Writing is in 12200's matchedSkills but left out of userSkills here.
		const [outcome] = projectOutcomes(
			[MOCK_MATCHES[1]],
			{ kind: "gain-skill", skill: "Writing" },
			{ userSkills: ["Numeracy"] },
		);
		assert.equal(outcome.scoreShift, 0);
		assert.equal(outcome.reason, "Writing already counts toward this match.");
	});
});

// Each match's weight is read back from its score, so projections follow
// Team 4's default and the weights slider on /current-pathways.
describe("projectOutcomes: gain a skill uses the match's own weight", () => {
	const USER_SKILLS = ["Digital Literacy", "Numeracy", "Problem Solving", "Writing"];
	const gainCritical = { kind: "gain-skill", skill: "Critical Thinking" } as const;

	// 4 of the career's 13 skills matched; all 4 of the user's skills used.
	function statsOfficer(score: number): ProjectableMatch {
		return {
			careerId: "21230",
			score,
			matchedSkills: USER_SKILLS,
			missingSkills: [
				"Critical Thinking",
				"Decision Making",
				"Evaluation",
				"Instructing",
				"Monitoring",
				"Oral Communication: Active Listening",
				"Oral Communication: Oral Comprehension",
				"Oral Communication: Oral Expression",
				"Systems Analysis",
			],
		};
	}

	it("projects a match scored at Team 4's default 0.3 with 0.3", () => {
		// 0.3 x 30.77 + 0.7 x 100 today; 0.3 x 38.46 + 0.7 x 100 projected.
		const [outcome] = projectOutcomes([statsOfficer(79.23076923076923)], gainCritical, {
			userSkills: USER_SKILLS,
		});
		assert.equal(MATCH_ALPHA, 0.3);
		assert.equal(outcome.score, 81.5);
		assert.equal(outcome.scoreShift, 2.3);
	});

	it("projects a match scored at 0.7 (slider moved) with 0.7", () => {
		// 0.7 x 30.77 + 0.3 x 100 today; 0.7 x 38.46 + 0.3 x 100 projected.
		const [outcome] = projectOutcomes([statsOfficer(51.53846153846154)], gainCritical, {
			userSkills: USER_SKILLS,
		});
		assert.equal(outcome.score, 56.9);
		assert.equal(outcome.scoreShift, 5.4);
	});

	it("falls back to MATCH_ALPHA when job and user coverage are equal", () => {
		// 2 of 5 career skills and 2 of 5 user skills: every weight gives 40.
		// Projected at 0.3: 0.3 x 60 + 0.7 x 50.
		const [outcome] = projectOutcomes(
			[
				{
					careerId: "x",
					score: 40,
					matchedSkills: ["Numeracy", "Writing"],
					missingSkills: ["Critical Thinking", "Evaluation", "Monitoring"],
				},
			],
			gainCritical,
			{ userSkills: [...USER_SKILLS, "Troubleshooting"] },
		);
		assert.equal(outcome.score, 53);
	});

	it("counts a career with fewer than 5 skills as 5, like Team 4", () => {
		// Banking clerks lists 4 skills; the user has 3 of them. At 0.7:
		// 0.7 x 3/5 + 0.3 x 3/4 today; 0.7 x 4/5 + 0.3 x 4/5 projected.
		const [outcome] = projectOutcomes(
			[
				{
					careerId: "14201",
					score: 64.5,
					matchedSkills: ["Numeracy", "Problem Solving", "Writing"],
					missingSkills: [ORAL],
				},
			],
			gainOral,
			{ userSkills: USER_SKILLS },
		);
		assert.equal(MIN_CAREER_SKILLS, 5);
		assert.equal(outcome.score, 80);
		assert.equal(outcome.scoreShift, 15.5);
		assert.equal(outcome.reason, `${ORAL} is one of the 4 skills this career uses.`);
	});

	it("falls back to MATCH_ALPHA when the score didn't come from the formula", () => {
		// 10 would need a weight of 1.3.
		const [outcome] = projectOutcomes([statsOfficer(10)], gainCritical, {
			userSkills: USER_SKILLS,
		});
		assert.equal(outcome.score, 81.5);
	});

	it("uses an explicit alpha over the match's own weight", () => {
		const [outcome] = projectOutcomes([statsOfficer(79.23076923076923)], gainCritical, {
			userSkills: USER_SKILLS,
			alpha: 0.7,
		});
		assert.equal(outcome.score, 56.9);
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
			["13102", "14201", "12200", "12113", "12201", "21230"],
		);
	});

	it("reports each top-3 match's rank before and after", () => {
		const top = rankProjections(MOCK_MATCHES, outcomes);
		assert.deepEqual(
			top.map(({ careerId, rank, previousRank }) => ({ careerId, rank, previousRank })),
			[
				{ careerId: "13102", rank: 1, previousRank: 3 },
				// Tied with 13102 today (both 54.9), so it shares #3.
				{ careerId: "14201", rank: 2, previousRank: 3 },
				{ careerId: "12200", rank: 3, previousRank: 2 },
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

	it("gives each scenario a distinct key", () => {
		const keys = buildDefaultScenarios(MOCK_MATCHES, MOCK_USER_SKILLS).map(scenarioKey);
		assert.equal(new Set(keys).size, keys.length);
		assert.equal(scenarioKey(gainOral), `gain-skill:${ORAL}`);
	});
});

describe("buildScenarios: the options on /updated-pathways", () => {
	const DEGREE = "Business Administration Diploma";
	const keys = (picks: string[], degree?: string) =>
		buildScenarios(MOCK_MATCHES, MOCK_USER_SKILLS, picks, degree).map(scenarioKey);

	it("offers the suggested skill before any pick, the degree, a year, and all three", () => {
		assert.deepEqual(keys([], DEGREE), [
			`gain-skill:${ORAL}`,
			`finish-education:${DEGREE}`,
			"add-experience:1",
			`combined:${ORAL}:${DEGREE}:1`,
		]);
	});

	it("learns all the picks together, at most three", () => {
		assert.deepEqual(keys(["Evaluation", "Monitoring", " Evaluation "], DEGREE), [
			"gain-skills:Evaluation|Monitoring",
			`finish-education:${DEGREE}`,
			"add-experience:1",
			`combined:Evaluation|Monitoring:${DEGREE}:1`,
		]);
		const [learn] = buildScenarios(MOCK_MATCHES, MOCK_USER_SKILLS, ["A", "B", "C", "D"]);
		assert.deepEqual(learn, { kind: "gain-skills", skills: ["A", "B", "C"] });
		assert.equal(MAX_SKILL_PICKS, 3);
	});

	it("names the education step the same way with or without picks", () => {
		const education = (picks: string[], degree?: string) =>
			buildScenarios(MOCK_MATCHES, MOCK_USER_SKILLS, picks, degree)[1];
		assert.deepEqual(education([], DEGREE), education(["Evaluation"], DEGREE));
		assert.deepEqual(education([], "  "), {
			kind: "finish-education",
			step: "a diploma or certificate",
		});
	});

	it("leaves out the skill option with no picks and no current skills", () => {
		assert.deepEqual(buildScenarios(MOCK_MATCHES, []).map(scenarioKey), [
			"finish-education:a diploma or certificate",
			"add-experience:1",
			"combined::a diploma or certificate:1",
		]);
	});

	it("describes the picks in words", () => {
		const learn = (skills: string[]) => describeScenario({ kind: "gain-skills", skills });
		assert.equal(learn(["A"]), "Learn A");
		assert.equal(learn(["A", "B"]), "Learn A and B");
		assert.equal(learn(["A", "B", "C"]), "Learn A, B and C");
	});
});

// Real numbers from the test journey at alpha 0.3, for a user whose skills
// are JOURNEY_SKILLS.
const JOURNEY_SKILLS = [
	"Critical Thinking",
	"Decision Making",
	"Equipment and Tool Selection",
	"Management of Material Resources",
	"Management of Personnel Resources",
	"Troubleshooting",
];
const LANDSCAPING: ProjectableMatch = {
	careerId: "82031",
	score: 77.82608695652173,
	matchedSkills: JOURNEY_SKILLS,
	missingSkills: [
		"Coordinating",
		"Evaluation",
		"Instructing",
		"Learning and Teaching Strategies",
		"Management of Financial Resources",
		"Monitoring",
		"Negotiating",
		"Numeracy",
		"Oral Communication: Active Listening",
		"Oral Communication: Oral Comprehension",
		"Oral Communication: Oral Expression",
		"Persuading",
		"Preventative Maintenance",
		"Problem Solving",
		"Quality Control Testing",
		"Social Perceptiveness",
		"Time Management",
	],
};
const MEDICAL_LAB: ProjectableMatch = {
	careerId: "32120",
	score: 77.2,
	matchedSkills: JOURNEY_SKILLS,
	missingSkills: [
		"Digital Literacy",
		"Evaluation",
		"Instructing",
		"Learning and Teaching Strategies",
		"Monitoring",
		"Numeracy",
		"Operation Monitoring of Machinery and Equipment",
		"Operation and Control",
		"Oral Communication: Oral Comprehension",
		"Oral Communication: Oral Expression",
		"Persuading",
		"Preventative Maintenance",
		"Problem Solving",
		"Quality Control Testing",
		"Reading Comprehension",
		"Repairing",
		"Social Perceptiveness",
		"Systems Analysis",
		"Time Management",
	],
};
const JOURNEY_MATCHES = [LANDSCAPING, MEDICAL_LAB];

function learnTogether(skills: string[], matches: readonly ProjectableMatch[] = JOURNEY_MATCHES) {
	return projectOutcomes(matches, { kind: "gain-skills", skills }, { userSkills: JOURNEY_SKILLS });
}

describe("projectOutcomes: up to three skills together", () => {
	it("scores one picked skill exactly like the single-skill scenario", () => {
		const fields = ({ careerId, score, scoreShift, reason }: ProjectedOutcome) => ({
			careerId,
			score,
			scoreShift,
			reason,
		});
		for (const skill of new Set(MOCK_MATCHES.flatMap((m) => m.missingSkills ?? []))) {
			const one = projectOutcomes(MOCK_MATCHES, { kind: "gain-skills", skills: [skill] }, {
				userSkills: MOCK_USER_SKILLS,
			});
			const single = projectOutcomes(MOCK_MATCHES, { kind: "gain-skill", skill }, {
				userSkills: MOCK_USER_SKILLS,
			});
			assert.deepEqual(one.map(fields), single.map(fields));
		}
	});

	it("counts only the picks a career uses", () => {
		// Medical lab uses Digital Literacy and Evaluation, not Coordinating:
		// 0.3 x 8/25 + 0.7 x 8/8.
		const [three] = learnTogether(["Digital Literacy", "Evaluation", "Coordinating"], [MEDICAL_LAB]);
		const [two] = learnTogether(["Digital Literacy", "Evaluation"], [MEDICAL_LAB]);
		assert.equal(three.score, 79.6);
		assert.equal(three.score, two.score);
		assert.equal(three.scoreShift, 2.4);
		assert.equal(three.reason, "Uses 2 of your 3 new skills: Digital Literacy, Evaluation.");
	});

	it("leaves a career that uses none of the picks exactly unchanged", () => {
		const [outcome] = learnTogether(["Digital Literacy", "Reading Comprehension"], [LANDSCAPING]);
		assert.ok(Object.is(outcome.scoreShift, 0));
		assert.equal(
			outcome.reason,
			"This career doesn't use these skills, so this match doesn't change.",
		);
	});

	it("never lowers a match, whichever three skills are picked", () => {
		const skills = [...new Set(MOCK_MATCHES.flatMap((m) => m.missingSkills ?? []))];
		for (let i = 0; i < skills.length; i++) {
			const picks = [skills[i], skills[(i + 3) % skills.length], skills[(i + 7) % skills.length]];
			const outcomes = projectOutcomes(MOCK_MATCHES, { kind: "gain-skills", skills: picks }, {
				userSkills: MOCK_USER_SKILLS,
			});
			for (const outcome of outcomes) {
				const match = MOCK_MATCHES.find((m) => m.careerId === outcome.careerId);
				const uses = picks.some((skill) => match?.missingSkills?.includes(skill));
				assert.ok(
					uses ? outcome.scoreShift > 0 : Object.is(outcome.scoreShift, 0),
					`${picks.join(", ")} on ${outcome.careerId}`,
				);
			}
		}
	});

	it("lets #2 overtake #1 when only #2 uses the new skill", () => {
		const top = rankProjections(JOURNEY_MATCHES, learnTogether(["Digital Literacy"]));
		assert.deepEqual(
			top.map(({ careerId, score, scoreShift, rank, previousRank }) => ({
				careerId,
				score,
				scoreShift,
				rank,
				previousRank,
			})),
			[
				{ careerId: "32120", score: 78.4, scoreShift: 1.2, rank: 1, previousRank: 2 },
				{ careerId: "82031", score: 77.8, scoreShift: 0, rank: 2, previousRank: 1 },
			],
		);
		assert.equal(describeRankChange(top[0].rank, top[0].previousRank), "Moved up from #2");
		assert.equal(describeRankChange(top[1].rank, top[1].previousRank), "Moved down from #1");
	});
});

describe("projectOutcomes: do all three", () => {
	const all = (skills: string[], years: number) =>
		({ kind: "combined", skills, step: "a diploma", years }) as const;

	it("equals learning the skills, then finishing education, then adding experience", () => {
		const [combined] = projectOutcomes([MEDICAL_LAB], all(["Digital Literacy"], 5), {
			userSkills: JOURNEY_SKILLS,
		});
		// Each step runs on the result of the one before.
		const [skills] = learnTogether(["Digital Literacy"], [MEDICAL_LAB]);
		const [education] = projectOutcomes([{ careerId: "32120", score: skills.score }], {
			kind: "finish-education",
			step: "a diploma",
		});
		const [experience] = projectOutcomes([{ careerId: "32120", score: education.score }], {
			kind: "add-experience",
			years: 5,
		});
		// 78.4, then 78.4 + 21.6 x 0.25 = 83.8, then 83.8 + 16.2 x 0.5 = 91.9.
		assert.equal(skills.score, 78.4);
		assert.equal(education.score, 83.8);
		assert.equal(experience.score, 91.9);
		assert.equal(combined.score, experience.score);
		assert.equal(combined.reason, "Uses 1 of your new skills, plus education and 5 years' experience.");
	});

	it("never goes over 100 and is never lower than any one part alone", () => {
		const parts = (skills: string[], years: number): Scenario[] => [
			{ kind: "gain-skills", skills },
			{ kind: "finish-education", step: "a diploma" },
			{ kind: "add-experience", years },
		];
		const skillSets = [[], ["Digital Literacy"], ["Digital Literacy", "Evaluation", "Coordinating"]];
		const matches = [...JOURNEY_MATCHES, { careerId: "full", score: 100 }, { careerId: "low", score: 3 }];
		for (const skills of skillSets) {
			for (const years of [1, 2, 5, 10]) {
				const combined = projectOutcomes(matches, all(skills, years), { userSkills: JOURNEY_SKILLS });
				for (const outcome of combined) {
					assert.ok(outcome.score <= 100, `${outcome.careerId} over 100`);
					for (const part of parts(skills, years)) {
						const [alone] = projectOutcomes(
							matches.filter((m) => m.careerId === outcome.careerId),
							part,
							{ userSkills: JOURNEY_SKILLS },
						);
						assert.ok(
							outcome.score >= alone.score,
							`${outcome.careerId}: all three ${outcome.score} < ${part.kind} ${alone.score}`,
						);
					}
				}
			}
		}
	});

	it("names the recommended skill when no skills are picked", () => {
		const [learn, , , combined] = buildScenarios(JOURNEY_MATCHES, JOURNEY_SKILLS, [], "a diploma");
		assert.equal(learn.kind, "gain-skill");
		assert.equal(combined.kind === "combined" && combined.recommended, true);
		const [picked] = buildScenarios(JOURNEY_MATCHES, JOURNEY_SKILLS, ["Digital Literacy"]).slice(3);
		assert.equal(picked.kind === "combined" && picked.recommended, false);

		const [medicalLab] = projectOutcomes(
			[MEDICAL_LAB],
			{ ...all(["Evaluation"], 2), recommended: true },
			{ userSkills: JOURNEY_SKILLS },
		);
		assert.equal(
			medicalLab.reason,
			"Uses the recommended skill: Evaluation, plus education and 2 years' experience.",
		);
	});

	it("says which parts count for each career", () => {
		const [landscaping, medicalLab] = projectOutcomes(
			JOURNEY_MATCHES,
			all(["Digital Literacy", "Evaluation"], 2),
			{ userSkills: JOURNEY_SKILLS },
		).sort((a, b) => a.careerId.localeCompare(b.careerId)).reverse();
		assert.equal(
			medicalLab.reason,
			"Uses 2 of your new skills, plus education and 2 years' experience.",
		);
		assert.equal(landscaping.careerId, "82031");
		assert.equal(
			landscaping.reason,
			"Uses 1 of your new skills, plus education and 2 years' experience.",
		);
		const [none] = projectOutcomes([LANDSCAPING], all(["Digital Literacy"], 1), {
			userSkills: JOURNEY_SKILLS,
		});
		assert.equal(none.reason, "Education and 1 year's experience; it doesn't use this skill.");
		assert.equal(describeScenario(all(["A", "B"], 5)), "Learn A, B · Finish a diploma · 5 years experience");
	});
});

describe("ranking projections", () => {
	it("ranks by the unrounded score when two round to the same one decimal", () => {
		// Landscaping keeps 77.826 (doesn't use Digital Literacy); this career
		// climbs from 76.667 to 77.778. Both show as 77.8.
		const climber: ProjectableMatch = {
			careerId: "20012",
			score: 76.66666666666667,
			matchedSkills: JOURNEY_SKILLS,
			missingSkills: Array.from({ length: 21 }, (_, i) => (i === 0 ? "Digital Literacy" : `Skill ${i}`)),
		};
		const top = rankProjections(
			[LANDSCAPING, climber],
			learnTogether(["Digital Literacy"], [LANDSCAPING, climber]),
		);
		assert.deepEqual(top.map((o) => [o.careerId, o.score]), [
			["82031", 77.8],
			["20012", 77.8],
		]);
	});
});

describe("pickWageCareer", () => {
	// A third career below the two journey matches, so there's a #3 row.
	const THIRD: ProjectableMatch = {
		careerId: "20012",
		score: 76.66666666666667,
		matchedSkills: JOURNEY_SKILLS,
		missingSkills: Array.from({ length: 21 }, (_, i) => (i === 0 ? "Digital Literacy" : `Skill ${i}`)),
	};
	const matches = [...JOURNEY_MATCHES, THIRD];
	const today = rankMatches(matches);
	const withDigitalLiteracy = rankProjections(
		matches,
		projectOutcomes(matches, { kind: "gain-skills", skills: ["Digital Literacy"] }, {
			userSkills: JOURNEY_SKILLS,
		}),
	);

	it("shows today's #1, or the row picked, with no comparison when no change is selected", () => {
		assert.deepEqual(pickWageCareer(today), { careerId: "82031" });
		assert.deepEqual(pickWageCareer(today, []), { careerId: "82031" });
		assert.deepEqual(pickWageCareer(today, undefined, "32120"), { careerId: "32120" });
		assert.equal(pickWageCareer([]), undefined);
	});

	it("doesn't compare the #1 when the same career stays on top", () => {
		const projected = rankProjections(
			matches,
			projectOutcomes(matches, { kind: "add-experience", years: 1 }),
		);
		assert.deepEqual(pickWageCareer(today, projected), { careerId: "82031" });
	});

	it("compares a new #1 with today's #1", () => {
		assert.deepEqual(pickWageCareer(today, withDigitalLiteracy), {
			careerId: "32120",
			comparedWith: "82031",
			comparedAs: "today",
		});
	});

	it("compares any other row with the new #1", () => {
		// Today's #1, now #2.
		assert.deepEqual(pickWageCareer(today, withDigitalLiteracy, "82031"), {
			careerId: "82031",
			comparedWith: "32120",
			comparedAs: "new",
		});
		// The #3 row.
		assert.deepEqual(pickWageCareer(today, withDigitalLiteracy, "20012"), {
			careerId: "20012",
			comparedWith: "32120",
			comparedAs: "new",
		});
	});

	it("falls back to the #1 when the row picked isn't listed", () => {
		assert.deepEqual(pickWageCareer(today, withDigitalLiteracy, "99999"), {
			careerId: "32120",
			comparedWith: "82031",
			comparedAs: "today",
		});
	});
});

describe("ties and today's #1", () => {
	it("gives careers with the same displayed score the same rank, marked tied", () => {
		const ranked = [
			{ careerId: "a", score: 80 },
			{ careerId: "b", score: 77.83 },
			{ careerId: "c", score: 77.78 },
			{ careerId: "d", score: 70 },
		];
		assert.deepEqual(labelRanks(ranked), [
			{ rank: 1, tied: false },
			{ rank: 2, tied: true },
			{ rank: 2, tied: true },
			{ rank: 4, tied: false },
		]);
	});

	// Learning Digital Literacy lifts these two above landscaping, today's #1.
	const climbers: ProjectableMatch[] = [
		{
			careerId: "24skills",
			score: 77.5,
			matchedSkills: JOURNEY_SKILLS,
			missingSkills: Array.from({ length: 18 }, (_, i) => (i === 0 ? "Digital Literacy" : `Skill ${i}`)),
		},
		MEDICAL_LAB,
		{
			careerId: "27skills",
			score: 76.66666666666667,
			matchedSkills: JOURNEY_SKILLS,
			missingSkills: Array.from({ length: 21 }, (_, i) => (i === 0 ? "Digital Literacy" : `Skill ${i}`)),
		},
	];
	const matches = [LANDSCAPING, ...climbers];
	const outcomes = learnTogether(["Digital Literacy"], matches);

	it("keeps today's #1 listed after the top N when it drops out", () => {
		const paths = projectedPaths(matches, outcomes, 2);
		assert.deepEqual(
			paths.map(({ careerId, rank, tied, previousRank }) => ({ careerId, rank, tied, previousRank })),
			[
				{ careerId: "24skills", rank: 1, tied: false, previousRank: 2 },
				{ careerId: "32120", rank: 2, tied: false, previousRank: 3 },
				// 77.826 and 77.778 both show as 77.8.
				{ careerId: "82031", rank: 3, tied: true, previousRank: 1 },
			],
		);
		// With a top 3, both careers tied at #3 are listed.
		assert.deepEqual(
			projectedPaths(matches, outcomes).map((p) => [p.careerId, p.rank, p.tied]),
			[
				["24skills", 1, false],
				["32120", 2, false],
				["82031", 3, true],
				["27skills", 3, true],
			],
		);
	});

	it("compares with today's #1 when careers are tied at #1", () => {
		const today = rankMatches(JOURNEY_MATCHES);
		const tiedTop = [
			{ careerId: "x", score: 80 },
			{ careerId: "y", score: 80 },
			{ careerId: "82031", score: 77.8 },
		];
		assert.deepEqual(pickWageCareer(today, tiedTop), {
			careerId: "x",
			comparedWith: "82031",
			comparedAs: "today",
		});
		assert.deepEqual(pickWageCareer(today, tiedTop, "y"), {
			careerId: "y",
			comparedWith: "82031",
			comparedAs: "today",
		});
		assert.deepEqual(pickWageCareer(today, tiedTop, "82031"), { careerId: "82031" });
	});
});

describe("summaryWage", () => {
	// Medical lab (32120) and landscaping (82031) tied at #1, Legislators below.
	const tiedTop = [
		{ careerId: "32120", score: 80 },
		{ careerId: "82031", score: 80 },
		{ careerId: "00010", score: 70 },
	];

	it("takes the headline and the after-N-years line from the same career", () => {
		const cases: [readonly CareerMatch[], string | undefined][] = [
			[tiedTop, "32120"],
			[tiedTop, "82031"],
			[[{ careerId: "32120", score: 81 }, ...tiedTop.slice(1)], undefined],
			[[{ careerId: "00010", score: 90 }, ...tiedTop.slice(0, 2)], "32120"],
		];
		for (const [top, selected] of cases) {
			for (const years of [1, 2, 5]) {
				const wage = summaryWage("82031", top, selected, years);
				assert.ok(wage?.careerId);
				assert.equal(wage.change, medianWageChange("82031", wage.careerId));
				assert.deepEqual(wage.afterYears, estimateWageAfterYears(findWage(wage.careerId), years));
			}
		}
		// Medical lab after 1 year: 25.13 + (39 - 25.13) / 5 = $27.904/hour.
		assert.equal(summaryWage("82031", tiedTop, "32120", 1)?.afterYears?.annual, 54413);
	});

	it("names no career for a tie at #1 until one is selected", () => {
		assert.deepEqual(summaryWage("82031", tiedTop, undefined, 1), { tied: true });
		assert.deepEqual(summaryWage("82031", tiedTop, "not-listed", 1), { tied: true });
		assert.equal(summaryWage("82031", tiedTop, "32120")?.careerId, "32120");
	});

	it("uses the projected #1 without a tie, whatever row is selected", () => {
		const top = [{ careerId: "32120", score: 81 }, ...tiedTop.slice(1)];
		assert.deepEqual(summaryWage("82031", top, "00010"), {
			careerId: "32120",
			tied: false,
			change: 17920,
			afterYears: undefined,
		});
		assert.equal(summaryWage("82031", []), undefined);
	});
});

describe("rankSkillsToLearn", () => {
	it("puts the recommended skill first, then the most needed, and skips owned skills", () => {
		const ranked = rankSkillsToLearn(JOURNEY_MATCHES, JOURNEY_SKILLS, [
			"Repairing",
			"Evaluation",
			"Critical Thinking",
			"Zzz Unused",
			"Digital Literacy",
		]);
		assert.deepEqual(
			ranked.map(({ skill, missingFrom, recommended }) => [skill, missingFrom, recommended]),
			[
				["Evaluation", 2, true],
				["Digital Literacy", 1, false],
				["Repairing", 1, false],
				["Zzz Unused", 0, false],
			],
		);
	});
});

describe("skillsUsed", () => {
	it("keeps only the picks a career lists as missing", () => {
		assert.deepEqual(
			skillsUsed(MEDICAL_LAB, ["Digital Literacy", "Coordinating", "Evaluation"], JOURNEY_SKILLS),
			["Digital Literacy", "Evaluation"],
		);
		assert.deepEqual(skillsUsed(LANDSCAPING, ["Digital Literacy"], JOURNEY_SKILLS), []);
	});
});

describe("median wages from Job Bank", () => {
	it("turns an hourly median into a year at 1,950 hours, like careers.json", () => {
		assert.equal(HOURS_PER_YEAR, 1950);
		// Landscaping $29.81/hour, Medical lab $39/hour.
		assert.equal(medianAnnualWage("82031"), 58130);
		assert.equal(medianAnnualWage("32120"), 76050);
		assert.equal(findCareerById("82031")?.medianWage, 58130);
	});

	it("gives the yearly difference between two careers' medians", () => {
		assert.equal(medianWageChange("82031", "32120"), 17920);
		assert.equal(medianWageChange("32120", "82031"), -17920);
		assert.equal(medianWageChange("82031", "no-such-code"), undefined);
	});

	it("keeps a yearly median as it is", () => {
		// Legislators are published per year.
		assert.equal(medianAnnualWage("00010"), 84000);
	});
});

describe("estimateWageAfterYears", () => {
	// Medical lab technologists: hourly, low $25.13, median $39, high $49.
	const hourly = { lowWage: 25.13, medianWage: 39, highWage: 49, isAnnual: false };

	it("starts at the low wage, reaches the median at 5 years and the high at 15", () => {
		assert.equal(WAGE_YEARS_TO_MEDIAN, 5);
		assert.equal(WAGE_YEARS_TO_HIGH, 15);
		assert.equal(estimateWageAfterYears(hourly, 0)?.amount, 25.13);
		assert.equal(estimateWageAfterYears(hourly, 5)?.amount, 39);
		assert.equal(estimateWageAfterYears(hourly, 15)?.amount, 49);
		assert.equal(estimateWageAfterYears(hourly, 20)?.amount, 49);
	});

	it("moves in a straight line between the milestones", () => {
		// 2 years: 25.13 + (39 - 25.13) x 2/5 = 30.678; 10 years: 39 + 10 x 1/2.
		assert.ok(Math.abs(estimateWageAfterYears(hourly, 2)!.amount - 30.678) < 1e-9);
		assert.equal(estimateWageAfterYears(hourly, 10)?.amount, 44);
	});

	it("gives an hourly career's year at 1,950 hours, and keeps a yearly one", () => {
		const fiveYears = estimateWageAfterYears(hourly, 5);
		assert.equal(fiveYears?.annual, 76050);
		assert.equal(fiveYears?.isAnnual, false);

		const yearly = { lowWage: 32867, medianWage: 84000, highWage: 184000, isAnnual: true };
		assert.equal(estimateWageAfterYears(yearly, 0)?.annual, 32867);
		assert.equal(estimateWageAfterYears(yearly, 5)?.annual, 84000);
	});

	it("falls back to the median when low or high isn't published", () => {
		const medianOnly = { lowWage: null, medianWage: 39, highWage: 49, isAnnual: false };
		assert.deepEqual(estimateWageAfterYears(medianOnly, 2), {
			amount: 39,
			annual: 76050,
			isAnnual: false,
			rangePublished: false,
		});
		assert.equal(estimateWageAfterYears({ ...medianOnly, medianWage: null }, 2), undefined);
		assert.equal(estimateWageAfterYears(undefined, 2), undefined);
	});

	it("reads Job Bank's wages by NOC code", () => {
		assert.equal(estimateWageAfterYears(findWage("32120"), 5)?.annual, 76050);
	});
});

describe("exports for other teams", () => {
	const [first] = projectOutcomes(MOCK_MATCHES, gainOral, { userSkills: MOCK_USER_SKILLS });

	it("converts projections to plain CareerMatch objects for Team 6", () => {
		const [match] = toCareerMatches([first]);
		assert.deepEqual(Object.keys(match).sort(), ["careerId", "rationale", "score"]);
		assert.equal(match.score, 71);
		assert.equal(match.rationale?.[0], first.reason);
	});

	it("converts a projection to an OutcomeShift", () => {
		const shift = toOutcomeShift(first);
		assert.equal(shift.careerId, "13102");
		assert.equal(shift.projectedScore, 71);
		assert.equal(shift.currentScore, 54.85714285714286);
		assert.equal(shift.delta, 16.1);
	});
});

describe("formatScore", () => {
	it("shows one decimal place, like the projections", () => {
		assert.equal(formatScore(79.23076923076923), "79.2");
		assert.equal(formatScore(81.5), "81.5");
		assert.equal(formatScore(85), "85");
		assert.equal(formatScore(-0.04), "0");
	});
});

describe("createOutcomeShift", () => {
	it("rounds the delta to one decimal place, like Team 4's scores", () => {
		assert.equal(85 - 65.4, 19.599999999999994);
		assert.equal(createOutcomeShift("13102", 65.4, 85).delta, 19.6);
		assert.equal(createOutcomeShift("13110", 74.3, 73.8).delta, -0.5);
	});

	it("reports no change as 0, not -0", () => {
		assert.ok(Object.is(createOutcomeShift("x", 50, 50.04).delta, 0));
		assert.ok(Object.is(createOutcomeShift("x", 50.04, 50).delta, 0));
	});
});

// Runs Team 5's output through Team 6's own request validator, so these fail
// if either side's contract changes.
describe("compatibility with Team 6's POST /api/steps", () => {
	// The smallest profile Team 6 accepts; building the real one is the
	// application integration layer's job, not Team 5's.
	const profile = { id: "test-user", skills: [], interests: [] };

	function validate(matches: CareerMatch[]) {
		return validateNextStepsRequest(JSON.parse(JSON.stringify({ matches, profile })));
	}

	it("keeps Team 5's mirrored limits equal to Team 6's", () => {
		assert.equal(STEPS_API_MAX_ITEMS, MAX_ARRAY_ITEMS);
		assert.equal(STEPS_API_MAX_TEXT, MAX_STRING_LENGTH);
	});

	it("passes Team 6 validation for every default scenario, unchanged", () => {
		for (const scenario of buildDefaultScenarios(MOCK_MATCHES, MOCK_USER_SKILLS)) {
			const matches = toCareerMatches(
				projectOutcomes(MOCK_MATCHES, scenario, { userSkills: MOCK_USER_SKILLS }),
			);
			const result = validate(matches);
			assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
			assert.deepEqual(result.value.matches, matches);
		}
	});

	it("passes with no matches", () => {
		const result = validate(toCareerMatches([]));
		assert.ok(result.ok);
		assert.deepEqual(result.value.matches, []);
	});

	it("keeps leading zeroes in career IDs", () => {
		const [outcome] = projectOutcomes([plain(50, "00010")], { kind: "add-experience", years: 1 });
		const result = validate(toCareerMatches([outcome]));
		assert.ok(result.ok);
		assert.equal(result.value.matches[0].careerId, "00010");
	});

	it("stays within Team 6's limits instead of failing the whole request", () => {
		const many = Array.from({ length: 600 }, (_, i) =>
			plain(i % 100, String(i).padStart(5, "0")),
		);
		const outcomes = projectOutcomes(many, { kind: "add-experience", years: 1 });
		const longSkill = "x".repeat(600);
		const [longReason] = projectOutcomes([MOCK_MATCHES[1]], { kind: "gain-skill", skill: longSkill }, {
			userSkills: MOCK_USER_SKILLS,
		});
		const blankId: ProjectedOutcome = { ...outcomes[0], careerId: "  " };

		const matches = toCareerMatches([...outcomes, longReason, blankId]);
		const result = validate(matches);
		assert.ok(result.ok, JSON.stringify(!result.ok && result.errors.slice(0, 3)));
		assert.equal(matches.length, MAX_ARRAY_ITEMS);
		assert.ok(matches.every((m) => m.careerId.trim() !== ""));
		// Best scores are kept: the 500 kept are all at least as high as any dropped.
		assert.ok(matches.every((m) => m.score >= matches[matches.length - 1].score));
	});

	it("shortens an over-long reason rather than sending it", () => {
		const [outcome] = projectOutcomes([MOCK_MATCHES[1]], {
			kind: "gain-skill",
			skill: "x".repeat(600),
		}, { userSkills: MOCK_USER_SKILLS });
		const [match] = toCareerMatches([outcome]);
		assert.equal(match.rationale?.[0].length, MAX_STRING_LENGTH);
		assert.ok(validate([match]).ok);
	});
});
