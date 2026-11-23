import "server-only";

import occupations from "@/data/occupations.json";
import skillToOccupation from "@/data/skillToOccupation.json";
import wages from "@/data/wages.json";
import jobOutlookData from "@/data/job_outlook.json";


interface JobOutlook {
  nocCode: string;
  title: string;
  outlook: string;
  province: string;
  economicRegionCode: string;
  economicRegionName: string;
  releaseDate: string;
  lang: string;
}

const jobOutlook: JobOutlook[] = Array.isArray(jobOutlookData)
  ? (jobOutlookData as JobOutlook[])
  : [];

import type {
  CareerMatch,
  Occupation,
  SkillToOccupation,
} from "@/types/careers";

const careerList: Occupation[] = occupations;
const mappings: SkillToOccupation[] = skillToOccupation;

// Index skill mappings by occupation code.
const mappingByCode = new Map(
  mappings.map((item) => [item.code, item]),
);

// Index wages by occupation code.
const wageByCode = new Map(
  wages.map((item) => [item.code, item]),
);

// Only use English Nova Scotia outlook records.
// Province-wide economic region code: 1200.
const outlookByCode = new Map(
  jobOutlook
    .filter(
      (item) =>
        item.province === "NS" &&
        item.economicRegionCode === "1200" &&
        item.lang === "EN",
    )
    .map((item) => [
      item.nocCode.replace(/^NOC_/, ""),
      item,
    ]),
);

// Preserve the lookup from your earlier lessons.
export function getCareerWithSkill(code: string) {
  const career = careerList.find(
    (item) => item.code === code,
  );

  if (!career) return null;

  return {
    ...career,
    skills: mappingByCode.get(code)?.skills ?? [],
  };
}

// Calculate one occupation's coverage values.
export function calculateCoverage(
  userSkills: string[],
  careerSkills: string[],
) {
  const user = new Set(userSkills);
  const career = new Set(careerSkills);

  const requiredSkills = [...career];

  const matchedSkills = requiredSkills.filter(
    (skill) => user.has(skill),
  );

  const missingSkills = requiredSkills.filter(
    (skill) => !user.has(skill),
  );

  const careerSkillCoverage =
    career.size === 0
      ? 0
      : (matchedSkills.length / career.size) * 100;

  const userSkillCoverage =
    user.size === 0
      ? 0
      : (matchedSkills.length / user.size) * 100;

  return {
    requiredSkills,
    matchedSkills,
    missingSkills,
    careerSkillCoverage,
    userSkillCoverage,
  };
}

// Preserve the helper from Lesson 6.
export function scoreCareerSkills(
  userSkills: string[],
  careerSkills: string[],
) {
  const coverage = calculateCoverage(
    userSkills,
    careerSkills,
  );

  return {
    matchedSkills: coverage.matchedSkills,
    matchPercentage: Math.round(
      coverage.careerSkillCoverage,
    ),
  };
}

// Hybrid = alpha * career coverage
//        + (1 - alpha) * user coverage.
export function hybridScore(
  userSkills: string[],
  careerSkills: string[],
  alpha = 0.7,
): number {
  const coverage = calculateCoverage(
    userSkills,
    careerSkills,
  );

  return hybridScoreFromCoverage(coverage, alpha);
}

// Scores from a coverage object the caller already computed. Value-identical
// to hybridScore: its early returns for an empty user or empty career list
// are covered by arithmetic (0 matched skills → 0 on both coverages → 0).
function hybridScoreFromCoverage(
  coverage: ReturnType<typeof calculateCoverage>,
  alpha: number,
): number {
  if (!Number.isFinite(alpha)) {
    throw new Error("Invalid alpha");
  }

  const weight = Math.max(0, Math.min(1, alpha));

  return (
    weight * coverage.careerSkillCoverage +
    (1 - weight) * coverage.userSkillCoverage
  );
}

// Explain why the occupation was recommended.
function buildRationale(
  matchedSkills: string[],
  userCount: number,
  careerCount: number,
): string {
  const count = matchedSkills.length;

  const examples = matchedSkills
    .slice(0, 3)
    .join(", ");

  return (
    `You match ${count} of ${careerCount} ` +
    `listed career skills. ` +
    `${count} of your ${userCount} selected skills ` +
    `are relevant to this occupation. ` +
    (examples
      ? `Shared skills include ${examples}.`
      : "")
  );
}

// Rank all occupations and return up to the requested number.
export function matchCareers(
  userSkills: string[],
  alpha = 0.7,
  limit = 10,
): CareerMatch[] {
  const selected = [...new Set(userSkills)];

  if (selected.length === 0) return [];

  const results: CareerMatch[] = [];

  for (const career of careerList) {
    const mapping = mappingByCode.get(career.code);

    // Skip occupations without skill mapping data.
    if (!mapping || mapping.skills.length === 0) {
      continue;
    }

    const coverage = calculateCoverage(
      selected,
      mapping.skills,
    );

    // Skip occupations with no matching skills.
    if (coverage.matchedSkills.length === 0) {
      continue;
    }

    const matchPercentage = hybridScoreFromCoverage(
      coverage,
      alpha,
    );

    const wage = wageByCode.get(career.code);
    const outlook = outlookByCode.get(career.code);

    results.push({
      code: career.code,
      title: career.title,

      matchPercentage,
      careerSkillCoverage:
        coverage.careerSkillCoverage,
      userSkillCoverage:
        coverage.userSkillCoverage,

      requiredSkills: coverage.requiredSkills,
      matchedSkills: coverage.matchedSkills,
      missingSkills: coverage.missingSkills,

      medianWage: wage?.medianWage ?? null,
      isAnnual: wage?.isAnnual ?? null,
      wageReferencePeriod:
        wage?.referencePeriod ?? null,

      outlook: outlook?.outlook ?? null,
      outlookRegion:
        outlook?.economicRegionName ?? null,
      outlookReleaseDate:
        outlook?.releaseDate ?? null,

      rationale: buildRationale(
        coverage.matchedSkills,
        selected.length,
        coverage.requiredSkills.length,
      ),
    });
  }

  return results
    .sort(
      (a, b) =>
        b.matchPercentage - a.matchPercentage ||
        b.matchedSkills.length -
          a.matchedSkills.length ||
        a.code.localeCompare(b.code),
    )
    .slice(0, limit);
}