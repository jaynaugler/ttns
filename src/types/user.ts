// Defines the profile/skills data shape (Teams 1 and 2)

export type UserId = string;

export interface UserDemographics {
	ageRange?: string;
	location?: string;
	educationLevel?: string;
}

export interface UserSkillInput {
	skillId: string;
	label: string;
	proficiency?: 1 | 2 | 3 | 4 | 5;
}

export interface UserInterestInput {
	interestId: string;
	label: string;
	weight?: 1 | 2 | 3 | 4 | 5;
}

export interface UserProfile {
	id: UserId;
	name?: string;
	demographics?: UserDemographics;
	skills: UserSkillInput[];
	interests: UserInterestInput[];
	goals?: string[];
	createdAtISO?: string;
}
