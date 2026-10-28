// Team 4 algorithm for career matches
//
// Takes the skills a user picked and scores every occupation against them.
// The scoring formula and the idea of a weight slider (alpha) come from
// Doan's "Career Matching System" design doc.
//
// Output uses the shared CareerMatch shape from src/types/outcomes.ts
// (careerId, score, rationale), plus two extra lists the cards need:
// matchedSkills and missingSkills. Extra fields are safe for other teams,
// Team 6's request validation ignores fields it does not know.
//
// Job titles and wages are NOT returned here. The page looks them up in
// src/data/careers.json using careerId.

import type { CareerMatch } from "@/types/outcomes";
import skillToOccupation from "../../public/data/skillToOccupation.json";

export interface ScoredCareerMatch extends CareerMatch {
  matchedSkills: string[];
  missingSkills: string[];
}

export interface MatchOptions {
  // Balance between the two coverage numbers, from 0 to 1.
  // 1 = only "how much of the job's skills do I have".
  // 0 = only "how many of my skills does this job use".
  alpha?: number;
  // How many matches to return, best first.
  limit?: number;
}

export const DEFAULT_ALPHA = 0.7;
export const DEFAULT_LIMIT = 10;

interface OccupationSkills {
  code: string;
  title: string;
  skills: string[];
}

const occupations: OccupationSkills[] = skillToOccupation;

// Keep the weight between 0 and 1, and fall back to the default
// if it is missing or not a real number.
function cleanAlpha(alpha: number | undefined): number {
  if (alpha === undefined || !Number.isFinite(alpha)) return DEFAULT_ALPHA;
  return Math.max(0, Math.min(1, alpha));
}

// Round to one decimal place, e.g. 52.0 or 66.7.
function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

// Score one occupation. Returns null when there is nothing to score.
export function scoreOccupation(
  userSkills: string[],
  careerSkills: string[],
  alpha: number = DEFAULT_ALPHA,
): ScoredCareerMatch | null {
  const user = new Set(userSkills);
  const career = new Set(careerSkills);

  // Nothing to compare: the user picked nothing, or the job lists no skills.
  if (user.size === 0 || career.size === 0) return null;

  const matchedSkills = [...career].filter((skill) => user.has(skill));
  const missingSkills = [...career].filter((skill) => !user.has(skill));

  // No overlap at all, so this job is not a match.
  if (matchedSkills.length === 0) return null;

  // C: of the skills this job uses, how many does the user have? (0 to 100)
  const careerCoverage = (matchedSkills.length / career.size) * 100;
  // U: of the skills the user picked, how many does this job use? (0 to 100)
  const userCoverage = (matchedSkills.length / user.size) * 100;

  const weight = cleanAlpha(alpha);
  // S = alpha x C + (1 - alpha) x U
  const score = weight * careerCoverage + (1 - weight) * userCoverage;

  const examples = matchedSkills.slice(0, 3).join(", ");

  return {
    careerId: "", // filled in by matchCareers
    score: roundScore(score),
    rationale: [
      `You have ${matchedSkills.length} of the ${career.size} skills this career uses.`,
      `${matchedSkills.length} of your ${user.size} selected skills are relevant to it.`,
      `Shared skills include ${examples}.`,
    ],
    matchedSkills,
    missingSkills,
  };
}

// Score every occupation, sort best first, and return the top matches.
export function matchCareers(
  userSkills: string[],
  options: MatchOptions = {},
): ScoredCareerMatch[] {
  const selected = [...new Set(userSkills)];
  if (selected.length === 0) return [];

  const alpha = cleanAlpha(options.alpha);
  const limit =
    options.limit !== undefined && Number.isInteger(options.limit) && options.limit > 0
      ? options.limit
      : DEFAULT_LIMIT;

  const results: ScoredCareerMatch[] = [];

  for (const occupation of occupations) {
    const scored = scoreOccupation(selected, occupation.skills, alpha);
    if (scored) results.push({ ...scored, careerId: occupation.code });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedSkills.length - a.matchedSkills.length ||
        a.careerId.localeCompare(b.careerId),
    )
    .slice(0, limit);
}
