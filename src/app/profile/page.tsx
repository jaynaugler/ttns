import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 1: the multi-step profile form from the user-profile branch,
// wrapped in the shared journey skeleton. The Continue button marks the step
// complete and moves on to /skills.
export default function ProfilePage() {
  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/skills"
      description="Tell us a bit about yourself and where you are in your career."
    >
      <ProfileForm />
    </JourneyStepPage>
  );
}