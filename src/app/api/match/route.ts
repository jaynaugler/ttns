// Backend career matching logic (Team 4)


// Backend career matching logic (Team 4)
//
// POST /api/match
//   body:  { skills: string[], alpha?: number, limit?: number }
//            skills  - skill names exactly as in public/data/skills.json
//            alpha   - optional weight from 0 to 1 (default 0.7)
//            limit   - optional number of matches to return (default 10)
//   200:   { matches: ScoredCareerMatch[] }   best match first
//   400:   { error: string }                  invalid request
//
// Each match has careerId, score (0-100), rationale, matchedSkills and
// missingSkills. Titles and wages are looked up in src/data/careers.json
// by careerId. The scoring itself lives in src/lib/matching-algo.ts so
// this file only checks the request and passes it on.

import skills from "../../../../public/data/skills.json";
import { matchCareers } from "@/lib/matching-algo";

const validSkills = new Set<string>(skills);
const MAX_LIMIT = 100;

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Read the JSON body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badRequest('Request body must be an object like { "skills": [...] }.');
  }

  const { skills: selected, alpha, limit } = body as Record<string, unknown>;

  // 2. Check the skills: a non-empty list of known skill names.
  if (!Array.isArray(selected) || selected.length === 0) {
    return badRequest("skills must be a non-empty list of skill names.");
  }
  if (selected.length > skills.length) {
    return badRequest("skills has more entries than there are skills.");
  }
  const unknown = selected.filter(
    (skill) => typeof skill !== "string" || !validSkills.has(skill),
  );
  if (unknown.length > 0) {
    return badRequest(
      `Unknown skill: ${unknown.map((skill) => JSON.stringify(skill)).join(", ")}.`,
    );
  }

  // 3. Check the optional alpha and limit.
  if (
    alpha !== undefined &&
    (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
  ) {
    return badRequest("alpha must be a number from 0 to 1.");
  }
  if (
    limit !== undefined &&
    (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)
  ) {
    return badRequest(`limit must be a whole number from 1 to ${MAX_LIMIT}.`);
  }

  // 4. Score the careers and return the best ones.
  const matches = matchCareers(selected as string[], {
    alpha: alpha as number | undefined,
    limit: limit as number | undefined,
  });

  return Response.json({ matches }, { status: 200 });
}
