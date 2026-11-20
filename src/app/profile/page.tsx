// "use client" because the page keeps state: whether the form is submitted.
"use client";

import { useState } from "react";
import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";
import { useJourneyProgress } from "@/lib/journey-progress";

// Journey step 1: the multi-step profile form from the user-profile branch,
// wrapped in the shared journey skeleton. The Continue button only shows once
// the form is submitted; it marks the step complete and moves on to /skills.
// The form prefills from the previously submitted profile (journey.profile),
// so "Chart a new path" lands on it filled out. Safe to pass straight from
// useJourneyProgress(): JourneyStepPage renders children only after journey
// state hydrates, and the form's initialValues snapshot happens at that mount.
export default function ProfilePage() {
  const [submitted, setSubmitted] = useState(false);
  const { journey } = useJourneyProgress();

  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/skills"
      description="Tell us a bit about yourself and where you are in your career."
      showContinue={submitted}
    >
      <ProfileForm
        onSubmittedChange={setSubmitted}
        initialValues={journey.profile}
      />
    </JourneyStepPage>
  );
}
