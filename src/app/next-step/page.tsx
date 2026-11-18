"use client";

import { useMemo, useState } from "react";

import { JourneyStepPage } from "@/components/journey-step-page";
import { NextStepView } from "@/components/next-step-view";
import { buildStepsRequest } from "@/lib/profile-adapter";
import { useJourneyProgress } from "@/lib/journey-progress";

// Journey step 5 — the last. NextStepView calls POST /api/steps (Team 6) with
// the persisted matches, skills and profile; Continue shows once the call
// has resolved (so the user reads the plan before the journey ends).
export default function NextStepPage() {
  const [resolved, setResolved] = useState(false);
  const { journey } = useJourneyProgress();

  // Keyed on the request payload's content, not object identity: every
  // journey-state write rebuilds the state object, and this request must not
  // refire on that (the same fix careerResults.tsx got for its fetch).
  const matchesKey = (journey.savedMatches ?? [])
    .map((match) => `${match.code}:${match.matchPercentage}`)
    .join("|");
  const skillsKey = (journey.savedSkills ?? []).join("|");
  const profileKey = journey.profile ? JSON.stringify(journey.profile) : "";

  const request = useMemo(
    () =>
      buildStepsRequest({
        savedMatches: journey.savedMatches,
        savedSkills: journey.savedSkills,
        profile: journey.profile,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchesKey, skillsKey, profileKey],
  );

  return (
    <JourneyStepPage
      pageId="next-step"
      nextHref="/"
      isLast
      description="Concrete steps toward the skill you picked."
      showContinue={resolved}
    >
      <NextStepView request={request} onResolved={() => setResolved(true)} />
    </JourneyStepPage>
  );
}
