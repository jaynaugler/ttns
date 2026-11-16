import { LookForward } from "@/components/look-forward/look-forward";
import {
  MOCK_MATCHES,
  MOCK_USER_SKILLS,
} from "@/components/look-forward/mock-matches";
import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 4. Team 5's Look Forward cards (wage projection + outcome
// shift, team5-projection) land here, keyed by the chosen career and skill.
// Mock matches stand in for Team 4's; swap when matching is merged.
export default function UpdatedPathwaysPage() {
  return (
    <JourneyStepPage
      pageId="updated-pathways"
      nextHref="/next-step"
      description="How your match changes once the new skill is in the picture."
    >
      <LookForward matches={MOCK_MATCHES} userSkills={MOCK_USER_SKILLS} />
    </JourneyStepPage>
  );
}