"use client";

import ProfileForm from "@/components/profile-form/ProfileForm";
import { JourneyStepPage } from "@/components/journey-step-page";
import { UserSkillSelection } from "@/components/skill-selection";
import { markStepComplete } from "@/lib/journey-progress";
import {
  Card,
} from "@/components/ui/card";

// Journey step 1: personal information and current skills are completed
// together on this page.
export default function ProfilePage() {
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
