"use strict";
// Team 6 (Next Step Generation): data loading and the recommendation algorithm.
//
// Everything here is pure and deterministic: the same request and dataset
// always produce the same ordered output, and inputs are never mutated.
// The algorithm never calls Team 4 code; it receives CareerMatch results.
//
// Pipeline:  A normalize -> B gap analysis -> C candidate generation
//            -> E deduplication -> D prioritization -> NextStep[]
// (Deduplication runs before the final ordering so that a dropped duplicate's
// prerequisite links can be re-pointed at the step that was kept.)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEducationStepData = loadEducationStepData;
exports.normalizeLabel = normalizeLabel;
exports.normalizeInput = normalizeInput;
exports.assessGap = assessGap;
exports.generateNextSteps = generateNextSteps;
const education_steps_json_1 = __importDefault(require("../data/education-steps.json"));
const next_steps_validation_1 = require("./next-steps-validation");
// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
/**
 * Loads and validates the education-step dataset. Defaults to the bundled
 * src/data/education-steps.json; pass `raw` to validate other data (tests,
 * future data sources). Never throws.
 */
function loadEducationStepData(raw = education_steps_json_1.default) {
    return (0, next_steps_validation_1.parseEducationStepDataset)(raw);
}
// ---------------------------------------------------------------------------
// Stage A - normalization
// ---------------------------------------------------------------------------
/**
 * Normalizes free-text labels (skills, education levels) for comparison:
 * Unicode NFKC, trimmed, internal whitespace collapsed, lower-cased.
 * NOT applied to career ids or step ids: those are compared exactly, because
 * altering Team 4's identifiers could silently break matching.
 */
function normalizeLabel(value) {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}
function normalizeInput(request) {
    const matchScores = new Map();
    for (const match of request.matches) {
        const existing = matchScores.get(match.careerId);
        if (existing === undefined || match.score > existing) {
            matchScores.set(match.careerId, match.score);
        }
    }
    const skills = new Map();
    for (const skill of request.profile.skills) {
        const proficiency = skill.proficiency ?? null;
        for (const raw of [skill.skillId, skill.label]) {
            const key = normalizeLabel(raw);
            if (key === "")
                continue;
            const existing = skills.get(key);
            if (existing === undefined || existing === null) {
                skills.set(key, proficiency ?? existing ?? null);
            }
            else if (proficiency !== null && proficiency > existing) {
                skills.set(key, proficiency);
            }
        }
    }
    const rawLevel = request.profile.demographics?.educationLevel;
    const level = rawLevel === undefined ? "" : normalizeLabel(rawLevel);
    return {
        matchScores,
        skills,
        hasSkillData: request.profile.skills.length > 0,
        educationLevel: level === "" ? undefined : level,
    };
}
function assessSkills(requirements, input) {
    // Assumption: profile.skills is the user's complete selection (Team 2). An
    // empty list means "no skill data yet", so absence is NOT treated as a gap.
    if (!input.hasSkillData)
        return "unknown";
    let sawUnknown = false;
    for (const requirement of requirements) {
        const held = input.skills.get(normalizeLabel(requirement.skill));
        if (held === undefined)
            return "gap";
        if (requirement.minProficiency !== undefined) {
            if (held === null)
                sawUnknown = true; // proficiency not supplied
            else if (held < requirement.minProficiency)
                return "gap";
        }
    }
    return sawUnknown ? "unknown" : "no-gap";
}
function assessEducation(levels, input) {
    if (input.educationLevel === undefined)
        return "unknown";
    const satisfying = levels.map(normalizeLabel);
    return satisfying.includes(input.educationLevel) ? "no-gap" : "gap";
}
/**
 * A step without `closesGap` is a generic step: relevant to every matched
 * career, never counted as a confirmed gap. A step with `closesGap` is only
 * relevant when at least one condition is positively a gap; conditions that
 * cannot be evaluated (missing user data) never create a recommendation.
 */
