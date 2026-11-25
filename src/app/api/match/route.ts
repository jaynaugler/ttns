import { NextResponse } from "next/server";

import skills from "@/data/skills.json";
import { matchCareers } from "@/lib/career-data";

import type { MatchRequest } from "@/types/careers";

const validSkills = new Set<string>(skills);

function isValidMatchRequest(value: unknown): value is MatchRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("skills" in value)) {
    return false;
  }

  const request = value as Record<string, unknown>;

  if (
    !Array.isArray(request.skills) ||
    request.skills.length === 0 ||
    request.skills.length > skills.length
  ) {
    return false;
  }

  if (
    !request.skills.every(
      (skill) => typeof skill === "string" && validSkills.has(skill),
    )
  ) {
    return false;
  }

  if (
    request.alpha !== undefined &&
    (typeof request.alpha !== "number" ||
      !Number.isFinite(request.alpha) ||
      request.alpha < 0 ||
      request.alpha > 1)
  ) {
    return false;
  }

  if (
    request.limit !== undefined &&
    (typeof request.limit !== "number" ||
      !Number.isInteger(request.limit) ||
      request.limit < 10 ||
      request.limit > 1000 ||
      request.limit % 10 !== 0)
  ) {
    return false;
  }

  if (request.selectedCareerCode !== undefined && (
    typeof request.selectedCareerCode !== "string" ||
    !/^\d{5}$/.test(request.selectedCareerCode)
  )) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidMatchRequest(body)) {
    return NextResponse.json(
      {
        error: "Provide valid skills and an alpha between 0 and 1.",
      },
      { status: 400 },
    );
  }

  const uniqueSkills = [...new Set(body.skills)];

  const alpha = body.alpha ?? 0.3;

  // Rank all matching occupations once, so the saved career's current rank
  // is known even when it falls outside the initially requested top ten.
  const allMatches = matchCareers(uniqueSkills, alpha, Number.MAX_SAFE_INTEGER);
  const selectedIndex = body.selectedCareerCode
    ? allMatches.findIndex((match) => match.code === body.selectedCareerCode)
    : -1;
  const selectedRank = selectedIndex >= 0 ? selectedIndex + 1 : null;
  const requestedLimit = body.limit ?? 10;
  const includeSelectedThrough = selectedRank
    ? Math.ceil(selectedRank / 10) * 10
    : 0;
  const limit = Math.min(1000, Math.max(requestedLimit, includeSelectedThrough));
  const results = allMatches.slice(0, limit);
  const hasMore = allMatches.length > limit;

  return NextResponse.json({ results, hasMore, selectedRank }, { status: 200 });
}