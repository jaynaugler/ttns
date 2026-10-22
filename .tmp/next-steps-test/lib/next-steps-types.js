"use strict";
// Team 6 (Next Step Generation): request, response, dataset and result types.
//
// Shared interfaces (CareerMatch, NextStep, UserProfile) are imported from
// src/types and are NOT redefined here. Only Team 6-specific types live below.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXT_STEP_CATEGORIES = void 0;
exports.isNextStepCategory = isNextStepCategory;
// Record<NextStepCategory, true> makes this list exhaustive at compile time:
// if the shared union gains a category, this file stops compiling until updated.
const CATEGORY_LOOKUP = {
    education: true,
    credential: true,
    experience: true,
    application: true,
};
exports.NEXT_STEP_CATEGORIES = Object.keys(CATEGORY_LOOKUP);
function isNextStepCategory(value) {
    return typeof value === "string" && Object.hasOwn(CATEGORY_LOOKUP, value);
}
