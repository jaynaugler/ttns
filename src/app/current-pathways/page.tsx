import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 2. Team 4's career-results UI (career cards, ranjot-career-
// details) lands here, fed by matchCareers() over the skills saved at /skills.
export default function CurrentPathwaysPage() {
  return (
    <JourneyStepPage
      pageId="current-pathways"
      nextHref="/new-skill"
      title="Current Pathways"
      description="Careers that match the skills you have today."
    >
      <p className="text-sm text-muted-foreground">
        Career match results land here (Team 4).
      </p>
    </JourneyStepPage>
  );
}