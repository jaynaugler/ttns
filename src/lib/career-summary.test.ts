// Team 5 tests for the /next-step career summary.
// Run with `pnpm run test:career-summary` (compiled by
// tsconfig.career-summary-test.json).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CareerMatch } from "@/types/careers";
import type { Scenario } from "@/types/outcomes";
import { toProjectable } from "./match-adapter";
import { formatScore, projectOutcomes } from "./projection-logic";
import {
	buildPlanDocument,
	describePlan,
	getCareerSummary,
	moveImpact,
	planAsText,
	getPathSummary,
	isNocCode,
	isNovaScotiaOutlook,
	jobBankUrl,
	markSkillsForCareer,
	outlookCode,
	parseTrends,
	MAX_NEXT_MOVES,
	planSkills,
	rankByGain,
	rankNextMoves,
	rankSkillsToDevelop,
	recommendedSkill,
	skillGapsFor,
	splitPicks,
	payRange,
	educationPhrase,
	SUMMARY_YEARS,
	type OutlookRecord,
} from "./career-summary";

// A saved match shaped like Team 4's matchCareers() output.
function match(overrides: Partial<CareerMatch> = {}): CareerMatch {
	return {
		code: "21232",
		title: "Software developers and programmers",
		matchPercentage: 79.23076923076923,
		careerSkillCoverage: 60,
		userSkillCoverage: 85.7,
		requiredSkills: ["Digital Literacy", "Problem Solving", "Teamwork"],
		matchedSkills: ["Digital Literacy", "Problem Solving"],
		missingSkills: ["Teamwork"],
		medianWage: 48.08,
		isAnnual: false,
		wageReferencePeriod: "2023-2024",
		outlook: "Good",
		outlookRegion: "Nova Scotia",
		outlookReleaseDate: "2025-11-21",
		rationale: "You match 2 of 3 listed career skills.",
		...overrides,
	};
}

// Trimmed from job_outlook.json (NOC_21232, Nova Scotia), keeping its quirks:
// a list inside a <P>, a nested list, &nbsp; and a <p><br></p> spacer.
const SOFTWARE_TRENDS =
	"<P>The employment outlook will be Good for software developers and programmers (NOC 21232) in Nova Scotia for the 2025-2027 period.</P>" +
	"<P>The following factors contributed to this outlook:</P><UL><LI>Employment growth will lead to several new positions.</LI><LI>A moderate number of positions will become available due to retirements.</LI></UL>" +
	"<p>Much of the work is found in Halifax.</p><p><br></p>" +
	"<P>Here are some key facts about software developers and programmers in Nova Scotia: <UL><LI>Approximately 3,750 people work in this occupation.</LI>" +
	"<LI> Software developers and programmers mainly work in the following sectors: <UL><LI>Computer systems design services (NAICS 5415): 65%</LI><LI>Information&nbsp;and cultural industries (NAICS 51): 6%</LI></UL> </LI></UL></P>";

function outlook(overrides: Partial<OutlookRecord> = {}): OutlookRecord {
	return {
		nocCode: "NOC_21232",
		outlook: "Good",
		employmentTrends: SOFTWARE_TRENDS,
		releaseDate: "2025-11-21",
		province: "NS",
		economicRegionCode: "1200",
		lang: "EN",
		...overrides,
	};
}

describe("jobBankUrl", () => {
	it("searches Job Bank for the NOC group in Nova Scotia", () => {
		assert.equal(
			jobBankUrl("21232"),
			"https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=21232&fprov=NS",
		);
	});

	it("keeps leading zeroes", () => {
		assert.equal(
			jobBankUrl("00010"),
			"https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=00010&fprov=NS",
		);
	});

	it("gives no link for anything but a five-digit NOC code", () => {
		for (const code of ["", "2123", "212320", "NOC_21232", "21232&x=1", " 21232"]) {
			assert.equal(jobBankUrl(code), undefined, code);
		}
		assert.equal(isNocCode(21232), false);
	});
});

