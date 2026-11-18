"use client";

import { LookForward } from "@/components/look-forward/look-forward";
import { WageProjectionCard } from "@/components/look-forward/wage-projection-card";
import { JourneyStepPage } from "@/components/journey-step-page";
import { toProjectable } from "@/lib/match-adapter";
import {
  useJourneyProgress,
  type ProfileData,
} from "@/lib/journey-progress";
import type { Scenario } from "@/types/outcomes";

// Journey step 4. Team 5's Look Forward runs over the matches persisted at
// /current-pathways, with the /new-skill pick as the headline scenario and
// the profile's education/experience answers personalizing the other two.
export default function UpdatedPathwaysPage() {
  const { journey, hydrated } = useJourneyProgress();

  const matches = toProjectable(journey.savedMatches ?? []);
  const userSkills = journey.savedSkills ?? [];
  // Without a pick, LookForward falls back to its three default scenarios.
  const scenarios = journey.newSkill
    ? buildScenarios(journey.newSkill, journey.profile)
    : undefined;

  return (
    <JourneyStepPage
      pageId="updated-pathways"
      nextHref="/next-step"
      description="How your match changes once the new skill is in the picture."
      contentClassName="max-w-5xl"
    >
      {hydrated ? (
        <div className="space-y-6">
          <LookForward
            matches={matches}
            userSkills={userSkills}
            scenarios={scenarios}
          />

          <p className="text-sm text-neutral-700">
            Projections re-score your saved top matches. A new skill can also
            lift careers that aren&apos;t in today&apos;s top 10 — re-check
            your current pathways after you&apos;ve gained it.
          </p>

          {journey.selectedCareerCode && (
            <WageProjectionCard
              careerId={journey.selectedCareerCode}
              headingLevel="h3"
            />
          )}
        </div>
      ) : (
        <p>Loading your saved progress ...</p>
      )}
    </JourneyStepPage>
  );
}

// The gain-skill scenario leads when the user picked one at /new-skill, and
// the education scenario starts from the degree the profile form recorded.
// Experience stays at Team 5's default generic "+1 year" — deriving added
// years from the user's CURRENT experience would be fake personalization.
function buildScenarios(
  newSkill: string,
  profile: ProfileData | undefined,
): Scenario[] {
  const degree = profile?.education?.degree?.trim();

  return [
    { kind: "gain-skill", skill: newSkill },
    { kind: "finish-education", step: degree || "a diploma or certificate" },
    { kind: "add-experience", years: 1 },
  ];
}
