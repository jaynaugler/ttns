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

// Profile form data, e.g. { personal: { firstName }, skills: { ... } }.
// Matches the groups in src/components/profile-form/profileSteps.js.
type ProfileGroups = Record<string, Record<string, string>>;

export interface StepsRequestInput {
  guestId?: string;
  selectedCareerCode?: string;
  savedMatches?: CareerMatch[];
  savedSkills?: string[];
  profile?: ProfileGroups;
  skillsComplete?: boolean;
}

// The add-skills picks (journey.newSkills) are deliberately NOT included in
// profile.skills: Team 6's gap detection needs them missing to recommend the
// training steps for exactly what the user asked to learn. And the /next-step
// request carries the user's CURRENT persisted matches, not Team 5's
// projections — gap logic keys on today's skills.
export function buildStepsRequest(
  input: StepsRequestInput,
): NextStepsRequest | null {
  if (!input.guestId?.trim() || !input.profile || !input.selectedCareerCode) return null;
  const matches = toStepsMatches(
    (input.savedMatches ?? []).filter((match) => match.code === input.selectedCareerCode),
  );
  if (matches.length === 0) return null;

  const skills: UserSkillInput[] = nonblank([
    ...(input.skillsComplete ? input.savedSkills ?? [] : []),
  ]).map((label) => ({ skillId: `label:${label}`, label }));

  const interests: UserInterestInput[] =
    nonblank([
      input.profile?.interests?.interest1,
      input.profile?.interests?.interest2,
    ]).map((label) => ({ interestId: `free-text:${label}`, label }));

  const firstName = input.profile?.personal?.firstName?.trim() ?? "";
  const lastName = input.profile?.personal?.lastName?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim();

  const profile: UserProfile = {
    id: input.guestId,
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