describe("outlook records", () => {
	it("counts only Nova Scotia's province-wide English record", () => {
		assert.equal(isNovaScotiaOutlook(outlook()), true);
		assert.equal(isNovaScotiaOutlook(outlook({ economicRegionCode: "1250" })), false);
		assert.equal(isNovaScotiaOutlook(outlook({ province: "NB" })), false);
		assert.equal(isNovaScotiaOutlook(outlook({ lang: "FR" })), false);
	});

	it("strips the NOC_ prefix", () => {
		assert.equal(outlookCode(outlook()), "21232");
	});
});

describe("parseTrends", () => {
	it("turns Job Bank's HTML into paragraphs and lists", () => {
		assert.deepEqual(parseTrends(SOFTWARE_TRENDS), [
			{
				kind: "paragraph",
				text: "The employment outlook will be Good for software developers and programmers (NOC 21232) in Nova Scotia for the 2025-2027 period.",
			},
			{ kind: "paragraph", text: "The following factors contributed to this outlook:" },
			{
				kind: "list",
				items: [
					{ text: "Employment growth will lead to several new positions.", items: [] },
					{ text: "A moderate number of positions will become available due to retirements.", items: [] },
				],
			},
			{ kind: "paragraph", text: "Much of the work is found in Halifax." },
			{
				kind: "paragraph",
				text: "Here are some key facts about software developers and programmers in Nova Scotia:",
			},
			{
				kind: "list",
				items: [
					{ text: "Approximately 3,750 people work in this occupation.", items: [] },
					{
						text: "Software developers and programmers mainly work in the following sectors:",
						items: [
							{ text: "Computer systems design services (NAICS 5415): 65%", items: [] },
							{ text: "Information and cultural industries (NAICS 51): 6%", items: [] },
						],
					},
				],
			},
		]);
	});

	it("keeps the text of inline tags and drops the tags", () => {
		assert.deepEqual(
			parseTrends('<p>See <a href="https://example.com">this <strong>report</strong></a> &amp; more<sup>1</sup>.</p>'),
			[{ kind: "paragraph", text: "See this report & more1." }],
		);
	});

	it("never passes markup through, even escaped", () => {
		const blocks = parseTrends("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p><script>alert(2)</script>");
		assert.deepEqual(blocks, [{ kind: "paragraph", text: "<script>alert(1)</script>" }]);
		// The page renders these as text nodes, so React escapes them.
		assert.equal(typeof (blocks[0] as { text: string }).text, "string");
	});

	it("closes unclosed tags", () => {
		assert.deepEqual(parseTrends("<UL><LI>One<LI>Two"), [
			{ kind: "list", items: [{ text: "One", items: [] }, { text: "Two", items: [] }] },
		]);
	});

	it("drops empty paragraphs and items", () => {
		assert.deepEqual(parseTrends("<p> </p><p>&nbsp;</p><ul><li> </li></ul>"), []);
	});

	it("returns [] for missing or blank trends", () => {
		assert.deepEqual(parseTrends(undefined), []);
		assert.deepEqual(parseTrends(""), []);
		assert.deepEqual(parseTrends(42 as unknown as string), []);
	});
});

