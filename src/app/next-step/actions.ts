"use server";

import jobOutlookData from "@/data/job_outlook.json";
import {
  isNocCode,
  isNovaScotiaOutlook,
  outlookCode,
  type OutlookRecord,
} from "@/lib/career-summary";

// Team 5 — The Next Step. job_outlook.json is 45 MB, so it stays on the
// server: /next-step asks for the Nova Scotia records of the user's Top 3
// picks only, and getCareerSummary does the rest in the browser.

// The Top 3 picks (MAX_TOP_CAREERS in src/lib/journey-progress.ts) plus the
// career of the path chosen on /updated-pathways. Not imported: that module
// is "use client", so on the server its exports are client references.
const MAX_CODES = 4;

const nsOutlookByCode = new Map<string, OutlookRecord>(
  (Array.isArray(jobOutlookData) ? (jobOutlookData as OutlookRecord[]) : [])
    .filter(isNovaScotiaOutlook)
    .map((record) => [
      outlookCode(record),
      {
        nocCode: record.nocCode,
        outlook: record.outlook,
        employmentTrends: record.employmentTrends,
        releaseDate: record.releaseDate,
        province: record.province,
        economicRegionCode: record.economicRegionCode,
        lang: record.lang,
      },
    ]),
);

// The Nova Scotia outlook records for up to MAX_CODES NOC codes.
// Anything that isn't a five-digit code is ignored; unknown codes return
// nothing.
export async function getNovaScotiaOutlooks(codes: unknown): Promise<OutlookRecord[]> {
  if (!Array.isArray(codes)) return [];
  return [...new Set(codes.filter(isNocCode))]
    .slice(0, MAX_CODES)
    .flatMap((code) => nsOutlookByCode.get(code) ?? []);
}
