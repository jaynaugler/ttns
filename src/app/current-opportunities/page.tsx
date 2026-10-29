import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 2. Team 4's career-results UI (career cards, ranjot-career-
// details) lands here, fed by matchCareers() over the skills saved at /skills.
export default function CurrentOpportunitiesPage() {
  return (
    <JourneyStepPage
      pageId="current-opportunities"
      nextHref="/new-skill"
      title="Current Opportunities"
      description="Careers that match the skills you have today."
    >
      <p className="text-sm text-muted-foreground">
        Career match results land here (Team 4).
      </p>
    </JourneyStepPage>
  );
}