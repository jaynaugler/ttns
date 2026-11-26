"use client";

import { LookForward } from "@/components/look-forward/look-forward";
import { NewSkillPicker } from "@/components/new-skill-picker";
import { WageProjectionCard } from "@/components/look-forward/wage-projection-card";
import { JourneyStepPage } from "@/components/journey-step-page";
import { toProjectable } from "@/lib/match-adapter";
import {
  useJourneyProgress,
  type ProfileData,
} from "@/lib/journey-progress";
import type { Scenario } from "@/types/outcomes";

// Journey step 3. Team 5's Look Forward runs over the matches persisted at
// /current-pathways, with any add-skills picks as extra scenarios (the
// interest page was removed; its redesign will restore picking here) and the
// profile's education/experience answers personalizing the other two.
export default function UpdatedPathwaysPage() {
  const { journey, hydrated } = useJourneyProgress();

  const matches = toProjectable(journey.savedMatches ?? []);
  const userSkills = journey.savedSkills ?? [];
  // One gain-skill scenario per pick (projected independently — there is no
  // honest combined multi-skill math), then the education/experience pair.
  // Without picks, LookForward falls back to its three default scenarios.
  const picks = journey.newSkills ?? [];
  const scenarios =
    picks.length > 0 ? buildScenarios(picks, journey.profile) : undefined;

  return (
    <JourneyStepPage
      pageId="updated-pathways"
      nextHref="/next-step"
      description="How your pathways change as education, experience, and new skills come into the picture."
      contentClassName="max-w-5xl"
    >
      {hydrated ? (
        <div className="space-y-6">
          <LookForward
            matches={matches}
            userSkills={userSkills}
            scenarios={scenarios}
          />
          <section className="rounded-xl border-2 border-neutral-500 bg-white p-5 text-neutral-900">
  <h2 className="mb-4 text-xl font-bold">
    Gain New Skills
  </h2>
  <NewSkillPicker />
</section>

          <p className="text-sm text-neutral-700">
            Projections re-score your saved top matches. New skills and
            experience can also lift careers that aren&apos;t in today&apos;s
            top 10 — re-check your current pathways as you grow.
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

// Each picked skill becomes its own "learn X" scenario, ahead of the
// education scenario (started from the degree the profile form recorded) and
// Team 5's default generic "+1 year" experience scenario — deriving added
// years from the user's CURRENT experience would be fake personalization.
function buildScenarios(
  picks: string[],
  profile: ProfileData | undefined,
): Scenario[] {
  const degree = profile?.education?.degree?.trim();

  return [
    ...picks.map((skill) => ({ kind: "gain-skill", skill } as const)),
    { kind: "finish-education", step: degree || "a diploma or certificate" },
    { kind: "add-experience", years: 1 },
  ];
}
