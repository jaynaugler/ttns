// Adapters between Team 4's CareerMatch shape (src/types/careers.ts) and the
// shared shapes Teams 5 and 6 consume (src/types/outcomes.ts), plus the
// missing-skill counter ("why it matters" for a skill to learn — its last
// consumer was the removed /new-skill page; it stays until the redesigned
// add-skills flow needs it again).
// Pure: no React, no storage, no imports from "server-only" modules.

import type { CareerMatch as TeamFourMatch } from "@/types/careers";
import type { CareerMatch as SharedCareerMatch } from "@/types/outcomes";
import type { ProjectableMatch } from "@/lib/projection-logic";

// Mirror of next-steps-validation.ts's caps (STEPS_API_MAX_ITEMS/_TEXT in
// projection-logic.ts), kept here for the same reason: one bad match fails
// Team 6's whole request, and the client must stay within the limits without
// importing the validator.
const STEPS_API_MAX_ITEMS = 500;
const STEPS_API_MAX_TEXT = 500;

function fitText(text: string): string {
  return text.length <= STEPS_API_MAX_TEXT
    ? text
    : `${text.slice(0, STEPS_API_MAX_TEXT - 1)}…`;
}

// Rationale lines for Team 5/6: Team 4 emits a single reason string, the
// shared shape wants an array. Defensible against corrupt persisted data by
// falling back to empty arrays.
function toRationale(match: TeamFourMatch): string[] {
  return match.rationale ? [fitText(match.rationale)] : [];
}

// For Team 5's Look Forward (ProjectableMatch = CareerMatch & skill
// breakdowns). Persisted NOC codes map to careerId 1:1 (both zero-padded).
export function toProjectable(
  matches: readonly TeamFourMatch[],
): ProjectableMatch[] {
  return matches.map((match) => ({
    careerId: match.code,
    score: match.matchPercentage,
    rationale: toRationale(match),
    matchedSkills: match.matchedSkills ?? [],
    missingSkills: match.missingSkills ?? [],
  }));
}

// For POST /api/steps as `matches`: plain shared CareerMatch objects.
export function toStepsMatches(
  matches: readonly TeamFourMatch[],
): SharedCareerMatch[] {
  return matches
    .slice(0, STEPS_API_MAX_ITEMS)
    .map((match) => ({
      careerId: match.code,
      score: match.matchPercentage,
      rationale: toRationale(match),
    }));
}

// How many of the matches list each skill as missing. Last used by the
// removed /new-skill picker to badge each option with why a skill matters;
// exported for the redesigned add-skills flow.
export function missingSkillCounts(
  matches: readonly TeamFourMatch[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of matches) {
    for (const skill of new Set(match.missingSkills ?? [])) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }
  return counts;
}
