export type Skill = string;

export interface Occupation {
  code: string;
  title: string;
}

export interface SkillToOccupation {
  code: string;
  title: string;
  skills: string[];
}

export interface CareerMatch {
  code: string;
  title: string;

  matchPercentage: number;
  careerSkillCoverage: number;
  userSkillCoverage: number;

  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];

  medianWage: number | null;
  isAnnual: boolean | null;
  wageReferencePeriod: string | null;

  outlook: string | null;
  outlookRegion: string | null;
  outlookReleaseDate: string | null;

  rationale: string;
}

export interface MatchRequest {
  skills: string[];
  alpha?: number;
  // Outlook/wage data is Nova Scotia-only right now; if regional support
  // arrives, add the field back with route validation.
}

export interface MatchResponse {
  results: CareerMatch[];
}
