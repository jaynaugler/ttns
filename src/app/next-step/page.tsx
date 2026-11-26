"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JourneyStepPage } from "@/components/journey-step-page";
import NextStepsList from "@/components/next-steps/NextStepsList";
import { isPageUnlocked } from "@/lib/journey";
import { ensureGuestJourneyId, useJourneyProgress } from "@/lib/journey-progress";
import { buildStepsRequest } from "@/lib/profile-adapter";
import type { NextStep } from "@/types/outcomes";

type Result = { key: string; steps: NextStep[]; error?: string };

export default function NextStepPage() {
  const { journey, hydrated } = useJourneyProgress();
  const [skillsComplete, setSkillsComplete] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const unlocked = hydrated && isPageUnlocked("next-step", journey.completed);

  useEffect(() => {
    if (unlocked && journey.profile && !journey.guestId) ensureGuestJourneyId();
  }, [unlocked, journey.profile, journey.guestId]);

  const request = unlocked ? buildStepsRequest({
    guestId: journey.guestId,
    selectedCareerCode: journey.selectedCareerCode,
    savedMatches: journey.savedMatches,
    savedSkills: journey.savedSkills,
    profile: journey.profile,
    skillsComplete,
  }) : null;
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

  const selected = journey.savedMatches?.find((match) => match.code === journey.selectedCareerCode);

  return (
    <JourneyStepPage pageId="next-step" nextHref="/profile" isLast contentClassName="max-w-5xl"
      description="Explore actions for your first selected career.">
      {!journey.profile ? (
        <p>Save your <Link className="underline" href="/profile">profile</Link> to see recommendations.</p>
      ) : !journey.selectedCareerCode || !selected ? (
        <p>Choose a career in <Link className="underline" href="/current-pathways">Current Pathways</Link> to see recommendations.</p>
      ) : !journey.guestId ? (
        <p role="status">Preparing your guest journey. If this does not finish, enable browser storage and reload.</p>
      ) : (
        <div className="space-y-6">
          <p>Recommendations for <strong>{selected.title}</strong> (NOC {selected.code}), based on your current match.</p>
          <label className="flex items-start gap-3 rounded-lg border bg-background p-4 text-sm">
            <input type="checkbox" className="mt-1" checked={skillsComplete}
              onChange={(event) => setSkillsComplete(event.target.checked)} />
            <span>My selected skills include all the skills I have from the available list. Use them to suggest skills to develop.
              Without this confirmation, missing skills are treated as unknown.</span>
          </label>
          <NextStepsList steps={result?.key === requestKey ? result.steps : []}
            isLoading={!result || result.key !== requestKey}
            error={result?.key === requestKey ? result.error : null} />
          <p className="text-sm"><Link className="underline" href="/current-pathways">Change your career choice</Link>
            {" · "}<Link className="underline" href="/updated-pathways">Back to projections</Link></p>
        </div>
      )}
    </JourneyStepPage>
  );
}
