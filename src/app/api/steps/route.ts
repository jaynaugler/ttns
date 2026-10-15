// Data-driven next step generation (Team 6)
//
// POST /api/steps
//   body:  { matches: CareerMatch[], profile: UserProfile }
//   200:   { steps: NextStep[] }
//   400:   { error: string }   invalid request
//   500:   { error: string }   malformed server data / unexpected failure
//
// Logic lives in src/lib/next-steps/handler.ts so this file stays thin.

import { handleNextStepsRequest } from "../../../lib/next-steps/handler";

export async function POST(request: Request): Promise<Response> {
  return handleNextStepsRequest(request);
}
