// Team 6 (Next Step Generation): input, dataset and output validation.
//
// Native TypeScript only (no validation library). Every validator returns a
// result object instead of throwing, and error messages name the offending
// field path without echoing user-supplied values or internal details.

import type { CareerMatch, NextStep } from "@/types/outcomes";
import type {
  UserDemographics,
  UserInterestInput,
  UserProfile,
  UserSkillInput,
} from "@/types/user";
import {
  isNextStepCategory,
  type DatasetLoadResult,
  type EducationStepRecord,
  type NextStepsRequest,
  type SkillRequirement,
  type StepGapCondition,
  type ValidationResult,
} from "./next-steps-types";

// Defensive bounds. They are not part of the shared contract; they only stop
// absurdly large payloads from consuming resources.
export const MAX_ARRAY_ITEMS = 500;
export const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_URL_LENGTH = 2048;

type JsonObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Low-level readers. Each pushes a message to `issues` and returns undefined
// when the field is absent (optional) or invalid.
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldPath(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

function getField(obj: JsonObject, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

interface StringOptions {
  required?: boolean;
  nonBlank?: boolean;
  max?: number;
}

function readString(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
  options: StringOptions = {},
): string | undefined {
  const label = fieldPath(path, key);
  const value = getField(obj, key);
  if (value === undefined) {
    if (options.required) issues.push(`${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string") {
    issues.push(`${label} must be a string.`);
    return undefined;
  }
  if (value.length > (options.max ?? MAX_STRING_LENGTH)) {
    issues.push(`${label} is too long.`);
    return undefined;
  }
  if (options.nonBlank && value.trim() === "") {
    issues.push(`${label} must not be blank.`);
    return undefined;
  }
  return value;
}

function readArray(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
  options: { required?: boolean; nonEmpty?: boolean; max?: number } = {},
): unknown[] | undefined {
  const label = fieldPath(path, key);
  const value = getField(obj, key);
  if (value === undefined) {
    if (options.required) issues.push(`${label} is required.`);
    return undefined;
  }
  if (!Array.isArray(value)) {
    issues.push(`${label} must be an array.`);
    return undefined;
  }
  if (value.length > (options.max ?? MAX_ARRAY_ITEMS)) {
    issues.push(`${label} has too many items.`);
    return undefined;
  }
  if (options.nonEmpty && value.length === 0) {
    issues.push(`${label} must not be empty.`);
    return undefined;
  }
  return value;
}

function readObject(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
  required = false,
): JsonObject | undefined {
  const label = fieldPath(path, key);
  const value = getField(obj, key);
  if (value === undefined) {
    if (required) issues.push(`${label} is required.`);
    return undefined;
  }
  if (!isObject(value)) {
    issues.push(`${label} must be an object.`);
    return undefined;
  }
  return value;
}

function readNumber(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
  options: { required?: boolean; min?: number; integer?: boolean; max?: number } = {},
): number | undefined {
  const label = fieldPath(path, key);
  const value = getField(obj, key);
  if (value === undefined) {
    if (options.required) issues.push(`${label} is required.`);
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${label} must be a finite number.`);
    return undefined;
  }
  if (options.integer && !Number.isInteger(value)) {
    issues.push(`${label} must be an integer.`);
    return undefined;
  }
  if (options.min !== undefined && value < options.min) {
    issues.push(`${label} must be at least ${options.min}.`);
    return undefined;
  }
  if (options.max !== undefined && value > options.max) {
    issues.push(`${label} must be at most ${options.max}.`);
    return undefined;
  }
  return value;
}

function readStringArray(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
  options: { required?: boolean; nonEmpty?: boolean; nonBlank?: boolean } = {},
): string[] | undefined {
  const items = readArray(obj, key, path, issues, options);
  if (!items) return undefined;
  const label = fieldPath(path, key);
  const result: string[] = [];
  items.forEach((item, index) => {
    if (typeof item !== "string") {
      issues.push(`${label}[${index}] must be a string.`);
    } else if (item.length > MAX_STRING_LENGTH) {
      issues.push(`${label}[${index}] is too long.`);
    } else if (options.nonBlank && item.trim() === "") {
      issues.push(`${label}[${index}] must not be blank.`);
    } else {
      result.push(item);
    }
  });
  return result;
}

function rejectUnknownKeys(
  obj: JsonObject,
  allowed: readonly string[],
  path: string,
  issues: string[],
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      issues.push(`${fieldPath(path, key)} is not a recognized field.`);
    }
  }
}

