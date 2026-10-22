// Team 6: framework-independent request handler for POST /api/steps.
//
// src/app/api/steps/route.ts delegates here. Keeping the logic out of the
// route file keeps the route thin and lets tests inject a data loader, because
// Next.js route files may only export route handlers.

import { generateNextSteps, loadEducationStepData } from "../next-steps";
import type {
  DatasetLoadResult,
  NextStepsErrorResponse,
  NextStepsResponse,
} from "../next-steps-types";
import {
  validateNextStepOutput,
  validateNextStepsRequest,
} from "../next-steps-validation";

const MAX_BODY_CHARS = 1_000_000;
const MAX_REPORTED_ISSUES = 5;

function errorResponse(status: 400 | 500, error: string): Response {
  const body: NextStepsErrorResponse = { error };
  return Response.json(body, { status });
}

export async function handleNextStepsRequest(
  request: Request,
  loadData: () => DatasetLoadResult = () => loadEducationStepData(),
): Promise<Response> {
  // 1-2. Receive and parse JSON safely.
  let text: string;
  try {
    text = await request.text();
  } catch {
    return errorResponse(400, "Request body could not be read.");
  }
  if (text.length > MAX_BODY_CHARS) {
    return errorResponse(400, "Request body is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  // 3. Validate input.
  const parsed = validateNextStepsRequest(body);
  if (!parsed.ok) {
    const shown = parsed.errors.slice(0, MAX_REPORTED_ISSUES).join(" ");
    const more =
      parsed.errors.length > MAX_REPORTED_ISSUES
        ? ` (${parsed.errors.length - MAX_REPORTED_ISSUES} more)`
        : "";
    return errorResponse(400, `Invalid request. ${shown}${more}`);
  }

  try {
    // 4. Load and validate education-step data (server-side data problem = 500).
    const data = loadData();
    if (!data.ok) {
      console.error("[api/steps] education-steps data is malformed:", data.errors);
      return errorResponse(500, "Next step data is currently unavailable.");
    }

    // 5. Run the recommendation algorithm.
    const generated = generateNextSteps(parsed.value, data.dataset);

    // 6. Validate output.
    const output = validateNextStepOutput(generated);
    if (!output.ok) {
      console.error("[api/steps] generated steps failed validation:", output.errors);
      return errorResponse(500, "Next steps could not be generated.");
    }

    // 7. Consistent JSON response.
    const body: NextStepsResponse = { steps: output.value };
    return Response.json(body, { status: 200 });
  } catch (error) {
    // Log only the error type: messages could contain user data.
    console.error(
      "[api/steps] unexpected failure:",
      error instanceof Error ? error.name : typeof error,
    );
    return errorResponse(500, "Next steps could not be generated.");
  }
}
