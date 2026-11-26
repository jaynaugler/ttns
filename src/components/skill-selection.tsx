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

export function UserSkillSelection({
  embedded = false,
  profileComplete: profileFormComplete,
}: {
  embedded?: boolean;
  profileComplete?: boolean;
}) {
  const [skills] = useState<string[]>(skillsData as string[]);
  const [searchQuery, setSearchQuery] = useState("");
  // undefined until the user toggles something, so the saved selection from
  // a previous visit can show through (and resume mid-journey works). Raw
  // skill labels are stored; mapping to UserSkillInput is Team 2's job when
  // the pipeline consumes them.
  const [userSelection, setUserSelection] = useState<string[] | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const { journey, hydrated } = useJourneyProgress();
  const router = useRouter();
  const selectedSkills = userSelection ?? journey.savedSkills ?? [];
  const profileComplete =
    profileFormComplete ?? journey.completed.includes("profile");
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

  // Handles the Continue action: POSTs the selection to /api/match, and only
  // once the response is OK saves it for the wizard's later steps and moves on.
  async function onSubmit() {
    setIsPending(true);
    try {
      console.log("Sending:", JSON.stringify({ skills: selectedSkills }));
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: selectedSkills }),
      });
      if (!res.ok) throw new Error("Skill matching not successful.");
      const responseBody = await res.json();
      console.log("Skill matching successful:", responseBody);
      saveSkills(selectedSkills);
      router.push("/current-pathways");
    } catch (error) {
      console.error("Skill matching error", error);
    } finally {
      setIsPending(false);
    }
  }

  // Wait out localStorage hydration so a returning user's saved selection is
  // already there on first paint instead of popping in afterwards.
  if (!hydrated) return null;

  const searchInput = (
    <Input
      type="text"
      placeholder="Search Skills"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );
  const searchBar = embedded ? (
    <div className="profile-skill-search translate-y-2.5 rounded-lg bg-white text-foreground dark:bg-[var(--dm-card-grey)]">
      {searchInput}
    </div>
  ) : (
    searchInput
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
        disabled={selectedSkills.length === 0 || isPending}
      >
        Clear
      </Button>
      <span
        className="group relative inline-flex"
      >
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={
            !profileComplete || selectedSkills.length === 0 || isPending
          }
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

  if (embedded) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Skill Selection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select your skills from the list below or use search.
        </p>
      </div>
      {searchBar}
      {selectionContent}
      <div className="profile-skill-actions flex items-center justify-between border-t pt-4">
        {skillActions}
      </div>
    </div>
  );
}