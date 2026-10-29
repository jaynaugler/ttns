import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 1. The multi-step profile form arrives with the user-profile
// branch; its submit should call markStepComplete("profile") when it lands.
export default function ProfilePage() {
  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/skills"
      title="Personal Info"
      description="Tell us a bit about yourself and where you are in your career."
    />
  );
}