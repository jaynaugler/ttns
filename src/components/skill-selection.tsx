"use client";

import { useState } from "react";
import Link from "next/link";
import skillsData from "../../public/data/skills.json";

import { Button } from "@/components/ui/button";
import { saveSkills, useJourneyProgress } from "@/lib/journey-progress";

export function UserSkillSelection() {
  const [skills] = useState<string[]>(skillsData as string[]);
  const [searchQuery, setSearchQuery] = useState("");
  // undefined until the user toggles something, so the saved selection from
  // a previous visit can show through (and resume mid-journey works). Raw
  // skill labels are stored; mapping to UserSkillInput is Team 2's job when
  // the pipeline consumes them.
  const [userSelection, setUserSelection] = useState<string[] | undefined>(undefined);
  const { journey } = useJourneyProgress();
  const selectedSkills = userSelection ?? journey.savedSkills ?? [];

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Skill Selection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select your skills from the list below or use search.
        </p>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search skills (e.g., Numeracy, Digital Literacy)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border rounded-md bg-background text-foreground"
      />

      {/* Skills Selection Grid (Padding matches gap-3 for balanced spacing) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-md max-h-[19rem] overflow-y-auto">
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

      {/* Selected Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold text-sm">
          Selected Skills ({selectedSkills.length}):
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedSkills.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              None selected yet.
            </span>
          ) : (
            selectedSkills.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 text-xs bg-background border rounded-full shadow-sm"
              >
                {s}
              </span>
            ))
          )}
        </div>
      </div>

      {selectedSkills.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/current-pathways" />}
            // saveSkills persists the selection for the wizard's later steps
            // and marks this page complete.
            onClick={() => saveSkills(selectedSkills)}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}