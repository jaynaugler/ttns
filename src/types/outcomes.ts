// Defines the career/step data shape (Teams 4, 5, and 6)

export interface Career {
	id: string;
	title: string;
	description?: string;
	medianWage?: number;
	growthRatePct?: number;
	requiredEducation?: string;
	tags?: string[];
}

export interface CareerMatch {
	careerId: string;
	score: number;
	rationale?: string[];
}

export interface NextStep {
	id: string;
	title: string;
	description?: string;
	category?: "education" | "credential" | "experience" | "application";
	estimatedWeeks?: number;
	resourceUrl?: string;
}

export interface WageProjection {
	currentWage?: number;
	projectedWage?: number;
	delta?: number;
	periodLabel?: string;
}

export interface OutcomeShift {
	careerId: string;
	currentScore: number;
	projectedScore: number;
	delta: number;
}

export interface UserOutcomeBundle {
	matches: CareerMatch[];
	steps: NextStep[];
	projection?: WageProjection;
}

// Team 5 (Look Forward): a "what if" change the user is considering, and a
// match re-scored under it. Added only; the shared types above are unchanged.

export type ScenarioKind =
	| "gain-skill"
	| "gain-skills"
	| "finish-education"
	| "add-experience"
	| "combined";

// "gain-skill" is one suggested skill; "gain-skills" is the user's own 1 to 3
// picks, projected together. "combined" applies skills, then education, then
// experience, one after another.
export type Scenario =
	| { kind: "gain-skill"; skill: string }
	| { kind: "gain-skills"; skills: string[] }
	| { kind: "finish-education"; step: string }
	| { kind: "add-experience"; years: number }
	| {
			kind: "combined";
			skills: string[];
			step: string;
			years: number;
			// True when `skills` is the recommended skill, before any pick.
			recommended?: boolean;
	  };

// Extends Team 4's CareerMatch, so anything that accepts matches (e.g. Team 6's
// POST /api/steps) also accepts projections. `score` is the projected score;
// `currentScore` is the score before the scenario.
export interface ProjectedOutcome extends CareerMatch {
	// The projected score before rounding to one decimal, so two that round
	// alike still rank in their real order.
	exactScore?: number;
	currentScore: number;
	scenario: Scenario;
	scoreShift: number;
	reason: string;
}
