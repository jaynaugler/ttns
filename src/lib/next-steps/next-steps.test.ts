// Team 6 tests. Run with Node's built-in runner (no extra dependencies), e.g.
// after compiling with tsc:  node --test <compiled>/next-steps.test.js

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextStep } from "@/types/outcomes";
import { POST } from "../../app/api/steps/route";
import {
  generateNextSteps,
  loadEducationStepData,
  normalizeLabel,
} from "../next-steps";
import type {
  DatasetLoadResult,
  EducationStepDataset,
  NextStepsRequest,
} from "../next-steps-types";
import {
  parseEducationStepDataset,
  validateNextStepOutput,
  validateNextStepsRequest,
} from "../next-steps-validation";
import { handleNextStepsRequest } from "./handler";

// ---------------------------------------------------------------- helpers

type Raw = Record<string, unknown>;

function request(overrides: Partial<NextStepsRequest> = {}): NextStepsRequest {
  return {
    matches: [{ careerId: "career-a", score: 0.9 }],
    profile: { id: "u1", skills: [], interests: [] },
    ...overrides,
  };
}

function record(id: string, overrides: Raw = {}): Raw {
  return {
    id,
    title: `Title ${id}`,
    category: "education",
    careerIds: ["career-a"],
    ...overrides,
  };
}

function dataset(...records: Raw[]): EducationStepDataset {
  const result = loadEducationStepData({ steps: records });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("unreachable");
  return result.dataset;
}

function ids(steps: NextStep[]): string[] {
  return steps.map((step) => step.id);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/steps", { method: "POST", body }),
  );
}

const VALID_BODY = JSON.stringify(request());

// ------------------------------------------------------- 1, 3, 15: empty/no match

describe("empty and unsupported inputs", () => {
  it("1. empty match list returns no steps", () => {
    const data = dataset(record("s1"));
    assert.deepEqual(generateNextSteps(request({ matches: [] }), data), []);
  });

  it("3. valid request with no matching recommendations returns no steps", () => {
    const data = dataset(record("s1", { careerIds: ["career-z"] }));
    assert.deepEqual(generateNextSteps(request(), data), []);
  });

  it("15. unsupported career ids do not crash and yield no steps", () => {
    const data = dataset(record("s1"));
    const odd = request({
      matches: [
        { careerId: "does-not-exist", score: 1 },
        { careerId: "__proto__", score: 1 },
        { careerId: "constructor", score: 1 },
      ],
    });
    assert.deepEqual(generateNextSteps(odd, data), []);
  });

  it("career ids are compared exactly (no silent normalization)", () => {
    const data = dataset(record("s1", { careerIds: ["Career-A"] }));
    assert.deepEqual(generateNextSteps(request(), data), []);
  });
});

// ---------------------------------------------------------- 2: empty dataset

describe("education-step dataset loading", () => {
  it("2. an empty steps array is valid and flagged as intentionally empty", () => {
    const result = loadEducationStepData({ steps: [] });
    assert.deepEqual(result, { ok: true, dataset: { steps: [] }, isEmpty: true });
    assert.deepEqual(generateNextSteps(request(), { steps: [] }), []);
  });

  it("the bundled education-steps.json loads and is empty", () => {
    const result = loadEducationStepData();
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.isEmpty, true);
  });

  it("missing or mistyped `steps` is malformed, not empty", () => {
    for (const raw of [{}, { steps: {} }, { steps: null }, [], null, "x"]) {
      assert.equal(loadEducationStepData(raw).ok, false, JSON.stringify(raw));
    }
  });

  it("a `_comment` string is tolerated, other top-level keys are not", () => {
    assert.equal(loadEducationStepData({ _comment: "hi", steps: [] }).ok, true);
    assert.equal(loadEducationStepData({ steps: [], extra: 1 }).ok, false);
  });
});

// -------------------------------------------------- 8, 12: invalid records

