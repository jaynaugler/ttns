"use strict";
// Team 6 tests. Run with Node's built-in runner (no extra dependencies), e.g.
// after compiling with tsc:  node --test <compiled>/next-steps.test.js
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const route_1 = require("../../app/api/steps/route");
const next_steps_1 = require("../next-steps");
const next_steps_validation_1 = require("../next-steps-validation");
const handler_1 = require("./handler");
function request(overrides = {}) {
    return {
        matches: [{ careerId: "career-a", score: 0.9 }],
        profile: { id: "u1", skills: [], interests: [] },
        ...overrides,
    };
}
function record(id, overrides = {}) {
    return {
        id,
        title: `Title ${id}`,
        category: "education",
        careerIds: ["career-a"],
        ...overrides,
    };
}
function dataset(...records) {
    const result = (0, next_steps_1.loadEducationStepData)({ steps: records });
    strict_1.default.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok)
        throw new Error("unreachable");
    return result.dataset;
}
function ids(steps) {
    return steps.map((step) => step.id);
}
function deepFreeze(value) {
    if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}
function post(body) {
    return (0, route_1.POST)(new Request("http://localhost/api/steps", { method: "POST", body }));
}
const VALID_BODY = JSON.stringify(request());
// ------------------------------------------------------- 1, 3, 15: empty/no match
(0, node_test_1.describe)("empty and unsupported inputs", () => {
    (0, node_test_1.it)("1. empty match list returns no steps", () => {
        const data = dataset(record("s1"));
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(request({ matches: [] }), data), []);
    });
    (0, node_test_1.it)("3. valid request with no matching recommendations returns no steps", () => {
        const data = dataset(record("s1", { careerIds: ["career-z"] }));
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(request(), data), []);
    });
    (0, node_test_1.it)("15. unsupported career ids do not crash and yield no steps", () => {
        const data = dataset(record("s1"));
        const odd = request({
            matches: [
                { careerId: "does-not-exist", score: 1 },
                { careerId: "__proto__", score: 1 },
                { careerId: "constructor", score: 1 },
            ],
        });
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(odd, data), []);
    });
    (0, node_test_1.it)("career ids are compared exactly (no silent normalization)", () => {
        const data = dataset(record("s1", { careerIds: ["Career-A"] }));
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(request(), data), []);
    });
});
// ---------------------------------------------------------- 2: empty dataset
(0, node_test_1.describe)("education-step dataset loading", () => {
    (0, node_test_1.it)("2. an empty steps array is valid and flagged as intentionally empty", () => {
        const result = (0, next_steps_1.loadEducationStepData)({ steps: [] });
        strict_1.default.deepEqual(result, { ok: true, dataset: { steps: [] }, isEmpty: true });
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(request(), { steps: [] }), []);
    });
    (0, node_test_1.it)("the bundled education-steps.json loads and is empty", () => {
        const result = (0, next_steps_1.loadEducationStepData)();
        strict_1.default.equal(result.ok, true);
        strict_1.default.equal(result.ok && result.isEmpty, true);
    });
    (0, node_test_1.it)("missing or mistyped `steps` is malformed, not empty", () => {
        for (const raw of [{}, { steps: {} }, { steps: null }, [], null, "x"]) {
            strict_1.default.equal((0, next_steps_1.loadEducationStepData)(raw).ok, false, JSON.stringify(raw));
        }
    });
    (0, node_test_1.it)("a `_comment` string is tolerated, other top-level keys are not", () => {
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ _comment: "hi", steps: [] }).ok, true);
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [], extra: 1 }).ok, false);
    });
});
// -------------------------------------------------- 8, 12: invalid records
(0, node_test_1.describe)("invalid dataset records are rejected", () => {
    const bad = [
        ["missing id", { title: "t", category: "education", careerIds: ["a"] }],
        ["blank id", record(" ")],
        ["missing title", { id: "x", category: "education", careerIds: ["a"] }],
        ["blank title", record("x", { title: "  " })],
        ["bad category", record("x", { category: "hobby" })],
        ["missing category", { id: "x", title: "t", careerIds: ["a"] }],
        ["empty careerIds", record("x", { careerIds: [] })],
        ["blank careerId", record("x", { careerIds: [""] })],
        ["duplicate careerIds", record("x", { careerIds: ["a", "a"] })],
        ["negative weeks", record("x", { estimatedWeeks: -1 })],
        ["string weeks", record("x", { estimatedWeeks: "12" })],
        ["fractional priority", record("x", { priority: 1.5 })],
        ["unknown field", record("x", { carrerIds: ["a"] })],
        ["bad description type", record("x", { description: 5 })],
        ["empty closesGap", record("x", { closesGap: {} })],
        ["unknown gap key", record("x", { closesGap: { skills: ["a"] } })],
        ["bad minProficiency", record("x", { closesGap: { missingSkills: [{ skill: "a", minProficiency: 9 }] } })],
        ["not an object", { not: "a record" }],
    ];
    for (const [name, value] of bad) {
        (0, node_test_1.it)(`8. rejects: ${name}`, () => {
            strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [value] }).ok, false);
        });
    }
    (0, node_test_1.it)("8. rejects a non-object record", () => {
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: ["oops"] }).ok, false);
    });
    (0, node_test_1.it)("8. rejects duplicate ids, unknown prerequisites and cycles", () => {
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [record("a"), record("a")] }).ok, false);
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [record("a", { prerequisiteStepIds: ["zz"] })] }).ok, false);
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({
            steps: [
                record("a", { prerequisiteStepIds: ["b"] }),
                record("b", { prerequisiteStepIds: ["a"] }),
            ],
        }).ok, false);
        strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [record("a", { prerequisiteStepIds: ["a"] })] }).ok, false);
    });
    (0, node_test_1.it)("one bad record rejects the whole dataset (no partial load)", () => {
        const result = (0, next_steps_1.loadEducationStepData)({ steps: [record("ok"), record("bad", { category: "x" })] });
        strict_1.default.equal(result.ok, false);
    });
    (0, node_test_1.it)("12. rejects invalid resource URLs", () => {
        for (const url of ["not a url", "ftp://example.com/x", "javascript:alert(1)", "", 5]) {
            strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [record("x", { resourceUrl: url })] }).ok, false, String(url));
        }
        for (const url of ["http://example.com/a", "https://example.com/a?b=1"]) {
            strict_1.default.equal((0, next_steps_1.loadEducationStepData)({ steps: [record("x", { resourceUrl: url })] }).ok, true, url);
        }
    });
});
// ----------------------------------------------- request validation (5, 6, 7, 11)
(0, node_test_1.describe)("request validation", () => {
    (0, node_test_1.it)("accepts a valid request and returns a sanitized copy", () => {
        const result = (0, next_steps_validation_1.validateNextStepsRequest)({
            ...request(),
            unexpected: true,
        });
        strict_1.default.equal(result.ok, true);
        strict_1.default.equal(result.ok && "unexpected" in result.value, false);
    });
    (0, node_test_1.it)("5. rejects missing required fields", () => {
        const bodies = [
            {},
            { matches: [] },
            { profile: request().profile },
            { matches: [], profile: { skills: [], interests: [] } },
            { matches: [], profile: { id: "u", interests: [] } },
            { matches: [], profile: { id: "u", skills: [] } },
            null,
            [],
            "text",
            42,
        ];
        for (const body of bodies) {
            strict_1.default.equal((0, next_steps_validation_1.validateNextStepsRequest)(body).ok, false, JSON.stringify(body));
        }
    });
    (0, node_test_1.it)("5. rejects wrongly typed top-level fields", () => {
        strict_1.default.equal((0, next_steps_validation_1.validateNextStepsRequest)({ matches: {}, profile: request().profile }).ok, false);
        strict_1.default.equal((0, next_steps_validation_1.validateNextStepsRequest)({ matches: [], profile: [] }).ok, false);
    });
    (0, node_test_1.it)("6. rejects invalid career ids", () => {
        for (const careerId of ["", "   ", 123, null, undefined, {}]) {
            const result = (0, next_steps_validation_1.validateNextStepsRequest)(request({ matches: [{ careerId, score: 1 }] }));
            strict_1.default.equal(result.ok, false, String(careerId));
        }
    });
    (0, node_test_1.it)("7. rejects invalid match scores", () => {
        for (const score of ["0.9", null, undefined, NaN, Infinity, {}, true]) {
            const result = (0, next_steps_validation_1.validateNextStepsRequest)(request({ matches: [{ careerId: "a", score }] }));
            strict_1.default.equal(result.ok, false, String(score));
        }
        for (const score of [0, -1, 0.5, 100]) {
            strict_1.default.equal((0, next_steps_validation_1.validateNextStepsRequest)(request({ matches: [{ careerId: "a", score }] })).ok, true, String(score));
        }
    });
    (0, node_test_1.it)("rejects invalid profile fields", () => {
        const base = request().profile;
        const profiles = [
            { ...base, id: "" },
            { ...base, name: 5 },
            { ...base, goals: "x" },
            { ...base, demographics: { educationLevel: 3 } },
            { ...base, skills: [{ skillId: "s" }] },
            { ...base, skills: [{ skillId: "s", label: "S", proficiency: 6 }] },
            { ...base, skills: [{ skillId: "s", label: "S", proficiency: 2.5 }] },
            { ...base, interests: [{ interestId: "i", label: "I", weight: 0 }] },
        ];
        for (const profile of profiles) {
            strict_1.default.equal((0, next_steps_validation_1.validateNextStepsRequest)({ matches: [], profile }).ok, false, JSON.stringify(profile));
        }
    });
    (0, node_test_1.it)("11. accepts a profile with every optional field missing", () => {
        const result = (0, next_steps_validation_1.validateNextStepsRequest)({
            matches: [{ careerId: "a", score: 1 }],
            profile: { id: "u1", skills: [], interests: [] },
        });
        strict_1.default.equal(result.ok, true);
    });
    (0, node_test_1.it)("11. missing optional profile data never produces gap-based steps", () => {
        const data = dataset(record("generic"), record("needs-skill", { closesGap: { missingSkills: [{ skill: "python" }] } }), record("needs-edu", { closesGap: { educationLevelNotIn: ["bachelor"] } }));
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(request(), data)), ["generic"]);
    });
});
// --------------------------------------------------------------- gap analysis
(0, node_test_1.describe)("gap analysis", () => {
    const skillStep = record("learn-x", {
        closesGap: { missingSkills: [{ skill: "Data Analysis" }] },
    });
    (0, node_test_1.it)("recommends when a required skill is absent from a non-empty skill list", () => {
        const req = request({
            profile: { id: "u", skills: [{ skillId: "s1", label: "Writing" }], interests: [] },
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(req, dataset(skillStep))), ["learn-x"]);
    });
    (0, node_test_1.it)("does not recommend when the user has the skill (case/space-insensitive, by id or label)", () => {
        for (const skill of [
            { skillId: "s1", label: "  data   ANALYSIS " },
            { skillId: "DATA analysis", label: "Other" },
        ]) {
            const req = request({ profile: { id: "u", skills: [skill], interests: [] } });
            strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(req, dataset(skillStep)), []);
        }
    });
    (0, node_test_1.it)("honours minProficiency and treats unknown proficiency as no evidence", () => {
        const step = record("level-up", {
            closesGap: { missingSkills: [{ skill: "sql", minProficiency: 3 }] },
        });
        const withLevel = (proficiency) => request({
            profile: {
                id: "u",
                skills: [{ skillId: "sql", label: "SQL", proficiency }],
                interests: [],
            },
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(withLevel(2), dataset(step))), ["level-up"]);
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(withLevel(3), dataset(step)), []);
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(withLevel(undefined), dataset(step)), []);
    });
    (0, node_test_1.it)("evaluates education only when the level is known", () => {
        const step = record("degree", { closesGap: { educationLevelNotIn: ["Bachelor", "Master"] } });
        const withEdu = (educationLevel) => request({
            profile: { id: "u", skills: [], interests: [], demographics: { educationLevel } },
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(withEdu("high school"), dataset(step))), ["degree"]);
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(withEdu(" bachelor "), dataset(step)), []);
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(withEdu(undefined), dataset(step)), []);
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)(withEdu("   "), dataset(step)), []);
    });
    (0, node_test_1.it)("supports all four categories", () => {
        const data = dataset(record("e", { category: "education" }), record("c", { category: "credential" }), record("x", { category: "experience" }), record("a", { category: "application" }));
        const out = (0, next_steps_1.generateNextSteps)(request(), data);
        strict_1.default.deepEqual(out.map((s) => s.category).sort(), ["application", "credential", "education", "experience"]);
    });
    (0, node_test_1.it)("normalizeLabel collapses case, whitespace and compatibility forms", () => {
        strict_1.default.equal((0, next_steps_1.normalizeLabel)("  Ｃ++   Basics "), "c++ basics");
    });
});
// ------------------------------------------------- 9, 14: duplicates / sharing
(0, node_test_1.describe)("deduplication", () => {
    (0, node_test_1.it)("14. one record shared by several matched careers is returned once", () => {
        const data = dataset(record("shared", { careerIds: ["career-a", "career-b"] }));
        const req = request({
            matches: [
                { careerId: "career-a", score: 0.4 },
                { careerId: "career-b", score: 0.8 },
            ],
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(req, data)), ["shared"]);
    });
    (0, node_test_1.it)("9. records with the same dedupeKey collapse to one step", () => {
        const data = dataset(record("learn-a", { careerIds: ["career-a"], dedupeKey: "learn-python" }), record("learn-b", { careerIds: ["career-b"], dedupeKey: "learn-python" }));
        const req = request({
            matches: [
                { careerId: "career-a", score: 0.5 },
                { careerId: "career-b", score: 0.9 },
            ],
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(req, data)), ["learn-b"]);
    });
    (0, node_test_1.it)("9. similar titles with different ids/keys are NOT merged", () => {
        const data = dataset(record("n1", { title: "Nursing Certificate" }), record("n2", { title: "Nursing Certificate", dedupeKey: "other" }));
        strict_1.default.equal((0, next_steps_1.generateNextSteps)(request(), data).length, 2);
    });
    (0, node_test_1.it)("9. duplicate matches for one career are collapsed to the best score", () => {
        const data = dataset(record("s1"));
        const req = request({
            matches: [
                { careerId: "career-a", score: 0.1 },
                { careerId: "career-a", score: 0.7 },
            ],
        });
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)(req, data)), ["s1"]);
    });
    (0, node_test_1.it)("a dropped duplicate's prerequisite links point at the kept step", () => {
        const data = dataset(record("base", { priority: 5 }), record("dup-1", { dedupeKey: "k", priority: 1 }), record("dup-2", { dedupeKey: "k", priority: 2 }), record("after", { prerequisiteStepIds: ["dup-2"], priority: 0 }));
        const out = ids((0, next_steps_1.generateNextSteps)(request(), data));
        strict_1.default.equal(out.includes("dup-2"), false);
        strict_1.default.ok(out.indexOf("dup-1") < out.indexOf("after"));
    });
    (0, node_test_1.it)("output validation removes repeated ids", () => {
        const result = (0, next_steps_validation_1.validateNextStepOutput)([
            { id: "a", title: "A" },
            { id: "a", title: "A again" },
        ]);
        strict_1.default.equal(result.ok, true);
        strict_1.default.equal(result.ok && result.value.length, 1);
    });
});
// ------------------------------------------------------------------- 10: order
(0, node_test_1.describe)("prioritization and determinism", () => {
    const skillGap = { missingSkills: [{ skill: "python" }] };
    const profile = {
        id: "u",
        skills: [{ skillId: "other", label: "Other" }],
        interests: [],
    };
    const records = [
        record("z-generic-hi", { careerIds: ["career-b"] }),
        record("a-generic", { priority: 2 }),
        record("b-generic", { priority: 1 }),
        record("c-gap", { closesGap: skillGap }),
        record("d-gap-prio", { closesGap: skillGap, priority: 9 }),
        record("e-prereq", { prerequisiteStepIds: ["b-generic"], priority: 0 }),
    ];
    const matches = [
        { careerId: "career-a", score: 0.5 },
        { careerId: "career-b", score: 0.9 },
    ];
    (0, node_test_1.it)("10. applies prerequisites, then gap, priority, relevance, id", () => {
        const out = ids((0, next_steps_1.generateNextSteps)({ matches, profile }, dataset(...records)));
        strict_1.default.deepEqual(out, [
            "d-gap-prio", // confirmed gap beats everything not blocked
            "c-gap",
            "b-generic", // prerequisite of e-prereq, priority 1
            "e-prereq", // priority 0 but must follow its prerequisite
            "a-generic", // priority 2
            "z-generic-hi", // no priority: last
        ]);
    });
    (0, node_test_1.it)("10. output is identical for any input ordering and repeated runs", () => {
        const expected = (0, next_steps_1.generateNextSteps)({ matches, profile }, dataset(...records));
        const shuffles = [
            [...records].reverse(),
            [records[3], records[0], records[5], records[1], records[4], records[2]],
        ];
        for (const shuffled of shuffles) {
            for (const m of [matches, [...matches].reverse()]) {
                strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)({ matches: m, profile }, dataset(...shuffled)), expected);
            }
        }
        strict_1.default.deepEqual((0, next_steps_1.generateNextSteps)({ matches, profile }, dataset(...records)), expected);
    });
    (0, node_test_1.it)("ties on relevance fall back to id order; higher score first", () => {
        const data = dataset(record("b", { careerIds: ["career-a"] }), record("a", { careerIds: ["career-a"] }), record("c", { careerIds: ["career-b"] }));
        strict_1.default.deepEqual(ids((0, next_steps_1.generateNextSteps)({ matches, profile }, data)), ["c", "a", "b"]);
    });
    (0, node_test_1.it)("does not mutate its inputs", () => {
        const req = deepFreeze(request({ matches }));
        const data = deepFreeze(dataset(...records));
        strict_1.default.doesNotThrow(() => (0, next_steps_1.generateNextSteps)(req, data));
    });
});
// ------------------------------------------------------- 13: output contract
(0, node_test_1.describe)("output contract", () => {
    (0, node_test_1.it)("13. generated steps conform to NextStep and expose no ranking metadata", () => {
        const data = dataset(record("full", {
            description: "d",
            estimatedWeeks: 0,
            resourceUrl: "https://example.com/x",
            priority: 3,
            dedupeKey: "k",
            closesGap: undefined,
        }));
        const steps = (0, next_steps_1.generateNextSteps)(request(), data);
        const checked = (0, next_steps_validation_1.validateNextStepOutput)(steps);
        strict_1.default.equal(checked.ok, true);
        strict_1.default.deepEqual(steps, [
            {
                id: "full",
                title: "Title full",
                category: "education",
                description: "d",
                estimatedWeeks: 0,
                resourceUrl: "https://example.com/x",
            },
        ]);
    });
    (0, node_test_1.it)("12. output validation rejects bad urls, weeks, categories and titles", () => {
        const bad = [
            { id: "a", title: "A", resourceUrl: "ftp://x.com" },
            { id: "a", title: "A", resourceUrl: "nope" },
            { id: "a", title: "A", estimatedWeeks: -2 },
            { id: "a", title: "A", estimatedWeeks: "3" },
            { id: "a", title: "A", category: "hobby" },
            { id: "a", title: "A", description: 7 },
            { id: "a", title: "" },
            { id: "", title: "A" },
            { title: "A" },
            "string",
        ];
        for (const step of bad) {
            strict_1.default.equal((0, next_steps_validation_1.validateNextStepOutput)([step]).ok, false, JSON.stringify(step));
        }
        strict_1.default.equal((0, next_steps_validation_1.validateNextStepOutput)({}).ok, false);
    });
    (0, node_test_1.it)("output validation strips non-NextStep fields", () => {
        const result = (0, next_steps_validation_1.validateNextStepOutput)([{ id: "a", title: "A", rank: 1, priority: 2 }]);
        strict_1.default.deepEqual(result.ok && result.value, [{ id: "a", title: "A" }]);
    });
});
// ------------------------------------------------------------------ API route
(0, node_test_1.describe)("POST /api/steps", () => {
    (0, node_test_1.it)("valid request with empty bundled data returns 200 { steps: [] }", async () => {
        const response = await post(VALID_BODY);
        strict_1.default.equal(response.status, 200);
        strict_1.default.deepEqual(await response.json(), { steps: [] });
    });
    (0, node_test_1.it)("empty match list returns 200 { steps: [] }", async () => {
        const response = await post(JSON.stringify(request({ matches: [] })));
        strict_1.default.equal(response.status, 200);
        strict_1.default.deepEqual(await response.json(), { steps: [] });
    });
    (0, node_test_1.it)("4. invalid or empty JSON returns 400", async () => {
        for (const body of ["{not json", "", "undefined"]) {
            const response = await post(body);
            strict_1.default.equal(response.status, 400, body);
            const json = (await response.json());
            strict_1.default.equal(typeof json.error, "string");
        }
    });
    (0, node_test_1.it)("5/6/7. validation failures return 400 with a field-level message", async () => {
        const cases = [
            [{}, /matches is required/],
            [{ matches: [] }, /profile is required/],
            [request({ matches: [{ careerId: "", score: 1 }] }), /matches\[0\]\.careerId/],
            [{ ...request(), matches: [{ careerId: "a", score: "high" }] }, /matches\[0\]\.score/],
        ];
        for (const [body, pattern] of cases) {
            const response = await post(JSON.stringify(body));
            strict_1.default.equal(response.status, 400);
            const json = (await response.json());
            strict_1.default.match(json.error, pattern);
        }
    });
    (0, node_test_1.it)("rejects an oversized body with 400", async () => {
        const response = await post("[" + "0,".repeat(600000) + "0]");
        strict_1.default.equal(response.status, 400);
    });
    (0, node_test_1.it)("returns steps with an injected valid dataset", async () => {
        const data = dataset(record("s1"));
        const response = await (0, handler_1.handleNextStepsRequest)(new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }), () => ({ ok: true, dataset: data, isEmpty: false }));
        strict_1.default.equal(response.status, 200);
        strict_1.default.deepEqual(ids((await response.json()).steps), ["s1"]);
    });
    (0, node_test_1.it)("8. malformed server-side data returns 500 without internal details", async () => {
        const malformed = (0, next_steps_validation_1.parseEducationStepDataset)({
            steps: [record("bad", { category: "secret-internal-detail" })],
        });
        strict_1.default.equal(malformed.ok, false);
        const response = await (0, handler_1.handleNextStepsRequest)(new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }), () => malformed);
        strict_1.default.equal(response.status, 500);
        const text = await response.text();
        strict_1.default.deepEqual(JSON.parse(text), { error: "Next step data is currently unavailable." });
        strict_1.default.equal(text.includes("secret-internal-detail"), false);
    });
    (0, node_test_1.it)("unexpected failures return a generic 500 without leaking details", async () => {
        const response = await (0, handler_1.handleNextStepsRequest)(new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }), () => {
            throw new Error("db password is hunter2");
        });
        strict_1.default.equal(response.status, 500);
        const text = await response.text();
        strict_1.default.equal(text.includes("hunter2"), false);
        strict_1.default.deepEqual(JSON.parse(text), { error: "Next steps could not be generated." });
    });
    (0, node_test_1.it)("invalid generated output returns 500", async () => {
        // Bypass dataset validation to simulate a bug producing an invalid step.
        const bad = {
            ok: true,
            isEmpty: false,
            dataset: {
                steps: [
                    {
                        id: "s1",
                        title: "T",
                        category: "education",
                        careerIds: ["career-a"],
                        resourceUrl: "ftp://bad.example",
                    },
                ],
            },
        };
        const response = await (0, handler_1.handleNextStepsRequest)(new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }), () => bad);
        strict_1.default.equal(response.status, 500);
    });
});