describe("getCareerSummary", () => {
	it("summarises a saved match with its Nova Scotia outlook", () => {
		const summary = getCareerSummary("21232", [match()], [outlook()]);
		assert.ok(summary);
		assert.equal(summary.code, "21232");
		assert.equal(summary.title, "Software developers and programmers");
		assert.equal(summary.score, "79.2");
		assert.equal(summary.outlook, "Good");
		assert.equal(summary.outlookReleaseDate, "2025-11-21");
		assert.equal(summary.trends?.length, 6);
		assert.deepEqual(summary.matchedSkills, ["Digital Literacy", "Problem Solving"]);
		assert.deepEqual(summary.skillsToDevelop, ["Teamwork"]);
		assert.equal(
			summary.jobBankUrl,
			"https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=21232&fprov=NS",
		);
	});

	it("gives hourly wages and their yearly figure from wages.json", () => {
		const wages = getCareerSummary("21232", [match()])?.wages;
		assert.deepEqual(wages, {
			startingOut: { hourly: 30, yearly: 58500 },
			typical: { hourly: 48.08, yearly: 93756 },
			topEarners: { hourly: 76.92, yearly: 149994 },
			// At SUMMARY_YEARS (5) the placeholder path reaches the median.
			afterYears: { hourly: 48.08, yearly: 93756 },
			isAnnual: false,
			referencePeriod: "2023-2024",
		});
		assert.equal(SUMMARY_YEARS, 5);
	});

	it("derives an hourly figure for careers paid yearly", () => {
		const wages = getCareerSummary("00010", [])?.wages;
		assert.equal(wages?.isAnnual, true);
		assert.deepEqual(wages?.startingOut, { hourly: 16.85, yearly: 32867 });
		assert.deepEqual(wages?.typical, { hourly: 43.08, yearly: 84000 });
	});

	it("ignores outlooks for other regions and careers", () => {
		const summary = getCareerSummary(
			"21232",
			[match({ outlook: null, outlookReleaseDate: null })],
			[outlook({ economicRegionCode: "1250", outlook: "Very good" }), outlook({ nocCode: "NOC_10010" })],
		);
		assert.equal(summary?.outlook, undefined);
		assert.equal(summary?.trends, undefined);
	});

	it("falls back to the match's outlook label without a record", () => {
		const summary = getCareerSummary("21232", [match()]);
		assert.equal(summary?.outlook, "Good");
		assert.equal(summary?.trends, undefined);
	});

	it("works for a pick that isn't in the saved matches", () => {
		const summary = getCareerSummary("21232", [], [outlook()]);
		assert.equal(summary?.title, "Software developers and programmers");
		assert.equal(summary?.score, undefined);
		assert.equal(summary?.matchedSkills, undefined);
		assert.equal(summary?.skillsToDevelop, undefined);
		assert.equal(summary?.outlook, "Good");
	});

	it("leaves wages undefined when Job Bank publishes none", () => {
		const summary = getCareerSummary("00013", []);
		assert.ok(summary?.title);
		assert.equal(summary?.wages, undefined);
	});

	it("returns undefined for a blank or unknown code", () => {
		assert.equal(getCareerSummary("", [match()]), undefined);
		assert.equal(getCareerSummary("99999", []), undefined);
	});

	it("never throws on corrupt input", () => {
		const corrupt = [null, 7, { code: "21232", matchPercentage: Number.NaN, matchedSkills: "x" }];
		assert.doesNotThrow(() =>
			getCareerSummary(
				"21232",
				corrupt as unknown as CareerMatch[],
				[null, { nocCode: undefined }] as unknown as OutlookRecord[],
			),
		);
		const summary = getCareerSummary("21232", corrupt as unknown as CareerMatch[]);
		assert.equal(summary?.score, undefined);
		assert.equal(summary?.matchedSkills, undefined);
		assert.equal(getCareerSummary(undefined as unknown as string, undefined), undefined);
	});
});

describe("describePlan", () => {
	it("lists each step of Do all three", () => {
		assert.deepEqual(
			describePlan({
				kind: "combined",
				skills: ["Product Design", "Digital Literacy"],
				step: "High School",
				years: 1,
			}),
			["Learn Product Design, Digital Literacy", "Finish High School", "1 year of experience"],
		);
	});

	it("leaves out Learn when Do all three has no skills", () => {
		assert.deepEqual(describePlan({ kind: "combined", skills: [], step: "", years: 2 }), [
			"Finish an education step",
			"2 years of experience",
		]);
	});

	it("describes single changes", () => {
		assert.deepEqual(describePlan({ kind: "gain-skill", skill: "Teamwork" }), ["Learn Teamwork"]);
		assert.deepEqual(describePlan({ kind: "add-experience", years: 3 }), ["3 years of experience"]);
	});
});

