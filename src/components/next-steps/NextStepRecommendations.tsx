"use client";

// Team 6's recommendations for one career, as a section of /next-step.
// The request logic is Joshua Xie's from #51 (originally the whole
// /next-step page), moved here unchanged so the Team 5 summary page can
// mount it: a browser-local guest ID, buildStepsRequest for one current
// match, and an abort-safe POST /api/steps keyed on the request. Skills are
// sent as unconfirmed (his default), so missing skills stay unknown.
//
// The section only appears when Team 6 returns at least one step. Missing
// data, no steps, an error or a failed load all render nothing.

import { useEffect, useState } from "react";

import NextStepsList from "@/components/next-steps/NextStepsList";
import { ensureGuestJourneyId, type ProfileData } from "@/lib/journey-progress";
import { buildStepsRequest } from "@/lib/profile-adapter";
import type { CareerMatch } from "@/types/careers";
import type { NextStep } from "@/types/outcomes";

type Result = { key: string; steps: NextStep[] };

export interface NextStepRecommendationsProps {
  // The career to recommend for: the one the page leads with.
  careerCode: string;
  // The journey data the request is built from.
  guestId?: string;
  savedMatches?: CareerMatch[];
  savedSkills?: string[];
  profile?: ProfileData;
  // The page's card style, so the section matches its neighbours.
  className?: string;
}

export function NextStepRecommendations({
  careerCode,
  guestId,
  savedMatches,
  savedSkills,
  profile,
  className = "",
}: NextStepRecommendationsProps) {
  const [result, setResult] = useState<Result | null>(null);

  // The page only renders this once the step is unlocked.
  useEffect(() => {
    if (profile && !guestId) ensureGuestJourneyId();
  }, [profile, guestId]);

  const request = buildStepsRequest({
    guestId,
    selectedCareerCode: careerCode,
    savedMatches,
    savedSkills,
    profile,
    skillsComplete: false,
  });
  // A primitive key prevents unrelated renders from repeating the request.
  const requestKey = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!requestKey) return;
    const key = requestKey;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Request failed");
        const data: { steps?: unknown } = await response.json();
        if (!Array.isArray(data.steps)) throw new Error("Invalid response");
        if (!controller.signal.aborted) setResult({ key, steps: data.steps });
      } catch {
        // A failed load shows nothing, like no steps.
        if (!controller.signal.aborted) setResult({ key, steps: [] });
      }
    }
    void load();
    return () => controller.abort();
  }, [requestKey]);

  const selected = savedMatches?.find((match) => match.code === careerCode);
  const steps = result && result.key === requestKey ? result.steps : [];
  const show = selected !== undefined && steps.length > 0;

  return (
    <>
      {/* Always in the DOM and only its text changes, so screen readers
          announce the cards when they appear. */}
      <div role="status" className="sr-only">
        {show
          ? `${steps.length} recommended next ${steps.length === 1 ? "step" : "steps"} for ${selected.title}.`
          : ""}
      </div>

      {show && (
        // NextStepsList (Team 6) owns the heading and its muted line. Scoped
        // overrides match the page's cards without editing it: the h2 at the
        // page's 24px with normal spacing, and full text colour for the
        // muted line, which measured 4.47:1 in light mode (under 4.5).
        <div
          className={`${className} [&_h2]:text-2xl [&_h2]:tracking-normal sm:[&_h2]:text-2xl [&_.text-muted-foreground]:text-foreground`}
        >
          <NextStepsList steps={steps} description="Small actions you can take now." />
        </div>
      )}
    </>
  );
}
