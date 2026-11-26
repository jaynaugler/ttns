// Team 5 mock data: a fixed sample of Team 4's matchCareers() output, so the
// Look Forward tests don't depend on the live matcher.
//
// Generated 2026-11-26 from POST /api/match on the dev server (Team 4's
// matchCareers in src/lib/career-data.ts, main at 2be5c01) with
// MOCK_USER_SKILLS, alpha 0.7 and limit 10, keeping the top six. Scores are
// left at full precision, as Team 4 returns them, and each rationale is
// wrapped in an array the way toProjectable() does. Regenerate the same way
// if Team 4's formula changes.

import type { ProjectableMatch } from "@/lib/projection-logic";

export const MOCK_USER_SKILLS: readonly string[] = [
	"Digital Literacy",
	"Numeracy",
	"Problem Solving",
	"Writing",
	"Critical Thinking",
	"Reading Comprehension",
	"Troubleshooting",
];

export const MOCK_MATCHES: readonly ProjectableMatch[] = [
	{
		careerId: "12113",
		score: 58.02197802197802,
		rationale: [
			"You match 6 of 13 listed career skills. 6 of your 7 selected skills are relevant to this occupation. Shared skills include Critical Thinking, Digital Literacy, Numeracy.",
		],
		matchedSkills: [
			"Critical Thinking",
			"Digital Literacy",
			"Numeracy",
			"Problem Solving",
			"Reading Comprehension",
			"Writing",
		],
		missingSkills: [
			"Evaluation",
			"Instructing",
			"Oral Communication: Active Listening",
			"Oral Communication: Oral Comprehension",
			"Oral Communication: Oral Expression",
			"Systems Analysis",
			"Time Management",
		],
	},
	{
		careerId: "12200",
		score: 56.42857142857143,
		rationale: [
			"You match 5 of 10 listed career skills. 5 of your 7 selected skills are relevant to this occupation. Shared skills include Critical Thinking, Numeracy, Problem Solving.",
		],
		matchedSkills: [
			"Critical Thinking",
			"Numeracy",
			"Problem Solving",
			"Reading Comprehension",
			"Writing",
		],
		missingSkills: [
			"Decision Making",
			"Learning and Teaching Strategies",
			"Management of Financial Resources",
			"Monitoring",
			"Oral Communication: Oral Comprehension",
		],
	},
	{
		careerId: "13102",
		score: 54.85714285714286,
		rationale: [
			"You match 3 of 4 listed career skills. 3 of your 7 selected skills are relevant to this occupation. Shared skills include Numeracy, Reading Comprehension, Writing.",
		],
		matchedSkills: ["Numeracy", "Reading Comprehension", "Writing"],
		missingSkills: ["Oral Communication: Oral Comprehension"],
	},
	{
		careerId: "14201",
		score: 54.85714285714286,
		rationale: [
			"You match 3 of 4 listed career skills. 3 of your 7 selected skills are relevant to this occupation. Shared skills include Numeracy, Problem Solving, Writing.",
		],
		matchedSkills: ["Numeracy", "Problem Solving", "Writing"],
		missingSkills: ["Oral Communication: Oral Comprehension"],
	},
	{
		careerId: "21230",
		score: 54.5,
		rationale: [
			"You match 7 of 20 listed career skills. 7 of your 7 selected skills are relevant to this occupation. Shared skills include Critical Thinking, Digital Literacy, Numeracy.",
		],
		matchedSkills: [
			"Critical Thinking",
			"Digital Literacy",
			"Numeracy",
			"Problem Solving",
			"Reading Comprehension",
			"Troubleshooting",
			"Writing",
		],
		missingSkills: [
			"Decision Making",
			"Digital Systems Production",
			"Equipment and Tool Selection",
			"Evaluation",
			"Instructing",
			"Learning and Teaching Strategies",
			"Monitoring",
			"Oral Communication: Active Listening",
			"Oral Communication: Oral Comprehension",
			"Oral Communication: Oral Expression",
			"Persuading",
			"Systems Analysis",
			"Time Management",
		],
	},
	{
		careerId: "12201",
		score: 53.714285714285715,
		rationale: [
			"You match 6 of 15 listed career skills. 6 of your 7 selected skills are relevant to this occupation. Shared skills include Critical Thinking, Digital Literacy, Numeracy.",
		],
		matchedSkills: [
			"Critical Thinking",
			"Digital Literacy",
			"Numeracy",
			"Problem Solving",
			"Reading Comprehension",
			"Writing",
		],
		missingSkills: [
			"Coordinating",
			"Decision Making",
			"Evaluation",
			"Negotiating",
			"Oral Communication: Active Listening",
			"Oral Communication: Oral Comprehension",
			"Oral Communication: Oral Expression",
			"Persuading",
			"Systems Analysis",
		],
	},
];