export function isHttpUrl(value: string): boolean {
  if (value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function readHttpUrl(
  obj: JsonObject,
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const value = readString(obj, key, path, issues, { max: MAX_URL_LENGTH });
  if (value === undefined) return undefined;
  if (!isHttpUrl(value)) {
    issues.push(`${fieldPath(path, key)} must be a valid http or https URL.`);
    return undefined;
  }
  return value;
}

function fail<T>(errors: string[]): ValidationResult<T> {
  return { ok: false, errors };
}

// ---------------------------------------------------------------------------
// Request validation (matches + profile)
//
// Unknown extra fields are ignored (not copied) so that other teams can extend
// their own types without breaking Team 6. Known fields must be well-typed.
// ---------------------------------------------------------------------------

function parseMatch(
  item: unknown,
  path: string,
  issues: string[],
): CareerMatch | undefined {
  if (!isObject(item)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  const before = issues.length;
  const careerId = readString(item, "careerId", path, issues, {
    required: true,
    nonBlank: true,
  });
  // The shared contract only says `score: number`; no range is documented,
  // so only finiteness is enforced.
  const score = readNumber(item, "score", path, issues, { required: true });
  const rationale = readStringArray(item, "rationale", path, issues);
  if (issues.length > before || careerId === undefined || score === undefined) {
    return undefined;
  }
  const match: CareerMatch = { careerId, score };
  if (rationale !== undefined) match.rationale = rationale;
  return match;
}

function parseSkill(
  item: unknown,
  path: string,
  issues: string[],
): UserSkillInput | undefined {
  if (!isObject(item)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  const before = issues.length;
  const skillId = readString(item, "skillId", path, issues, {
    required: true,
    nonBlank: true,
  });
  const label = readString(item, "label", path, issues, { required: true });
  const proficiency = readNumber(item, "proficiency", path, issues, {
    integer: true,
    min: 1,
    max: 5,
  });
  if (issues.length > before || skillId === undefined || label === undefined) {
    return undefined;
  }
  const skill: UserSkillInput = { skillId, label };
  if (proficiency !== undefined) {
    skill.proficiency = proficiency as NonNullable<UserSkillInput["proficiency"]>;
  }
  return skill;
}

function parseInterest(
  item: unknown,
  path: string,
  issues: string[],
): UserInterestInput | undefined {
  if (!isObject(item)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  const before = issues.length;
  const interestId = readString(item, "interestId", path, issues, {
    required: true,
    nonBlank: true,
  });
  const label = readString(item, "label", path, issues, { required: true });
  const weight = readNumber(item, "weight", path, issues, {
    integer: true,
    min: 1,
    max: 5,
  });
  if (issues.length > before || interestId === undefined || label === undefined) {
    return undefined;
  }
  const interest: UserInterestInput = { interestId, label };
  if (weight !== undefined) {
    interest.weight = weight as NonNullable<UserInterestInput["weight"]>;
  }
  return interest;
}

function parseDemographics(
  obj: JsonObject,
  path: string,
  issues: string[],
): UserDemographics {
  const result: UserDemographics = {};
  const ageRange = readString(obj, "ageRange", path, issues);
  const location = readString(obj, "location", path, issues);
  const educationLevel = readString(obj, "educationLevel", path, issues);
  if (ageRange !== undefined) result.ageRange = ageRange;
  if (location !== undefined) result.location = location;
  if (educationLevel !== undefined) result.educationLevel = educationLevel;
  return result;
}

function parseProfile(
  obj: JsonObject,
  path: string,
  issues: string[],
): UserProfile | undefined {
  const before = issues.length;
  const id = readString(obj, "id", path, issues, { required: true, nonBlank: true });
  const name = readString(obj, "name", path, issues);
  const createdAtISO = readString(obj, "createdAtISO", path, issues);
  const goals = readStringArray(obj, "goals", path, issues);

  const demographicsRaw = readObject(obj, "demographics", path, issues);
  const demographics = demographicsRaw
    ? parseDemographics(demographicsRaw, fieldPath(path, "demographics"), issues)
    : undefined;

  const skills: UserSkillInput[] = [];
  const skillItems = readArray(obj, "skills", path, issues, { required: true });
  skillItems?.forEach((item, index) => {
    const skill = parseSkill(item, `${fieldPath(path, "skills")}[${index}]`, issues);
    if (skill) skills.push(skill);
  });

  const interests: UserInterestInput[] = [];
  const interestItems = readArray(obj, "interests", path, issues, { required: true });
  interestItems?.forEach((item, index) => {
    const interest = parseInterest(
      item,
      `${fieldPath(path, "interests")}[${index}]`,
      issues,
    );
    if (interest) interests.push(interest);
  });

  if (issues.length > before || id === undefined) return undefined;

  const profile: UserProfile = { id, skills, interests };
  if (name !== undefined) profile.name = name;
  if (demographics !== undefined) profile.demographics = demographics;
  if (goals !== undefined) profile.goals = goals;
  if (createdAtISO !== undefined) profile.createdAtISO = createdAtISO;
  return profile;
}

/** Validates the parsed JSON body of POST /api/steps. Returns a sanitized copy. */
export function validateNextStepsRequest(
  body: unknown,
): ValidationResult<NextStepsRequest> {
  if (!isObject(body)) return fail(["Request body must be a JSON object."]);

  const issues: string[] = [];

  const matches: CareerMatch[] = [];
  const matchItems = readArray(body, "matches", "", issues, { required: true });
  matchItems?.forEach((item, index) => {
    const match = parseMatch(item, `matches[${index}]`, issues);
    if (match) matches.push(match);
  });

  const profileRaw = readObject(body, "profile", "", issues, true);
  const profile = profileRaw ? parseProfile(profileRaw, "profile", issues) : undefined;

  if (issues.length > 0 || profile === undefined) return fail(issues);
  return { ok: true, value: { matches, profile } };
}

// ---------------------------------------------------------------------------
// Dataset validation (education-steps.json)
//
// Strict on purpose: unknown fields, duplicate ids, dangling prerequisites and
// prerequisite cycles all make the whole dataset invalid. A partially-loaded
// dataset would silently change recommendations, so nothing is skipped.
// ---------------------------------------------------------------------------

const DATASET_KEYS = ["_comment", "steps"] as const;
const RECORD_KEYS = [
  "id",
  "title",
  "category",
  "careerIds",
  "description",
  "estimatedWeeks",
  "resourceUrl",
  "priority",
  "prerequisiteStepIds",
  "dedupeKey",
  "closesGap",
] as const;
const GAP_KEYS = ["missingSkills", "educationLevelNotIn"] as const;
const SKILL_REQUIREMENT_KEYS = ["skill", "minProficiency"] as const;

function parseSkillRequirement(
  item: unknown,
  path: string,
  issues: string[],
): SkillRequirement | undefined {
  if (!isObject(item)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  const before = issues.length;
  rejectUnknownKeys(item, SKILL_REQUIREMENT_KEYS, path, issues);
  const skill = readString(item, "skill", path, issues, {
    required: true,
    nonBlank: true,
  });
  const minProficiency = readNumber(item, "minProficiency", path, issues, {
    integer: true,
    min: 1,
    max: 5,
  });
  if (issues.length > before || skill === undefined) return undefined;
  const requirement: SkillRequirement = { skill };
  if (minProficiency !== undefined) {
    requirement.minProficiency = minProficiency as NonNullable<
      SkillRequirement["minProficiency"]
    >;
  }
  return requirement;
}

function parseGap(
  obj: JsonObject,
  path: string,
  issues: string[],
): StepGapCondition | undefined {
  const before = issues.length;
  rejectUnknownKeys(obj, GAP_KEYS, path, issues);

  const gap: StepGapCondition = {};

  const skillItems = readArray(obj, "missingSkills", path, issues, { nonEmpty: true });
  if (skillItems) {
    const requirements: SkillRequirement[] = [];
    skillItems.forEach((item, index) => {
      const requirement = parseSkillRequirement(
        item,
        `${fieldPath(path, "missingSkills")}[${index}]`,
        issues,
      );
      if (requirement) requirements.push(requirement);
    });
    gap.missingSkills = requirements;
  }

  const levels = readStringArray(obj, "educationLevelNotIn", path, issues, {
    nonEmpty: true,
    nonBlank: true,
  });
  if (levels) gap.educationLevelNotIn = levels;

  if (gap.missingSkills === undefined && gap.educationLevelNotIn === undefined) {
    if (issues.length === before) {
      issues.push(`${path} must define at least one condition.`);
    }
  }
  return issues.length > before ? undefined : gap;
}

function parseRecord(
  item: unknown,
  path: string,
  issues: string[],
): EducationStepRecord | undefined {
  if (!isObject(item)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  const before = issues.length;
  rejectUnknownKeys(item, RECORD_KEYS, path, issues);

  const id = readString(item, "id", path, issues, { required: true, nonBlank: true });
  const title = readString(item, "title", path, issues, {
    required: true,
    nonBlank: true,
  });

  const rawCategory = getField(item, "category");
  let category: EducationStepRecord["category"] | undefined;
  if (rawCategory === undefined) {
    issues.push(`${fieldPath(path, "category")} is required.`);
  } else if (!isNextStepCategory(rawCategory)) {
    issues.push(`${fieldPath(path, "category")} is not a supported category.`);
  } else {
    category = rawCategory;
  }

  const careerIds = readStringArray(item, "careerIds", path, issues, {
    required: true,
    nonEmpty: true,
    nonBlank: true,
  });
  if (careerIds && new Set(careerIds).size !== careerIds.length) {
    issues.push(`${fieldPath(path, "careerIds")} must not contain duplicates.`);
  }

  const description = readString(item, "description", path, issues, {
    max: MAX_DESCRIPTION_LENGTH,
  });
  const estimatedWeeks = readNumber(item, "estimatedWeeks", path, issues, { min: 0 });
  const resourceUrl = readHttpUrl(item, "resourceUrl", path, issues);
  const priority = readNumber(item, "priority", path, issues, {
    min: 0,
    integer: true,
  });
  const prerequisiteStepIds = readStringArray(
    item,
    "prerequisiteStepIds",
    path,
    issues,
    { nonBlank: true },
  );
  const dedupeKey = readString(item, "dedupeKey", path, issues, { nonBlank: true });

  const gapRaw = readObject(item, "closesGap", path, issues);
  const closesGap = gapRaw ? parseGap(gapRaw, fieldPath(path, "closesGap"), issues) : undefined;

  if (
    issues.length > before ||
    id === undefined ||
    title === undefined ||
    category === undefined ||
    careerIds === undefined
  ) {
    return undefined;
  }

  const record: EducationStepRecord = { id, title, category, careerIds };
  if (description !== undefined) record.description = description;
  if (estimatedWeeks !== undefined) record.estimatedWeeks = estimatedWeeks;
  if (resourceUrl !== undefined) record.resourceUrl = resourceUrl;
  if (priority !== undefined) record.priority = priority;
  if (prerequisiteStepIds !== undefined) record.prerequisiteStepIds = prerequisiteStepIds;
  if (dedupeKey !== undefined) record.dedupeKey = dedupeKey;
  if (closesGap !== undefined) record.closesGap = closesGap;
  return record;
}

/** Returns an id that is part of a prerequisite cycle, or undefined if none. */
function findPrerequisiteCycle(records: EducationStepRecord[]): string | undefined {
  const graph = new Map<string, string[]>(
    records.map((record) => [record.id, record.prerequisiteStepIds ?? []]),
  );
  const state = new Map<string, "visiting" | "done">();

  for (const start of graph.keys()) {
    if (state.has(start)) continue;
    state.set(start, "visiting");
    const stack: Array<{ id: string; next: number }> = [{ id: start, next: 0 }];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const deps = graph.get(top.id) ?? [];
      if (top.next >= deps.length) {
        state.set(top.id, "done");
        stack.pop();
        continue;
      }
      const dep = deps[top.next++];
      const depState = state.get(dep);
      if (depState === "visiting") return dep;
      if (depState === undefined && graph.has(dep)) {
        state.set(dep, "visiting");
        stack.push({ id: dep, next: 0 });
      }
    }
  }
  return undefined;
}

/**
 * Validates the raw contents of education-steps.json.
 * An intentionally empty dataset (`{"steps": []}`) is valid and reported via
 * `isEmpty`; a missing/mistyped `steps` field is malformed.
 */
export function parseEducationStepDataset(raw: unknown): DatasetLoadResult {
  if (!isObject(raw)) return { ok: false, errors: ["Dataset must be a JSON object."] };

  const issues: string[] = [];
  rejectUnknownKeys(raw, DATASET_KEYS, "", issues);
  readString(raw, "_comment", "", issues, { max: MAX_DESCRIPTION_LENGTH });

  const items = readArray(raw, "steps", "", issues, {
    required: true,
    max: Number.MAX_SAFE_INTEGER,
  });

  const steps: EducationStepRecord[] = [];
  items?.forEach((item, index) => {
    const record = parseRecord(item, `steps[${index}]`, issues);
    if (record) steps.push(record);
  });

  if (issues.length === 0) {
    const ids = new Set<string>();
    for (const record of steps) {
      if (ids.has(record.id)) issues.push(`Duplicate step id "${record.id}".`);
      ids.add(record.id);
    }
    for (const record of steps) {
      for (const prerequisiteId of record.prerequisiteStepIds ?? []) {
        if (!ids.has(prerequisiteId)) {
          issues.push(
            `Step "${record.id}" lists unknown prerequisite "${prerequisiteId}".`,
          );
        }
      }
    }
    if (issues.length === 0) {
      const cycleId = findPrerequisiteCycle(steps);
      if (cycleId !== undefined) {
        issues.push(`Prerequisite cycle involving step "${cycleId}".`);
      }
    }
  }

  if (issues.length > 0) return { ok: false, errors: issues };
  return { ok: true, dataset: { steps }, isEmpty: steps.length === 0 };
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

/**
 * Validates generated steps against the shared NextStep contract and returns a
 * sanitized copy containing only NextStep fields (no ranking metadata).
 * Later steps that repeat an earlier id are dropped.
 */
export function validateNextStepOutput(value: unknown): ValidationResult<NextStep[]> {
  if (!Array.isArray(value)) return fail(["Generated steps must be an array."]);

  const issues: string[] = [];
  const seenIds = new Set<string>();
  const steps: NextStep[] = [];

  value.forEach((item, index) => {
    const path = `steps[${index}]`;
    if (!isObject(item)) {
      issues.push(`${path} must be an object.`);
      return;
    }
    const before = issues.length;

    const id = readString(item, "id", path, issues, { required: true, nonBlank: true });
    const title = readString(item, "title", path, issues, {
      required: true,
      nonBlank: true,
    });
    const description = readString(item, "description", path, issues, {
      max: MAX_DESCRIPTION_LENGTH,
    });
    const rawCategory = getField(item, "category");
    if (rawCategory !== undefined && !isNextStepCategory(rawCategory)) {
      issues.push(`${fieldPath(path, "category")} is not a supported category.`);
    }
    const estimatedWeeks = readNumber(item, "estimatedWeeks", path, issues, { min: 0 });
    const resourceUrl = readHttpUrl(item, "resourceUrl", path, issues);

    if (issues.length > before || id === undefined || title === undefined) return;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    const step: NextStep = { id, title };
    if (description !== undefined) step.description = description;
    if (rawCategory !== undefined && isNextStepCategory(rawCategory)) {
      step.category = rawCategory;
    }
    if (estimatedWeeks !== undefined) step.estimatedWeeks = estimatedWeeks;
    if (resourceUrl !== undefined) step.resourceUrl = resourceUrl;
    steps.push(step);
  });

  if (issues.length > 0) return fail(issues);
  return { ok: true, value: steps };
}