describe("invalid dataset records are rejected", () => {
  const bad: Array<[string, Raw]> = [
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
    ["not an object", { not: "a record" } as Raw],
  ];
  for (const [name, value] of bad) {
    it(`8. rejects: ${name}`, () => {
      assert.equal(loadEducationStepData({ steps: [value] }).ok, false);
    });
  }

  it("8. rejects a non-object record", () => {
    assert.equal(loadEducationStepData({ steps: ["oops"] }).ok, false);
  });

  it("8. rejects duplicate ids, unknown prerequisites and cycles", () => {
    assert.equal(loadEducationStepData({ steps: [record("a"), record("a")] }).ok, false);
    assert.equal(
      loadEducationStepData({ steps: [record("a", { prerequisiteStepIds: ["zz"] })] }).ok,
      false,
    );
    assert.equal(
      loadEducationStepData({
        steps: [
          record("a", { prerequisiteStepIds: ["b"] }),
          record("b", { prerequisiteStepIds: ["a"] }),
        ],
      }).ok,
      false,
    );
    assert.equal(
      loadEducationStepData({ steps: [record("a", { prerequisiteStepIds: ["a"] })] }).ok,
      false,
    );
  });

  it("one bad record rejects the whole dataset (no partial load)", () => {
    const result = loadEducationStepData({ steps: [record("ok"), record("bad", { category: "x" })] });
    assert.equal(result.ok, false);
  });

  it("12. rejects invalid resource URLs", () => {
    for (const url of ["not a url", "ftp://example.com/x", "javascript:alert(1)", "", 5]) {
      assert.equal(
        loadEducationStepData({ steps: [record("x", { resourceUrl: url })] }).ok,
        false,
        String(url),
      );
    }
    for (const url of ["http://example.com/a", "https://example.com/a?b=1"]) {
      assert.equal(
        loadEducationStepData({ steps: [record("x", { resourceUrl: url })] }).ok,
        true,
        url,
      );
    }
  });
});

// ----------------------------------------------- request validation (5, 6, 7, 11)

