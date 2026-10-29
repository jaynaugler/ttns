import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 4. Team 5's Look Forward cards (wage projection + outcome
// shift, team5-projection) land here, keyed by the chosen career and skill.
export default function UpdatedOpportunitiesPage() {
  return (
    <JourneyStepPage
      pageId="updated-opportunities"
      nextHref="/next-step"
      title="Updated Opportunities"
      description="How your match changes once the new skill is in the picture."
    >
      <p className="text-sm text-muted-foreground">
        Look Forward results land here (Team 5).
      </p>
    </JourneyStepPage>
  );
}