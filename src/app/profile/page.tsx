// "use client" because the page renders journey-state-gated content that
// updates on client navigation.
"use client";

import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";
import { useJourneyProgress } from "@/lib/journey-progress";

// Journey step 1: the multi-step profile form from the user-profile branch,
// wrapped in the shared journey skeleton. Continue shows whenever a profile
// is already saved (journey.profile), not only right after a submit —
// arriving via "Chart a new path" or the header Profile link shouldn't force
// re-submitting identical data. A fresh browser has no saved profile, so the
// first submission still gates the journey.
// The form prefills from journey.profile; safe to read straight from
// useJourneyProgress() here because JourneyStepPage renders children only
// after journey state hydrates, and the form snapshots initialValues at that
// mount. Reset journey wipes the saved profile, which both hides Continue and
// (via the form's own sync) blanks the fields.
export default function ProfilePage() {
  const { journey } = useJourneyProgress();

  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/skills"
      description="Tell us a bit about yourself and where you are in your career."
      showContinue={Boolean(journey.profile)}
    >
      <ProfileForm initialValues={journey.profile} />
    </JourneyStepPage>
  );
}
