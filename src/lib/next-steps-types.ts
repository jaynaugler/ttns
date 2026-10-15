// Team 6 (Next Step Generation): request, response, dataset and result types.
//
// Shared interfaces (CareerMatch, NextStep, UserProfile) are imported from
// src/types and are NOT redefined here. Only Team 6-specific types live below.

import type { CareerMatch, NextStep } from "@/types/outcomes";
import type { UserProfile } from "@/types/user";

// ---------------------------------------------------------------------------
// Categories (derived from the shared NextStep interface)
// ---------------------------------------------------------------------------

export type NextStepCategory = NonNullable<NextStep["category"]>;

// Record<NextStepCategory, true> makes this list exhaustive at compile time:
// if the shared union gains a category, this file stops compiling until updated.
const CATEGORY_LOOKUP: Record<NextStepCategory, true> = {
  education: true,
  credential: true,
  experience: true,
  application: true,
};

export const NEXT_STEP_CATEGORIES = Object.keys(
  CATEGORY_LOOKUP,
) as readonly NextStepCategory[];

export function isNextStepCategory(value: unknown): value is NextStepCategory {
  return typeof value === "string" && Object.hasOwn(CATEGORY_LOOKUP, value);
}

// ---------------------------------------------------------------------------
// API contract: POST /api/steps
// ---------------------------------------------------------------------------

/** Request body. `matches` comes from Team 4; `profile` from Teams 1 and 2. */
export interface NextStepsRequest {
  matches: CareerMatch[];
  profile: UserProfile;
}

/** 200 response. Matches `UserOutcomeBundle["steps"]`. */
export interface NextStepsResponse {
  steps: NextStep[];
}

/** 400 / 500 response. Never contains stack traces or internal details. */
export interface NextStepsErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Data source: src/data/education-steps.json
// ---------------------------------------------------------------------------

/** A skill the user must have (optionally at a minimum proficiency). */
export interface SkillRequirement {
  /** Compared against the user's skillId and label after normalization. */
  skill: string;
  minProficiency?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Describes which gap a step closes. A step with `closesGap` is recommended
 * only when at least one condition is *confirmed* as a gap from data the user
 * actually provided. Conditions that cannot be evaluated are ignored.
 */
export interface StepGapCondition {
  /** Gap if the user lacks any listed skill (or has it below minProficiency). */
  missingSkills?: SkillRequirement[];
  /**
   * Levels that make this step unnecessary. Gap if the user's educationLevel
   * is known and is not one of these (after normalization).
   */
  educationLevelNotIn?: string[];
}

/** One record in education-steps.json. */
export interface EducationStepRecord {
  /** Unique within the dataset. Becomes NextStep.id. */
  id: string;
  title: string;
  category: NextStepCategory;
  /** Career ids (exactly as Team 4 emits them) this step supports. */
  careerIds: string[];
  description?: string;
  estimatedWeeks?: number;
  resourceUrl?: string;
  /** Explicit ordering hint: lower value = earlier. Non-negative integer. */
  priority?: number;
  /** Steps that should be listed before this one (when both are recommended). */
  prerequisiteStepIds?: string[];
  /** Records sharing a dedupeKey are the same action; only one is returned. */
  dedupeKey?: string;
  /** Omit for a generic step that applies to any matched career. */
  closesGap?: StepGapCondition;
}

export interface EducationStepDataset {
  steps: EducationStepRecord[];
}

// ---------------------------------------------------------------------------
// Validation results
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export type DatasetLoadResult =
  | { ok: true; dataset: EducationStepDataset; isEmpty: boolean }
  | { ok: false; errors: string[] };