describe("getPathSummary", () => {
	const plan: Scenario = { kind: "combined", skills: ["Teamwork"], step: "High School", years: 1 };
	const skills = ["Digital Literacy", "Problem Solving", "Writing"];

	it("re-projects the chosen career with Look Forward's functions", () => {
		const summary = getPathSummary({ scenario: plan, careerCode: "21232" }, [match()], skills);
		assert.ok(summary);
		assert.deepEqual(summary.plan, ["Learn Teamwork", "Finish High School", "1 year of experience"]);
		assert.equal(summary.scoreToday, "79.2");
		const expected = projectOutcomes(toProjectable([match()]), plan, { userSkills: skills })[0];
		assert.equal(summary.scoreAfter, formatScore(expected.score));
		assert.ok(Number(summary.scoreAfter) > Number(summary.scoreToday));
		assert.equal(summary.reason, expected.reason);
	});

	it("estimates the wage after the plan's years", () => {
		const summary = getPathSummary({ scenario: plan, careerCode: "21232" }, [match()], skills);
		assert.equal(summary?.years, 1);
		// 21232: low $30/h, median $48.08/h; a fifth of the way after 1 year.
		assert.deepEqual(summary?.afterYears, { hourly: 33.62, yearly: 65551 });
	});

	it("has no wage estimate without years", () => {
		const summary = getPathSummary(
			{ scenario: { kind: "gain-skill", skill: "Teamwork" }, careerCode: "21232" },
			[match()],
			skills,
		);
		assert.equal(summary?.years, undefined);
		assert.equal(summary?.afterYears, undefined);
	});

	it("is undefined without a choice or when the career isn't a saved match", () => {
		assert.equal(getPathSummary(undefined, [match()], skills), undefined);
		assert.equal(getPathSummary({ scenario: plan, careerCode: "10010" }, [match()], skills), undefined);
		assert.equal(getPathSummary({ scenario: plan, careerCode: "21232" }, undefined, skills), undefined);
	});

	it("never throws on a malformed scenario", () => {
		const broken = { kind: "combined", skills: null, step: 4, years: "x" } as unknown as Scenario;
		assert.doesNotThrow(() => getPathSummary({ scenario: broken, careerCode: "21232" }, [match()], skills));
	});
});

describe("planSkills", () => {
	it("returns the skills a plan learns", () => {
		assert.deepEqual(planSkills({ kind: "combined", skills: ["A", "B"], step: "X", years: 1 }), ["A", "B"]);
		assert.deepEqual(planSkills({ kind: "gain-skill", skill: "A" }), ["A"]);
		assert.deepEqual(planSkills({ kind: "add-experience", years: 2 }), []);
		assert.deepEqual(planSkills(undefined), []);
	});
});

describe("skillGapsFor", () => {
	const lead = match({ code: "21300", missingSkills: ["Design", "Coding", "Welding", "Leading"] });
	const others = [
		match({ code: "21301", missingSkills: ["Coding", "Welding"] }),
		match({ code: "21302", missingSkills: ["Coding"] }),
		match({ code: "21303", missingSkills: [] }),
	];

	it("lists the lead's missing skills, minus the plan's, most needed elsewhere first", () => {
		assert.deepEqual(skillGapsFor("21300", [lead, ...others], ["Design"]), {
			skills: [
				{ skill: "Coding", alsoNeededBy: 2 },
				{ skill: "Welding", alsoNeededBy: 1 },
				{ skill: "Leading", alsoNeededBy: 0 },
			],
			countsVary: true,
			otherMatches: 3,
		});
	});

	it("doesn't count the lead career itself", () => {
		const gaps = skillGapsFor("21300", [lead], []);
		assert.deepEqual(
			gaps.skills.map((gap) => gap.alsoNeededBy),
			[0, 0, 0, 0],
		);
		assert.equal(gaps.otherMatches, 0);
	});

	it("flags counts that are the same for every skill", () => {
		const same = [lead, match({ code: "21301", missingSkills: ["Design", "Coding", "Welding", "Leading"] })];
		assert.equal(skillGapsFor("21300", same).countsVary, false);
	});

	it("is empty when the lead isn't a saved match", () => {
		assert.deepEqual(skillGapsFor("99999", [lead]).skills, []);
		assert.deepEqual(skillGapsFor("21300", undefined).skills, []);
	});
});

