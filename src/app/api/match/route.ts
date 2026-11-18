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

  const alpha = body.alpha ?? 0.7;

  const results = matchCareers(uniqueSkills, alpha);

  return NextResponse.json({ results }, { status: 200 });
}
