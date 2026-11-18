"use client";

// Journey step 3's picker: every skill the user doesn't already have, with a
// "why it matters" badge counting how many of their persisted top matches
// list it as missing. Persists via saveNewSkill on click; the page's
// Continue (in the shared skeleton) marks the step complete.

import { useId } from "react";

import skillsData from "@/data/skills.json";
import {
  missingSkillCounts,
  toProjectable,
} from "@/lib/match-adapter";
import { saveNewSkill, useJourneyProgress } from "@/lib/journey-progress";
import { suggestSkillToGain } from "@/lib/projection-logic";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

export function NewSkillPicker() {
  const { journey } = useJourneyProgress();
  const name = useId();
  const descriptionId = `${name}-description`;

  const savedSkills = journey.savedSkills ?? [];
  const matches = journey.savedMatches ?? [];
  const counts = missingSkillCounts(matches);
  const suggested =
    matches.length > 0
      ? suggestSkillToGain(toProjectable(matches), savedSkills)
      : undefined;

  // The user can't pick a skill they already selected: the projection needs
  // the pick to be *missing* from their current skills.
  const options = skillsData.filter((skill) => !savedSkills.includes(skill));

  return (
    <FieldSet aria-describedby={descriptionId}>
      <FieldLegend className="text-lg font-bold text-foreground data-[variant=legend]:text-lg">
        Which skill do you want to learn?
      </FieldLegend>
      <FieldDescription id={descriptionId} className="text-base text-neutral-700">
        {matches.length > 0
          ? "Badges count how many of your current top matches are missing that skill."
          : "Your matches haven't been saved yet — pick any skill that interests you."}
      </FieldDescription>

      {options.length === 0 ? (
        <p className="rounded-xl border-2 border-neutral-500 bg-white p-4">
          You&apos;ve already selected every known skill on the Skills page —
          go add a different combination there first.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((skill) => {
            const count = counts.get(skill) ?? 0;
            return (
              // Whole card is the label, like the scenario picker, so the
              // click target is far larger than 44x44 and keyboard/focus
              // behavior comes from the native radio.
              <label
                key={skill}
                className="cursor-pointer rounded-xl border-2 border-neutral-500 bg-white p-4 transition-[border-color,background-color] hover:border-card-blue has-checked:border-card-blue has-checked:bg-brand-yellow has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red motion-reduce:transition-none"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={name}
                    value={skill}
                    checked={journey.newSkill === skill}
                    onChange={() => saveNewSkill(skill)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-card-blue focus-visible:outline-none"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-bold leading-snug break-words">
                      {skill}
                    </span>

                    <span className="text-sm text-neutral-800">
                      {matches.length > 0
                        ? `Missing from ${count} of your top ${matches.length} matches`
                        : "No saved matches yet"}
                    </span>
                  </span>
                </div>

                {count > 0 && skill === suggested && (
                  <span className="mt-2 inline-block rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold">
                    Most requested by your matches
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </FieldSet>
  );
}