describe("plan document", () => {
	const skills = ["Digital Literacy", "Problem Solving", "Writing"];
	const lead = match({ matchPercentage: 0.3 * 40 + 0.7 * (200 / 3) });
	const summary = getCareerSummary("21232", [lead])!;
	const plan: Scenario = { kind: "gain-skill", skill: "Teamwork" };
	const path = getPathSummary({ scenario: plan, careerCode: "21232" }, [lead], skills)!;
	const moves = rankNextMoves({ careerCode: "21232", savedMatches: [lead], userSkills: skills, plan, jobBankUrl: summary.jobBankUrl });
	const doc = buildPlanDocument({
		name: " Test User ",
		date: new Date(2026, 10, 26),
		summary,
		path,
		gaps: ["Leadership"],
		moves,
		updatedPathwaysUrl: "https://example.test/updated-pathways",
	});
	const section = (h: string) => doc.sections.find((s) => s.heading === h)?.items;

	it("has the name, date, career with NOC and the Job Bank link", () => {
		assert.equal(doc.title, "My career plan");
		assert.deepEqual(section("About this plan"), ["Name: Test User", "Date: November 26, 2026"]);
		assert.deepEqual(section("Career"), [
			"Software developers and programmers (NOC 21232)",
			"Nova Scotia job postings: https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=21232&fprov=NS",
		]);
	});

	it("has the plan, the match change, wages, outlook and skills", () => {
		assert.deepEqual(section("The plan"), ["Learn Teamwork"]);
		assert.match(section("Match")![0], /^58\.7 → 70\.5 out of 100 after this plan$/);
		assert.deepEqual(section("Wages (Job Bank)"), [
			"Starting out: $58,500 a year",
			"Typical (median): $93,756 a year",
			"Top earners: $149,994 a year",
			"Reference period: 2023-2024",
		]);
		// The pay chart's figures are the Wages section's; not repeated.
		assert.equal(section("Wage growth (a rough guide)"), undefined);
		assert.deepEqual(section("Nova Scotia outlook"), ["Good (published 2025-11-21)"]);
		assert.deepEqual(section("Skills to build"), ["Leadership"]);
	});

	it("lists the next moves with full links", () => {
		const items = section("Next moves")!;
		assert.equal(items.length, moves.length);
		assert.match(items[0], /^1\. Learn Teamwork · Match 58\.7 → 70\.5, up 11\.8 · https:\/\/example\.test\/updated-pathways$/);
		assert.match(items.at(-1)!, /Search Nova Scotia job postings · https:\/\/www\.jobbank\.gc\.ca\/jobsearch\/jobsearch\?searchstring=21232&fprov=NS$/);
	});

	it("says so when there's no plan, and leaves out a blank name", () => {
		const bare = buildPlanDocument({ date: new Date(2026, 0, 2), summary, gaps: [], moves: [] });
		assert.deepEqual(bare.sections.find((s) => s.heading === "The plan")?.items, [
			"No plan chosen yet. Try changes on Updated Pathways.",
		]);
		assert.deepEqual(bare.sections.find((s) => s.heading === "About this plan")?.items, ["Date: January 2, 2026"]);
		assert.equal(bare.sections.find((s) => s.heading === "Next moves"), undefined);
	});

	it("copies as plain text with headings and bullet items", () => {
		const text = planAsText(doc);
		assert.match(text, /^My career plan\n\nAbout this plan\n- Name: Test User\n- Date: November 26, 2026\n/);
		assert.match(text, /\nSkills to build\n- Leadership\n/);
		assert.match(text, /Estimates only: wages and match scores are a rough guide\.$/);
	});
});