describe("request validation", () => {
  it("accepts a valid request and returns a sanitized copy", () => {
    const result = validateNextStepsRequest({
      ...request(),
      unexpected: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok && "unexpected" in result.value, false);
  });

  it("5. rejects missing required fields", () => {
    const bodies: unknown[] = [
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
      assert.equal(validateNextStepsRequest(body).ok, false, JSON.stringify(body));
    }
  });

  it("5. rejects wrongly typed top-level fields", () => {
    assert.equal(validateNextStepsRequest({ matches: {}, profile: request().profile }).ok, false);
    assert.equal(validateNextStepsRequest({ matches: [], profile: [] }).ok, false);
  });

  it("6. rejects invalid career ids", () => {
    for (const careerId of ["", "   ", 123, null, undefined, {}]) {
      const result = validateNextStepsRequest(
        request({ matches: [{ careerId, score: 1 } as never] }),
      );
      assert.equal(result.ok, false, String(careerId));
    }
  });

  it("7. rejects invalid match scores", () => {
    for (const score of ["0.9", null, undefined, NaN, Infinity, {}, true]) {
      const result = validateNextStepsRequest(
        request({ matches: [{ careerId: "a", score } as never] }),
      );
      assert.equal(result.ok, false, String(score));
    }
    for (const score of [0, -1, 0.5, 100]) {
      assert.equal(
        validateNextStepsRequest(request({ matches: [{ careerId: "a", score }] })).ok,
        true,
        String(score),
      );
    }
  });

  it("rejects invalid profile fields", () => {
    const base = request().profile;
    const profiles: unknown[] = [
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
      assert.equal(
        validateNextStepsRequest({ matches: [], profile }).ok,
        false,
        JSON.stringify(profile),
      );
    }
  });

  it("11. accepts a profile with every optional field missing", () => {
    const result = validateNextStepsRequest({
      matches: [{ careerId: "a", score: 1 }],
      profile: { id: "u1", skills: [], interests: [] },
    });
    assert.equal(result.ok, true);
  });

  it("11. missing optional profile data never produces gap-based steps", () => {
    const data = dataset(
      record("generic"),
      record("needs-skill", { closesGap: { missingSkills: [{ skill: "python" }] } }),
      record("needs-edu", { closesGap: { educationLevelNotIn: ["bachelor"] } }),
    );
    assert.deepEqual(ids(generateNextSteps(request(), data)), ["generic"]);
  });
});

// --------------------------------------------------------------- gap analysis

describe("gap analysis", () => {
  const skillStep = record("learn-x", {
    closesGap: { missingSkills: [{ skill: "Data Analysis" }] },
  });

  it("recommends when a required skill is absent from a non-empty skill list", () => {
    const req = request({
      profile: { id: "u", skills: [{ skillId: "s1", label: "Writing" }], interests: [] },
    });
    assert.deepEqual(ids(generateNextSteps(req, dataset(skillStep))), ["learn-x"]);
  });

  it("does not recommend when the user has the skill (case/space-insensitive, by id or label)", () => {
    for (const skill of [
      { skillId: "s1", label: "  data   ANALYSIS " },
      { skillId: "DATA analysis", label: "Other" },
    ]) {
      const req = request({ profile: { id: "u", skills: [skill], interests: [] } });
      assert.deepEqual(generateNextSteps(req, dataset(skillStep)), []);
    }
  });

  it("honours minProficiency and treats unknown proficiency as no evidence", () => {
    const step = record("level-up", {
      closesGap: { missingSkills: [{ skill: "sql", minProficiency: 3 }] },
    });
    const withLevel = (proficiency?: 1 | 2 | 3 | 4 | 5) =>
      request({
        profile: {
          id: "u",
          skills: [{ skillId: "sql", label: "SQL", proficiency }],
          interests: [],
        },
      });
    assert.deepEqual(ids(generateNextSteps(withLevel(2), dataset(step))), ["level-up"]);
    assert.deepEqual(generateNextSteps(withLevel(3), dataset(step)), []);
    assert.deepEqual(generateNextSteps(withLevel(undefined), dataset(step)), []);
  });

  it("evaluates education only when the level is known", () => {
    const step = record("degree", { closesGap: { educationLevelNotIn: ["Bachelor", "Master"] } });
    const withEdu = (educationLevel?: string) =>
      request({
        profile: { id: "u", skills: [], interests: [], demographics: { educationLevel } },
      });
    assert.deepEqual(ids(generateNextSteps(withEdu("high school"), dataset(step))), ["degree"]);
    assert.deepEqual(generateNextSteps(withEdu(" bachelor "), dataset(step)), []);
    assert.deepEqual(generateNextSteps(withEdu(undefined), dataset(step)), []);
    assert.deepEqual(generateNextSteps(withEdu("   "), dataset(step)), []);
  });

  it("supports all four categories", () => {
    const data = dataset(
      record("e", { category: "education" }),
      record("c", { category: "credential" }),
      record("x", { category: "experience" }),
      record("a", { category: "application" }),
    );
    const out = generateNextSteps(request(), data);
    assert.deepEqual(
      out.map((s) => s.category).sort(),
      ["application", "credential", "education", "experience"],
    );
  });

  it("normalizeLabel collapses case, whitespace and compatibility forms", () => {
    assert.equal(normalizeLabel("  Ｃ++   Basics "), "c++ basics");
  });
});

// ------------------------------------------------- 9, 14: duplicates / sharing

describe("deduplication", () => {
  it("14. one record shared by several matched careers is returned once", () => {
    const data = dataset(record("shared", { careerIds: ["career-a", "career-b"] }));
    const req = request({
      matches: [
        { careerId: "career-a", score: 0.4 },
        { careerId: "career-b", score: 0.8 },
      ],
    });
    assert.deepEqual(ids(generateNextSteps(req, data)), ["shared"]);
  });

  it("9. records with the same dedupeKey collapse to one step", () => {
    const data = dataset(
      record("learn-a", { careerIds: ["career-a"], dedupeKey: "learn-python" }),
      record("learn-b", { careerIds: ["career-b"], dedupeKey: "learn-python" }),
    );
    const req = request({
      matches: [
        { careerId: "career-a", score: 0.5 },
        { careerId: "career-b", score: 0.9 },
      ],
    });
    assert.deepEqual(ids(generateNextSteps(req, data)), ["learn-b"]);
  });

  it("9. similar titles with different ids/keys are NOT merged", () => {
    const data = dataset(
      record("n1", { title: "Nursing Certificate" }),
      record("n2", { title: "Nursing Certificate", dedupeKey: "other" }),
    );
    assert.equal(generateNextSteps(request(), data).length, 2);
  });

  it("9. duplicate matches for one career are collapsed to the best score", () => {
    const data = dataset(record("s1"));
    const req = request({
      matches: [
        { careerId: "career-a", score: 0.1 },
        { careerId: "career-a", score: 0.7 },
      ],
    });
    assert.deepEqual(ids(generateNextSteps(req, data)), ["s1"]);
  });

  it("a dropped duplicate's prerequisite links point at the kept step", () => {
    const data = dataset(
      record("base", { priority: 5 }),
      record("dup-1", { dedupeKey: "k", priority: 1 }),
      record("dup-2", { dedupeKey: "k", priority: 2 }),
      record("after", { prerequisiteStepIds: ["dup-2"], priority: 0 }),
    );
    const out = ids(generateNextSteps(request(), data));
    assert.equal(out.includes("dup-2"), false);
    assert.ok(out.indexOf("dup-1") < out.indexOf("after"));
  });

  it("output validation removes repeated ids", () => {
    const result = validateNextStepOutput([
      { id: "a", title: "A" },
      { id: "a", title: "A again" },
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value.length, 1);
  });
});

// ------------------------------------------------------------------- 10: order

describe("prioritization and determinism", () => {
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

  it("10. applies prerequisites, then gap, priority, relevance, id", () => {
    const out = ids(generateNextSteps({ matches, profile }, dataset(...records)));
    assert.deepEqual(out, [
      "d-gap-prio", // confirmed gap beats everything not blocked
      "c-gap",
      "b-generic", // prerequisite of e-prereq, priority 1
      "e-prereq", // priority 0 but must follow its prerequisite
      "a-generic", // priority 2
      "z-generic-hi", // no priority: last
    ]);
  });

  it("10. output is identical for any input ordering and repeated runs", () => {
    const expected = generateNextSteps({ matches, profile }, dataset(...records));
    const shuffles = [
      [...records].reverse(),
      [records[3], records[0], records[5], records[1], records[4], records[2]],
    ];
    for (const shuffled of shuffles) {
      for (const m of [matches, [...matches].reverse()]) {
        assert.deepEqual(generateNextSteps({ matches: m, profile }, dataset(...shuffled)), expected);
      }
    }
    assert.deepEqual(generateNextSteps({ matches, profile }, dataset(...records)), expected);
  });

  it("ties on relevance fall back to id order; higher score first", () => {
    const data = dataset(
      record("b", { careerIds: ["career-a"] }),
      record("a", { careerIds: ["career-a"] }),
      record("c", { careerIds: ["career-b"] }),
    );
    assert.deepEqual(ids(generateNextSteps({ matches, profile }, data)), ["c", "a", "b"]);
  });

  it("does not mutate its inputs", () => {
    const req = deepFreeze(request({ matches }));
    const data = deepFreeze(dataset(...records));
    assert.doesNotThrow(() => generateNextSteps(req, data));
  });
});

// ------------------------------------------------------- 13: output contract

describe("output contract", () => {
  it("13. generated steps conform to NextStep and expose no ranking metadata", () => {
    const data = dataset(
      record("full", {
        description: "d",
        estimatedWeeks: 0,
        resourceUrl: "https://example.com/x",
        priority: 3,
        dedupeKey: "k",
        closesGap: undefined,
      }),
    );
    const steps: NextStep[] = generateNextSteps(request(), data);
    const checked = validateNextStepOutput(steps);
    assert.equal(checked.ok, true);
    assert.deepEqual(steps, [
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

  it("12. output validation rejects bad urls, weeks, categories and titles", () => {
    const bad: unknown[] = [
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
      assert.equal(validateNextStepOutput([step]).ok, false, JSON.stringify(step));
    }
    assert.equal(validateNextStepOutput({}).ok, false);
  });

  it("output validation strips non-NextStep fields", () => {
    const result = validateNextStepOutput([{ id: "a", title: "A", rank: 1, priority: 2 }]);
    assert.deepEqual(result.ok && result.value, [{ id: "a", title: "A" }]);
  });
});

// ------------------------------------------------------------------ API route

describe("POST /api/steps", () => {
  it("valid request with empty bundled data returns 200 { steps: [] }", async () => {
    const response = await post(VALID_BODY);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { steps: [] });
  });

  it("empty match list returns 200 { steps: [] }", async () => {
    const response = await post(JSON.stringify(request({ matches: [] })));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { steps: [] });
  });

  it("4. invalid or empty JSON returns 400", async () => {
    for (const body of ["{not json", "", "undefined"]) {
      const response = await post(body);
      assert.equal(response.status, 400, body);
      const json = (await response.json()) as { error: string };
      assert.equal(typeof json.error, "string");
    }
  });

  it("5/6/7. validation failures return 400 with a field-level message", async () => {
    const cases: Array<[unknown, RegExp]> = [
      [{}, /matches is required/],
      [{ matches: [] }, /profile is required/],
      [request({ matches: [{ careerId: "", score: 1 }] }), /matches\[0\]\.careerId/],
      [{ ...request(), matches: [{ careerId: "a", score: "high" }] }, /matches\[0\]\.score/],
    ];
    for (const [body, pattern] of cases) {
      const response = await post(JSON.stringify(body));
      assert.equal(response.status, 400);
      const json = (await response.json()) as { error: string };
      assert.match(json.error, pattern);
    }
  });

  it("rejects an oversized body with 400", async () => {
    const response = await post("[" + "0,".repeat(600_000) + "0]");
    assert.equal(response.status, 400);
  });

  it("returns steps with an injected valid dataset", async () => {
    const data = dataset(record("s1"));
    const response = await handleNextStepsRequest(
      new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }),
      () => ({ ok: true, dataset: data, isEmpty: false }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(ids(((await response.json()) as { steps: NextStep[] }).steps), ["s1"]);
  });

  it("8. malformed server-side data returns 500 without internal details", async () => {
    const malformed: DatasetLoadResult = parseEducationStepDataset({
      steps: [record("bad", { category: "secret-internal-detail" })],
    });
    assert.equal(malformed.ok, false);
    const response = await handleNextStepsRequest(
      new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }),
      () => malformed,
    );
    assert.equal(response.status, 500);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { error: "Next step data is currently unavailable." });
    assert.equal(text.includes("secret-internal-detail"), false);
  });

  it("unexpected failures return a generic 500 without leaking details", async () => {
    const response = await handleNextStepsRequest(
      new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }),
      () => {
        throw new Error("db password is hunter2");
      },
    );
    assert.equal(response.status, 500);
    const text = await response.text();
    assert.equal(text.includes("hunter2"), false);
    assert.deepEqual(JSON.parse(text), { error: "Next steps could not be generated." });
  });

  it("invalid generated output returns 500", async () => {
    // Bypass dataset validation to simulate a bug producing an invalid step.
    const bad: DatasetLoadResult = {
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
    const response = await handleNextStepsRequest(
      new Request("http://localhost/api/steps", { method: "POST", body: VALID_BODY }),
      () => bad,
    );
    assert.equal(response.status, 500);
  });
});
