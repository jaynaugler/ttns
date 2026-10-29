import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 4. Team 5's Look Forward cards (wage projection + outcome
// shift, team5-projection) land here, keyed by the chosen career and skill.
export default function UpdatedPathwaysPage() {
  return (
    <JourneyStepPage
      pageId="updated-pathways"
      nextHref="/next-step"
      title="Updated Pathways"
      description="How your match changes once the new skill is in the picture."
    >
      <p className="text-sm text-muted-foreground">
        Look Forward results land here (Team 5).
      </p>
    </JourneyStepPage>
  );
}