describe("moveImpact", () => {
	it("words the match change and the wage climb", () => {
		assert.deepEqual(moveImpact({ kind: "skill", title: "x", why: "y", scoreToday: "78", scoreAfter: "84", gain: 6 }), [
			"Match 78 → 84, up 6",
		]);
		assert.deepEqual(moveImpact({ kind: "plan", title: "x", why: "y", scoreToday: "79.2", scoreAfter: "79.2", gain: 0 }), [
			"Match 79.2, no change from this plan",
		]);
		assert.deepEqual(
			moveImpact({ kind: "experience", title: "x", why: "y", scoreToday: "1", scoreAfter: "2", gain: 1, wageNow: 58500, wageAfter: 65551 }),
			["Match 1 → 2, up 1", "Starting wage $58,500 → about $65,551 a year after 1 year"],
		);
		assert.deepEqual(moveImpact({ kind: "job-search", title: "x", why: "y" }), []);
	});
});

describe("educationPhrase", () => {
	it("reads naturally after \"finishing\"", () => {
		assert.equal(educationPhrase("College diploma"), "a college diploma");
		assert.equal(educationPhrase("High School"), "high school");
		assert.equal(educationPhrase("electrician apprenticeship"), "an electrician apprenticeship");
		assert.equal(educationPhrase("a diploma or certificate"), "a diploma or certificate");
		// Capitals inside may be a proper name, so they stay.
		assert.equal(educationPhrase("Bachelor of Science"), "a Bachelor of Science");
		assert.equal(educationPhrase("  "), "the education step");
	});
});

describe("payRange", () => {
	it("gives Job Bank's 10th percentile, median and 90th percentile", () => {
		// 21232: $30 / $48.08 / $76.92 an hour, at 1950 hours a year.
		assert.deepEqual(payRange("21232"), [
			{ label: "Starting out", note: "10th percentile", annual: 58500 },
			{ label: "Typical", note: "median", annual: 93756 },
			{ label: "Top earners", note: "90th percentile", annual: 149994 },
		]);
	});

	it("is empty without a published range", () => {
		assert.deepEqual(payRange("00013"), []);
		assert.deepEqual(payRange("99999"), []);
	});
});

describe("recommendedSkill", () => {
	it("finds the recommended skill a plan learns, not the user's own picks", () => {
		assert.equal(recommendedSkill({ kind: "gain-skill", skill: "Critical Thinking" }), "Critical Thinking");
		assert.equal(
			recommendedSkill({ kind: "combined", skills: ["Evaluation"], step: "X", years: 1, recommended: true }),
			"Evaluation",
		);
		assert.equal(
			recommendedSkill({ kind: "combined", skills: ["Evaluation"], step: "X", years: 1, recommended: false }),
			undefined,
		);
		assert.equal(recommendedSkill({ kind: "gain-skills", skills: ["A"] }), undefined);
		assert.equal(recommendedSkill(undefined), undefined);
	});
});

describe("rankByGain", () => {
	it("drops zero gain and keeps ties in their order", () => {
		const moves = [
			{ id: "a", gain: 2 },
			{ id: "b", gain: 0 },
			{ id: "c", gain: 5 },
			{ id: "d", gain: 2 },
			{ id: "e" },
		];
		assert.deepEqual(
			rankByGain(moves).map((move) => move.id),
			["c", "a", "d"],
		);
	});
});

