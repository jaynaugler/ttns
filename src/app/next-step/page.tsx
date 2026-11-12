import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 5 (final). Team 6's next-steps UI lands here; the backend
// already exists (POST /api/steps over the matches + profile).
export default function NextStepPage() {
  return (
    <JourneyStepPage
      pageId="next-step"
      nextHref="/"
      description="Your personalized plan for what to do next."
      isLast
    >
      <p className="text-sm text-muted-foreground">
        Next-step recommendations land here (Team 6).
      </p>
    </JourneyStepPage>
  );
}