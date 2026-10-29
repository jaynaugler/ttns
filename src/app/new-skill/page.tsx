import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 3. The picker for the skill the user wants to learn — the
// input for the updated opportunities — lands here.
export default function NewSkillPage() {
  return (
    <JourneyStepPage
      pageId="new-skill"
      nextHref="/updated-opportunities"
      title="New Skill Interest"
      description="Pick the skill you want to learn next."
    >
      <p className="text-sm text-muted-foreground">
        The new-skill picker lands here.
      </p>
    </JourneyStepPage>
  );
}