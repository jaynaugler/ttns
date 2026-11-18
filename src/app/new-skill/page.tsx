"use client";

import { JourneyStepPage } from "@/components/journey-step-page";
import { NewSkillPicker } from "@/components/new-skill-picker";
import { useJourneyProgress } from "@/lib/journey-progress";

// Journey step 3: the picker for the skill the user wants to learn — the
// input for the updated pathways. Continue is hidden until a real pick (the
// same gate the profile page uses with showContinue={submitted}); the pick
// itself is persisted by saveNewSkill, not by the Continue.
export default function NewSkillPage() {
  const { journey } = useJourneyProgress();

  return (
    <JourneyStepPage
      pageId="new-skill"
      nextHref="/updated-pathways"
      description="Pick the skill you want to learn next."
      showContinue={Boolean(journey.newSkill)}
    >
      <NewSkillPicker />
    </JourneyStepPage>
  );
}
