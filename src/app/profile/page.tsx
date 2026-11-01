// "use client" because the page keeps state: whether the form is submitted.
"use client";

import { useState } from "react";
import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";

// Journey step 1: the multi-step profile form from the user-profile branch,
// wrapped in the shared journey skeleton. The Continue button only shows once
// the form is submitted; it marks the step complete and moves on to /skills.
export default function ProfilePage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/skills"
      description="Tell us a bit about yourself and where you are in your career."
      showContinue={submitted}
    >
      <ProfileForm onSubmittedChange={setSubmitted} />
    </JourneyStepPage>
  );
}
