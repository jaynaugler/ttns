"use client";

import { JourneyStepPage } from "@/components/journey-step-page";
import { NewSkillPicker } from "@/components/new-skill-picker";
import { useJourneyProgress } from "@/lib/journey-progress";

// Journey step 3: the picker for the skill(s) the user wants to learn — the
// input for the updated pathways. Continue is hidden until at least one pick
// (the same gate the profile page uses with showContinue={submitted}); picks
// are persisted by saveNewSkills, not by the Continue.
export default function NewSkillPage() {
  const { journey } = useJourneyProgress();

  return (
    <JourneyStepPage
      pageId="new-skill"
      nextHref="/updated-pathways"
      description="Pick one or more skills you want to learn."
      showContinue={(journey.newSkills?.length ?? 0) > 0}
    >
      <NewSkillPicker />
    </JourneyStepPage>
  );
}
