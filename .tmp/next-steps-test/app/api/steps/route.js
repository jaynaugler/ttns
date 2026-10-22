"use strict";
// Data-driven next step generation (Team 6)
//
// POST /api/steps
//   body:  { matches: CareerMatch[], profile: UserProfile }
//   200:   { steps: NextStep[] }
//   400:   { error: string }   invalid request
//   500:   { error: string }   malformed server data / unexpected failure
//
// Logic lives in src/lib/next-steps/handler.ts so this file stays thin.
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const handler_1 = require("../../../lib/next-steps/handler");
async function POST(request) {
    return (0, handler_1.handleNextStepsRequest)(request);
}
