"use client";

// Team 6's recommendations for one career, as a section of /next-step.
// The request logic and its states are Joshua Xie's from #51 (originally the
// whole /next-step page), moved here unchanged so the Team 5 summary page can
// mount it: a browser-local guest ID, buildStepsRequest for one current
// match, an abort-safe POST /api/steps keyed on the request, the "my skills
// are complete" confirmation, and NextStepsList's loading / error /
// general-guidance / recommendation states.

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import NextStepsList from "@/components/next-steps/NextStepsList";
import { ensureGuestJourneyId, type ProfileData } from "@/lib/journey-progress";
import { buildStepsRequest } from "@/lib/profile-adapter";
import type { CareerMatch } from "@/types/careers";
import type { NextStep } from "@/types/outcomes";

type Result = { key: string; steps: NextStep[]; error?: string };

// Links on the light card; brand yellow in dark mode, where the global link
// blue is too dark on grey. Same as the summary page's links.
const linkClass =
  "inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4 break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:text-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)]";

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
  const headingId = useId();
  const [skillsComplete, setSkillsComplete] = useState(false);
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
    skillsComplete,
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
        if (!controller.signal.aborted) {
          setResult({ key, steps: [], error: "Please try again later or return to your career matches." });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [requestKey]);

  const selected = savedMatches?.find((match) => match.code === careerCode);
  const current = result && result.key === requestKey ? result : null;

  // Always in the DOM and only its text changes, so screen readers announce
  // the outcome. NextStepsList's error box is role="alert" already, so errors
  // aren't repeated here.
  const announcement =
    !selected || !current || current.error
      ? ""
      : current.steps.length > 0
        ? `${current.steps.length} recommended next ${current.steps.length === 1 ? "step" : "steps"} for ${selected.title}.`
        : `No specific recommendations for ${selected.title} yet. General guidance is shown.`;

  return (
    // NextStepsList (Team 6) owns the heading and its muted lines. Scoped
    // overrides match the page's cards without editing it: the h2 at the
    // page's 24px with normal spacing, and full text colour for the muted
    // lines, which measured 4.47:1 in light mode (under 4.5).
    <div
      className={`${className} [&_h2]:text-2xl [&_h2]:tracking-normal sm:[&_h2]:text-2xl [&_.text-muted-foreground]:text-foreground`}
    >
      <div role="status" className="sr-only">
        {announcement}
      </div>

      {!profile ? (
        <MissingData headingId={headingId}>
          Save your{" "}
          <Link className={linkClass} href="/profile">
            profile
          </Link>{" "}
          to see recommendations.
        </MissingData>
      ) : !selected ? (
        <MissingData headingId={headingId}>
          Choose a career in{" "}
          <Link className={linkClass} href="/current-pathways">
            Current Pathways
          </Link>{" "}
          to see recommendations.
        </MissingData>
      ) : !guestId ? (
        <MissingData headingId={headingId}>
          Preparing your guest journey. If this does not finish, enable browser
          storage and reload.
        </MissingData>
      ) : (
        <div className="space-y-6">
          <NextStepsList
            steps={current ? current.steps : []}
            description={`For ${selected.title} (NOC ${selected.code}), based on your current match. Small actions today can open up new career opportunities.`}
            isLoading={!current}
            error={current ? (current.error ?? null) : null}
          />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-foreground/30 p-4 text-sm has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red dark:has-focus-visible:outline-[var(--dm-brand-yellow)]">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-red dark:accent-[var(--dm-brand-yellow)]"
              checked={skillsComplete}
              onChange={(event) => setSkillsComplete(event.target.checked)}
            />
            <span>
              My selected skills include all the skills I have from the
              available list. Use them to suggest skills to develop. Without
              this confirmation, missing skills are treated as unknown.
            </span>
          </label>
          <p className="text-sm">
            <Link className={linkClass} href="/current-pathways">
              Change your career choice
            </Link>
            {" · "}
            <Link className={linkClass} href="/updated-pathways">
              Back to projections
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

// A missing-data state, under the same heading NextStepsList uses.
function MissingData({
  headingId,
  children,
}: {
  headingId: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2 id={headingId} className="text-2xl font-bold">
        Your recommended next steps
      </h2>
      <p>{children}</p>
    </section>
  );
}
