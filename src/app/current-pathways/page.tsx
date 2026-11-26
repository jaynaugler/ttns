"use client";
import { JourneyStepPage } from "@/components/journey-step-page";
import { useJourneyProgress } from "@/lib/journey-progress";
import CareerResults from "@/components/careerResults";

// Journey step 2. Team 4's career-results UI (career cards, ranjot-career-
// details) lands here, fed by matchCareers() over the skills saved at /skills.
// Continue is rendered beside the selected career card, not by the shared
// journey wrapper. The choice feeds the wage card and the next-step request.
export default function CurrentPathwaysPage() {
  const { journey, hydrated } = useJourneyProgress();

  return (
    <JourneyStepPage
      pageId="current-pathways"
      nextHref="/updated-pathways"
      description="Careers that match the skills you have today."
      showContinue={false}
      contentClassName="max-w-5xl"
    >
      {hydrated ? (
        <CareerResults selectedSkills={journey.savedSkills ?? []} />
      ) : (
        <p>Loading saved skills ...</p>
      )}
    </JourneyStepPage>
  );
}