describe("rankNextMoves", () => {
	const skills = ["Digital Literacy", "Problem Solving", "Writing"];
	const url = "https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=21232&fprov=NS";
	const others = [
		match({ code: "21231", missingSkills: ["Teamwork", "Leadership"] }),
		match({ code: "21233", missingSkills: ["Teamwork"] }),
	];
	const kinds = (moves: { kind: string }[]) => moves.map((move) => move.kind);
	// The lead scored with Team 4's formula at its 0.3 weight, so a re-scored
	// skill compares like for like: 2 of 3 career skills, 3 selected.
	const lead = match({ matchPercentage: 0.3 * 40 + 0.7 * (200 / 3) });

	it("puts the plan first, with its real match change", () => {
		const plan: Scenario = { kind: "gain-skill", skill: "Teamwork" };
		const moves = rankNextMoves({
			careerCode: "21232",
			savedMatches: [match(), ...others],
			userSkills: skills,
			plan,
			jobBankUrl: url,
		});
		assert.equal(moves[0].kind, "plan");
		const expected = projectOutcomes(toProjectable([match(), ...others]), plan, {
			userSkills: skills,
		}).find((outcome) => outcome.careerId === "21232")!;
		assert.equal(moves[0].scoreToday, formatScore(expected.currentScore));
		assert.equal(moves[0].scoreAfter, formatScore(expected.score));
		assert.equal(moves[0].gain, expected.scoreShift);
		// The plan's skill isn't offered again.
		assert.ok(!moves.some((move) => move.kind === "skill"));
		assert.equal(moves[moves.length - 1].kind, "job-search");
	});

	it("says where the plan's gain comes from when its skills don't count", () => {
		const plan: Scenario = { kind: "combined", skills: ["Underwater Welding"], step: "High School", years: 2 };
		const [card] = rankNextMoves({ careerCode: "21232", savedMatches: [match(), ...others], userSkills: skills, plan });
		const parts = card.why.match(/finishing high school adds ([\d.]+) and 2 years of experience add ([\d.]+)\.$/);
		assert.ok(parts, card.why);
		assert.match(card.why, /Its skill isn't listed for this career/);
		// The two parts add up to the plan's change.
		assert.ok(Math.abs(Number(parts[1]) + Number(parts[2]) - card.gain!) < 0.11);

		const counted: Scenario = { ...plan, skills: ["Teamwork"] };
		const [usual] = rankNextMoves({ careerCode: "21232", savedMatches: [match({ missingSkills: ["Teamwork"] }), ...others], userSkills: skills, plan: counted });
		assert.equal(usual.why, "The path you chose on Updated Pathways.");
	});

	it("leaves out changes the plan already covers", () => {
		const plan: Scenario = { kind: "combined", skills: ["Teamwork"], step: "High School", years: 1 };
		const moves = rankNextMoves({
			careerCode: "21232",
			savedMatches: [match(), ...others],
			userSkills: skills,
			plan,
			jobBankUrl: url,
		});
		assert.deepEqual(kinds(moves), ["plan", "job-search"]);
	});

	it("ranks the other changes by match gain", () => {
		const moves = rankNextMoves({
			careerCode: "21232",
			savedMatches: [lead, ...others],
			userSkills: skills,
			degree: "High School",
		});
		const gains = moves.map((move) => move.gain ?? 0);
		assert.deepEqual(gains, [...gains].sort((a, b) => b - a));
		assert.ok(gains.every((gain) => gain > 0));
		assert.deepEqual([...kinds(moves)].sort(), ["education", "experience", "skill"]);
		assert.equal(moves.find((move) => move.kind === "education")?.title, "Finish High School");
		assert.equal(
			moves.find((move) => move.kind === "skill")?.why,
			"This career lists it, and so do 2 of your other matches.",
		);
	});

	it("shows the starting wage now and after a year on the experience card", () => {
		const experience = rankNextMoves({
			careerCode: "21232",
			savedMatches: [match()],
			userSkills: skills,
		}).find((move) => move.kind === "experience");
		// 21232: $30/h starting (58,500 a year); a fifth of the way to the
		// $48.08 median after a year.
		assert.equal(experience?.wageNow, 58500);
		assert.equal(experience?.wageAfter, 65551);
	});

	it("drops changes with no gain, but keeps a plan with none", () => {
		const full = match({ matchPercentage: 100, missingSkills: [] });
		const moves = rankNextMoves({
			careerCode: "21232",
			savedMatches: [full],
			userSkills: skills,
			plan: { kind: "add-experience", years: 1 },
			jobBankUrl: url,
		});
		assert.deepEqual(kinds(moves), ["plan", "job-search"]);
		assert.equal(moves[0].gain, 0);
	});

	it("keeps at most 4, trimming the ranked changes, not the plan or job search", () => {
		const input = {
			careerCode: "21232",
			savedMatches: [lead, ...others],
			userSkills: skills,
		};
		// Three changes raise this match, so with a plan and the job search
		// there are five candidates.
		assert.equal(rankNextMoves(input).length, 3);
		const moves = rankNextMoves({
			...input,
			savedMatches: [lead, ...others],
			userSkills: skills,
			// A plan with a skill this career doesn't list: shown, no gain.
			plan: { kind: "gain-skill", skill: "Welding" },
			jobBankUrl: url,
		});
		assert.equal(moves.length, MAX_NEXT_MOVES);
		assert.equal(moves[0].kind, "plan");
		assert.equal(moves[3].kind, "job-search");
		const ranked = moves.slice(1, 3).map((move) => move.gain ?? 0);
		assert.ok(ranked[0] >= ranked[1]);
	});

	it("is empty when the career isn't a saved match", () => {
		assert.deepEqual(
			rankNextMoves({ careerCode: "10010", savedMatches: [match()], userSkills: skills, jobBankUrl: url }),
			[],
		);
		assert.deepEqual(rankNextMoves({ careerCode: "21232", savedMatches: undefined, userSkills: skills }), []);
	});
});

describe("splitPicks", () => {
	it("keeps picks in the saved matches, in pick order, and lists the rest", () => {
		const saved = [match({ code: "21300" }), match({ code: "21301" })];
		assert.deepEqual(splitPicks(["92013", "21301", "21300"], saved), {
			current: ["21301", "21300"],
			stale: ["92013"],
		});
	});

	it("treats every pick as stale with no saved matches", () => {
		assert.deepEqual(splitPicks(["21300"], undefined), { current: [], stale: ["21300"] });
	});

	it("ignores repeats, non-codes and corrupt input", () => {
		assert.deepEqual(
			splitPicks(["21300", "21300", "x", 7 as unknown as string], [
				null as unknown as CareerMatch,
				match({ code: "21300" }),
			]),
			{ current: ["21300"], stale: [] },
		);
		assert.deepEqual(splitPicks(undefined, undefined), { current: [], stale: [] });
	});
});

describe("rankSkillsToDevelop", () => {
	it("puts the gap common to most matches first, then A to Z", () => {
		const counts = new Map([
			["Teamwork", 3],
			["Leadership", 1],
			["Coding", 3],
		]);
		assert.deepEqual(rankSkillsToDevelop(["Leadership", "Teamwork", "Welding", "Coding"], counts), [
			{ skill: "Coding", missingFrom: 3 },
			{ skill: "Teamwork", missingFrom: 3 },
			{ skill: "Leadership", missingFrom: 1 },
			{ skill: "Welding", missingFrom: 0 },
		]);
	});

	it("handles missing skills or counts", () => {
		assert.deepEqual(rankSkillsToDevelop(undefined, new Map()), []);
		assert.deepEqual(rankSkillsToDevelop(["B", "A", "A"], undefined), [
			{ skill: "A", missingFrom: 0 },
			{ skill: "B", missingFrom: 0 },
		]);
	});
});

describe("markSkillsForCareer", () => {
	it("marks each skill the career uses, matched or to develop", () => {
		const summary = getCareerSummary("21232", [match()]);
		assert.deepEqual(markSkillsForCareer(["Teamwork", "Welding", "Problem Solving"], summary), [
			{ skill: "Teamwork", used: true },
			{ skill: "Welding", used: false },
			{ skill: "Problem Solving", used: true },
		]);
	});

	it("keeps at most three, without repeats or blanks", () => {
		assert.deepEqual(
			markSkillsForCareer(["A", "A", " ", "B", "C", "D"], undefined).map((item) => item.skill),
			["A", "B", "C"],
		);
	});

	it("returns [] with no skills", () => {
		assert.deepEqual(markSkillsForCareer(undefined, undefined), []);
	});
});