function assessGap(closesGap, input) {
    if (closesGap === undefined)
        return { relevant: true, confirmedGap: false };
    const statuses = [];
    if (closesGap.missingSkills) {
        statuses.push(assessSkills(closesGap.missingSkills, input));
    }
    if (closesGap.educationLevelNotIn) {
        statuses.push(assessEducation(closesGap.educationLevelNotIn, input));
    }
    const confirmedGap = statuses.includes("gap");
    return { relevant: confirmedGap, confirmedGap };
}
function collectCandidates(records, input) {
    const candidates = [];
    for (const record of records) {
        let relevance;
        for (const careerId of record.careerIds) {
            const score = input.matchScores.get(careerId);
            if (score !== undefined && (relevance === undefined || score > relevance)) {
                relevance = score;
            }
        }
        // Unsupported / unmatched career ids simply produce no candidates.
        if (relevance === undefined)
            continue;
        const gap = assessGap(record.closesGap, input);
        if (!gap.relevant)
            continue;
        candidates.push({ record, relevance, confirmedGap: gap.confirmedGap });
    }
    return candidates;
}
// ---------------------------------------------------------------------------
// Stage D - prioritization (documented, deterministic tie-break chain)
//
//  0. Prerequisites: a step is never listed before a recommended prerequisite.
//  1. Steps closing a confirmed gap come before generic steps.
//  2. Explicit `priority` from the data (lower first; missing priority last).
//  3. Career relevance: higher best-match score first.
//  4. Step id, by UTF-16 code-unit order (locale independent).
// No numeric "importance score" is computed.
// ---------------------------------------------------------------------------
function compareStrings(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
function compareCandidates(a, b) {
    if (a.confirmedGap !== b.confirmedGap)
        return a.confirmedGap ? -1 : 1;
    const priorityA = a.record.priority;
    const priorityB = b.record.priority;
    if (priorityA !== priorityB) {
        if (priorityA === undefined)
            return 1;
        if (priorityB === undefined)
            return -1;
        return priorityA - priorityB;
    }
    if (a.relevance !== b.relevance)
        return b.relevance - a.relevance;
    return compareStrings(a.record.id, b.record.id);
}
function orderByPrerequisites(candidates, replacedBy) {
    const present = new Set(candidates.map((candidate) => candidate.record.id));
    const prerequisitesOf = (candidate) => (candidate.record.prerequisiteStepIds ?? [])
        .map((id) => replacedBy.get(id) ?? id)
        .filter((id) => id !== candidate.record.id && present.has(id));
    const remaining = [...candidates];
    const emitted = new Set();
    const ordered = [];
    while (remaining.length > 0) {
        const ready = remaining.filter((candidate) => prerequisitesOf(candidate).every((id) => emitted.has(id)));
        // Dataset validation rejects prerequisite cycles; if deduplication ever
        // creates one, fall back to the plain ordering instead of looping.
        const pool = ready.length > 0 ? ready : remaining;
        const next = pool.reduce((best, candidate) => compareCandidates(candidate, best) < 0 ? candidate : best);
        ordered.push(next);
        emitted.add(next.record.id);
        remaining.splice(remaining.indexOf(next), 1);
    }
    return ordered;
}
// ---------------------------------------------------------------------------
// Stage E - deduplication
//
// Records are the same action only when they share a `dedupeKey` (exact,
// case-sensitive). Titles/descriptions are never compared, so similarly named
// but different qualifications are not merged. A record listing several
// matched careers is already a single step and is emitted once.
// ---------------------------------------------------------------------------
function deduplicate(candidates) {
    const kept = [];
    const replacedBy = new Map();
    const byKey = new Map();
    for (const candidate of [...candidates].sort(compareCandidates)) {
        const key = candidate.record.dedupeKey;
        if (key === undefined) {
            kept.push(candidate);
            continue;
        }
        const existing = byKey.get(key);
        if (existing === undefined) {
            byKey.set(key, candidate);
            kept.push(candidate);
        }
        else {
            replacedBy.set(candidate.record.id, existing.record.id);
            existing.relevance = Math.max(existing.relevance, candidate.relevance);
        }
    }
    return { kept, replacedBy };
}
// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
function toNextStep(record) {
    const step = {
        id: record.id,
        title: record.title,
        category: record.category,
    };
    if (record.description !== undefined)
        step.description = record.description;
    if (record.estimatedWeeks !== undefined)
        step.estimatedWeeks = record.estimatedWeeks;
    if (record.resourceUrl !== undefined)
        step.resourceUrl = record.resourceUrl;
    return step;
}
/**
 * Generates ordered next steps. Expects a validated request and dataset (see
 * next-steps-validation.ts). Returns [] whenever the data does not support a
 * recommendation; it never invents requirements to fill the list.
 */
function generateNextSteps(request, dataset) {
    if (request.matches.length === 0 || dataset.steps.length === 0)
        return [];
    const input = normalizeInput(request);
    const candidates = collectCandidates(dataset.steps, input);
    if (candidates.length === 0)
        return [];
    const { kept, replacedBy } = deduplicate(candidates);
    return orderByPrerequisites(kept, replacedBy).map((candidate) => toNextStep(candidate.record));
}
