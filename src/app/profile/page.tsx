// "use client" because the page renders journey-state-gated content that
// updates on client navigation.
"use client";

import { useEffect } from "react";

import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";
import { UserSkillSelection } from "@/components/skill-selection";
import { markStepComplete, useJourneyProgress } from "@/lib/journey-progress";
import {
  Card,
} from "@/components/ui/card";

// Journey step 1: personal information and current skills are completed
// together on this page — the multi-step form in one card, the skill panel
// in the other. Personal info and skills each keep their own Continue; the
// page-level Continue stays hidden (the panels' actions navigate onward).
// The form prefills from journey.profile: returning users land on the review
// of what they entered instead of an empty wizard. Safe to read straight from
// useJourneyProgress() here because JourneyStepPage renders children only
// after journey state hydrates, and the form snapshots initialValues at that
// mount. Reset journey wipes the saved profile, which (via the form's own
// sync) blanks the fields; the skill panel reads journey.profile itself for
// its Continue gate, so onSubmittedChange only marks the step for the
// sidebar.
export default function ProfilePage() {
  const { journey } = useJourneyProgress();

  // Marks <html> while this page is showing, for the fixed-height layout in
  // globals.css. Next keeps a visited page mounted but hidden after you leave
  // it, so a body:has(.profile-selection-layout) rule kept matching on later
  // pages and locked their height; React runs this cleanup when the page is
  // hidden, so the attribute (and the layout) goes with it.
  useEffect(() => {
    document.documentElement.dataset.profileLayout = "";
    return () => {
      delete document.documentElement.dataset.profileLayout;
    };
  }, []);

  return (
    <JourneyStepPage
      pageId="profile"
      nextHref="/current-pathways"
      description="Tell us a bit about yourself and where you are in your career."
      showContinue={false}
      contentClassName="profile-selection-layout w-full max-w-[106rem]"
    >
      <div className="profile-panels-container grid grid-cols-[repeat(auto-fit,minmax(min(100%,28rem),1fr))] items-start gap-4">
        <ProfileForm
          initialValues={journey.profile}
          // The skill panel reads profile completeness from the journey store
          // itself (journey.profile), like main does; this only marks the
          // sidebar step so later pages unlock.
          onSubmittedChange={(isSubmitted: boolean) => {
            if (isSubmitted) markStepComplete("profile");
          }}
        />
        <div className="profile-skill-selection-panel">
          <Card className="profile-skill-selection-card bg-white pt-0 text-foreground shadow-sm [--card-spacing:--spacing(6)] dark:bg-[var(--dm-card-grey)]">
            <UserSkillSelection />
          </Card>
        </div>
      </div>
    </JourneyStepPage>
  );
}
