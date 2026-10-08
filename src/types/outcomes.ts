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

export interface UserOutcomeBundle {
	matches: CareerMatch[];
	steps: NextStep[];
	projection?: WageProjection;
}
