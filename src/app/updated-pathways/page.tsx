"use client";

import skillsData from "@/data/skills.json";
import { LookForward } from "@/components/look-forward/look-forward";
import { JourneyStepPage } from "@/components/journey-step-page";
import { toProjectable } from "@/lib/match-adapter";
import {
  saveLookForward,
  saveNewSkills,
  useJourneyProgress,
} from "@/lib/journey-progress";
import {
  buildScenarios,
  MAX_SKILL_PICKS,
  rankSkillsToLearn,
} from "@/lib/projection-logic";

// Journey step 3. Team 5's Look Forward over the matches persisted at
// /current-pathways: the user's skill picks, an education step named by the
// profile's degree, or a year of experience, with a wage card that follows
// the projected #1.
export default function UpdatedPathwaysPage() {
  const { journey, hydrated } = useJourneyProgress();

  const matches = toProjectable(journey.savedMatches ?? []);
  const userSkills = journey.savedSkills ?? [];
  // Older journeys could save more picks; Look Forward uses the first three.
  const picks = (journey.newSkills ?? []).slice(0, MAX_SKILL_PICKS);
  const scenarios = buildScenarios(
    matches,
    userSkills,
    picks,
    journey.profile?.education?.degree,
  );

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
            skillPicker={{
              skills: rankSkillsToLearn(matches, userSkills, skillsData),
              picks,
              onChange: saveNewSkills,
            }}
            choice={{ saved: journey.lookForward, onChange: saveLookForward }}
          />

          <p className="text-sm text-foreground">
            Estimates only. Projections re-score your saved top matches;
            re-check Current Pathways as you grow.
          </p>
        </div>
      ) : (
        <p>Loading your saved progress ...</p>
      )}
    </JourneyStepPage>
  );
}
