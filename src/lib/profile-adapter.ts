// Builds Team 6's POST /api/steps request from the persisted journey state.
// src/lib/next-steps/README.md names this the consumer-side integration
// layer: Team 6's backend stays untouched. Pure: no React, no storage.

import { toStepsMatches } from "@/lib/match-adapter";
import type { CareerMatch } from "@/types/careers";
import type { NextStepsRequest } from "@/lib/next-steps-types";
import type {
  UserInterestInput,
  UserProfile,
  UserSkillInput,
} from "@/types/user";

// The journey state models no user identity; a stable constant keeps this to
// zero new state. The README leaves identity unresolved — flagged for Team 6
// sign-off alongside skillId = label below.
const STEPS_USER_ID = "ttns-journey-user";

// Profile form data, e.g. { personal: { firstName }, skills: { ... } }.
// Matches the groups in src/components/profile-form/profileSteps.js.
type ProfileGroups = Record<string, Record<string, string>>;

export interface StepsRequestInput {
  savedMatches?: CareerMatch[];
  savedSkills?: string[];
  profile?: ProfileGroups;
}

// The /new-skill picks are deliberately NOT included in profile.skills:
// Team 6's gap detection needs them missing to recommend the training steps
// for exactly what the user asked to learn. And the /next-step request
// carries the user's CURRENT persisted matches, not Team 5's projections —
// gap logic keys on today's skills.
export function buildStepsRequest(
  input: StepsRequestInput,
): NextStepsRequest | null {
  const matches = toStepsMatches(input.savedMatches ?? []);
  if (matches.length === 0) return null;

  const skills: UserSkillInput[] = nonblank([
    ...(input.savedSkills ?? []),
  ]).map((label) => ({ skillId: label, label }));

  const interests: UserInterestInput[] =
    nonblank([
      input.profile?.interests?.interest1,
      input.profile?.interests?.interest2,
    ]).map((label) => ({ interestId: label, label }));

  const firstName = input.profile?.personal?.firstName?.trim() ?? "";
  const lastName = input.profile?.personal?.lastName?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim();

  const profile: UserProfile = {
    id: STEPS_USER_ID,
    ...(name !== "" ? { name } : {}),
    skills,
    interests,
  };

  return { matches, profile };
}

function nonblank(labels: Iterable<string | undefined>): string[] {
  return [...labels]
    .map((label) => label?.trim() ?? "")
    .filter((label) => label !== "");
}
