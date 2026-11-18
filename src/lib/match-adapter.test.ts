// Tests for the Team 4 → Teams 5/6 match adapters.
// Run with `pnpm run test:projection` (compiled by tsconfig.projection-test.json).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CareerMatch as TeamFourMatch } from "@/types/careers";
import {
  missingSkillCounts,
  toProjectable,
  toStepsMatches,
} from "./match-adapter";

const T4 = "Administrative assistants";

function teamFourMatch(overrides: Partial<TeamFourMatch> = {}): TeamFourMatch {
  return {
    code: "13110",
    title: T4,
    matchPercentage: 85,
    careerSkillCoverage: 100,
    userSkillCoverage: 50,
    requiredSkills: ["Writing"],
    matchedSkills: ["Writing"],
    missingSkills: ["Numeracy"],
    medianWage: 26.44,
    isAnnual: false,
    wageReferencePeriod: "2023-2024",
    outlook: "Good",
    outlookRegion: "Nova Scotia",
    outlookReleaseDate: "2025-11-21",
    rationale: "You match 1 of 1 listed career skills.",
    ...overrides,
  };
}

describe("toProjectable", () => {
  it("maps code→careerId and matchPercentage→score 1:1", () => {
    const [out] = toProjectable([teamFourMatch()]);
    assert.ok(out);
    assert.equal(out.careerId, "13110");
    assert.equal(out.score, 85);
  });

  it("wraps the single rationale string in an array", () => {
    const [out] = toProjectable([teamFourMatch()]);
    assert.deepEqual(out?.rationale, ["You match 1 of 1 listed career skills."]);
  });

  it("keeps the skill breakdowns for Team 5", () => {
    const [out] = toProjectable([teamFourMatch()]);
    assert.deepEqual(out?.matchedSkills, ["Writing"]);
    assert.deepEqual(out?.missingSkills, ["Numeracy"]);
  });

  it("tolerates persisted entries with missing breakdowns", () => {
    const [out] = toProjectable([
      teamFourMatch({ matchedSkills: undefined, missingSkills: undefined, rationale: undefined }),
    ]);
    assert.deepEqual(out?.matchedSkills, []);
    assert.deepEqual(out?.missingSkills, []);
    assert.deepEqual(out?.rationale, []);
  });
});

describe("toStepsMatches", () => {
  it("produces plain shared CareerMatch objects", () => {
    const [out] = toStepsMatches([teamFourMatch()]);
    assert.equal(out?.careerId, "13110");
    assert.equal(out?.score, 85);
    assert.deepEqual(out?.rationale, ["You match 1 of 1 listed career skills."]);
    assert.equal("matchedSkills" in (out ?? {}), false);
  });

  it("caps the list at 500 like Team 6's request validator", () => {
    const matches = Array.from({ length: 600 }, (_, i) =>
      teamFourMatch({ code: `a${i}`, matchPercentage: i }),
    );
    assert.equal(toStepsMatches(matches).length, 500);
  });
});

describe("missingSkillCounts", () => {
  it("counts matches per missing skill, deduplicing within one match", () => {
    const counts = missingSkillCounts([
      teamFourMatch(),
      teamFourMatch({ code: "13111", missingSkills: ["Numeracy", "Instructing"] }),
      teamFourMatch({ code: "13112", missingSkills: [] }),
    ]);
    assert.equal(counts.get("Numeracy"), 2);
    assert.equal(counts.get("Instructing"), 1);
    assert.equal(counts.size, 2);
  });

  it("returns an empty map for no matches", () => {
    assert.equal(missingSkillCounts([]).size, 0);
  });
});
