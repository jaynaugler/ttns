"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import skillsData from "../../public/data/skills.json";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveSkills, useJourneyProgress } from "@/lib/journey-progress";
import "./skill-selection.css";

export function UserSkillSelection() {
  const [skills] = useState<string[]>(skillsData as string[]);
  const [searchQuery, setSearchQuery] = useState("");
  // undefined until the user toggles something, so the saved selection from
  // a previous visit can show through (and resume mid-journey works). Raw
  // skill labels are stored; mapping to UserSkillInput is Team 2's job when
  // the pipeline consumes them.
  const [userSelection, setUserSelection] = useState<string[] | undefined>(undefined);
  const { journey, hydrated } = useJourneyProgress();
  const router = useRouter();
  const selectedSkills = userSelection ?? journey.savedSkills ?? [];
  // The skill panel's Continue is gated on the same signal main's /profile
  // Continue uses: a saved profile, not the in-session form state — which is
  // always false for returning users and blanks on Start Over.
  const profileComplete = Boolean(journey.profile);
  const continueReasonId = useId();
  const continueDisabledMessage =
    !profileComplete && selectedSkills.length === 0
      ? "Complete your profile and select at least one skill before continuing."
      : !profileComplete
        ? "Complete your profile before continuing."
        : selectedSkills.length === 0
          ? "Select at least one skill before continuing."
          : undefined;

  const filteredSkills = skills.filter((skill) =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setUserSelection(selectedSkills.filter((s) => s !== skill));
    } else {
      setUserSelection([...selectedSkills, skill]);
    }
  };

  // Handles the Continue action: saves the selection for the wizard's later
  // steps and moves on. Nothing is POSTed here — /current-pathways' renders
  // fetch the matches fresh (CareerResults POSTs /api/match itself, along
  // with the current matching weights).
  function onContinue() {
    saveSkills(selectedSkills);
    router.push("/current-pathways");
  }

  // Wait out localStorage hydration so a returning user's saved selection is
  // already there on first paint instead of popping in afterwards.
  if (!hydrated) return null;

  const searchBar = (
    <div className="profile-skill-search translate-y-2.5 rounded-lg bg-white text-foreground dark:bg-[var(--dm-card-grey)]">
      <Input
        type="text"
        placeholder="Search Skills"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  const selectionContent = (
    <>
      {/* Skills Selection Grid (Padding matches gap-3 for balanced spacing) */}
      <div
        className="skills-grid-scrollbar grid gap-3 p-3 border rounded-md max-h-[19rem] overflow-y-auto"
      >
        {filteredSkills.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`p-3 text-left rounded-lg border transition-all text-sm font-medium ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground hover:border-muted-foreground"
              }`}
            >
              {skill}
            </button>
          );
        })}
      </div>

    </>
  );

  const skillActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={() => setUserSelection([])}
        disabled={selectedSkills.length === 0}
      >
        Clear
      </Button>
      <span
        className="group relative inline-flex"
      >
        <Button
          type="button"
          size="lg"
          onClick={onContinue}
          disabled={!profileComplete || selectedSkills.length === 0}
          aria-describedby={
            continueDisabledMessage ? continueReasonId : undefined
          }
        >
          Continue
        </Button>
        {continueDisabledMessage && (
          <span
            id={continueReasonId}
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-max max-w-64 rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-lg group-hover:block"
          >
            {continueDisabledMessage}
          </span>
        )}
      </span>
    </>
  );

  // Rendered inside the profile card's Card (see src/app/profile/page.tsx):
  // the fragments are the card's header, content and footer.
  return (
    <>
      <CardHeader className="min-h-[102px] bg-card-blue py-4 text-card-foreground">
        <CardTitle className="text-lg font-semibold">
          User Skills Selection
        </CardTitle>
        {searchBar}
      </CardHeader>
      <CardContent className="flex-1 bg-white text-foreground dark:bg-[var(--dm-card-grey)]">
        <div className="space-y-4">{selectionContent}</div>
      </CardContent>
      <CardFooter className="justify-between bg-white text-foreground dark:bg-[var(--dm-card-grey)]">
        <div className="profile-skill-actions">{skillActions}</div>
      </CardFooter>
    </>
  );
}
