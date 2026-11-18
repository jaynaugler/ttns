"use client";

// Journey step 3's picker: every skill the user doesn't already have, with a
// "why it matters" badge counting how many of their persisted top matches
// list it as missing. Multi-select with 1+ picks gating the page's Continue;
// the recommended skill leads the list but nothing autosaves — picks persist
// via saveNewSkills on each toggle, and the shared skeleton's Continue marks
// the step complete.

import { useId } from "react";

import skillsData from "@/data/skills.json";
import {
  missingSkillCounts,
  toProjectable,
} from "@/lib/match-adapter";
import { saveNewSkills, useJourneyProgress } from "@/lib/journey-progress";
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
  const picks = journey.newSkills ?? [];
  const matches = journey.savedMatches ?? [];
  const counts = missingSkillCounts(matches);
  const suggested = suggestSkillToGain(
    toProjectable(matches),
    savedSkills,
  );

  // The user can't pick a skill they already selected: the projection needs
  // the pick to be *missing* from their current skills. The recommended
  // skill leads the list; the rest follows in dataset order.
  const options = skillsData
    .filter((skill) => !savedSkills.includes(skill))
    .sort((a, b) => (a === suggested ? -1 : b === suggested ? 1 : 0));

  function toggle(skill: string, checked: boolean) {
    saveNewSkills(
      checked
        ? [...picks, skill]
        : picks.filter((pick) => pick !== skill),
    );
  }

  return (
    <FieldSet aria-describedby={descriptionId}>
      <FieldLegend className="text-lg font-bold text-foreground data-[variant=legend]:text-lg">
        Which skills do you want to learn?
      </FieldLegend>
      <FieldDescription id={descriptionId} className="text-base text-neutral-700">
        {matches.length > 0
          ? "Tick every skill you're curious about — badges count how many of your top matches are missing it."
          : "Your matches haven't been saved yet — pick any skills that interest you."}
      </FieldDescription>

      {suggested && counts.get(suggested)! > 0 && (
        <p className="rounded-xl border-2 border-card-blue bg-white p-4 text-base text-neutral-900">
          Quickest win:{" "}
          <span className="font-bold">{suggested}</span> — listed as missing by{" "}
          {counts.get(suggested)} of your {matches.length} top matches. It&apos;s
          first in the list.
        </p>
      )}

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
              // behavior comes from the native checkbox.
              <label
                key={skill}
                className="cursor-pointer rounded-xl border-2 border-neutral-500 bg-white p-4 transition-[border-color,background-color] hover:border-card-blue has-checked:border-card-blue has-checked:bg-brand-yellow has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red motion-reduce:transition-none"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name={name}
                    value={skill}
                    checked={picks.includes(skill)}
                    onChange={(event) => toggle(skill, event.target.checked)}
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
                    Recommended for you
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
