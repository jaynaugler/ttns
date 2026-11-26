"use client";

// The list inside Look Forward's "Change skills" dialog: up to `max` skills,
// as native checkboxes in a fieldset. Skills come ranked by rankSkillsToLearn
// (recommended first, then how many matches are missing them). The top few
// show up front; the rest, including skills no match is missing, sit behind
// "Show all skills". Controlled: the dialog saves the picks.

import { useId, useState } from "react";

import type { SkillToLearn } from "@/lib/projection-logic";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

const SHOWN_FIRST = 6;

export function NewSkillPicker({
  skills,
  matchCount,
  max,
  value,
  onValueChange,
}: {
  skills: readonly SkillToLearn[];
  // How many saved matches the counts are out of.
  matchCount: number;
  max: number;
  value: readonly string[];
  onValueChange: (picks: string[]) => void;
}) {
  const name = useId();
  const descriptionId = `${name}-description`;
  const listId = `${name}-list`;
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState("");

  const firstFew = skills.filter((option) => option.missingFrom > 0).slice(0, SHOWN_FIRST);
  // Picked skills always stay visible, so a ticked box never hides.
  const shown = showAll
    ? skills
    : skills.filter((option) => firstFew.includes(option) || value.includes(option.skill));
  const hiddenCount = skills.length - shown.length;

  function toggle(skill: string, checked: boolean) {
    if (!checked) {
      setMessage("");
      onValueChange(value.filter((pick) => pick !== skill));
    } else if (value.length >= max) {
      // The box stays unticked; the message says why.
      setMessage(`You can pick up to ${max} skills.`);
    } else {
      setMessage("");
      onValueChange([...value, skill]);
    }
  }

  if (skills.length === 0) {
    return <p>You&apos;ve already selected every known skill on the Skills page.</p>;
  }

  return (
    <FieldSet aria-describedby={descriptionId} className="gap-3">
      <FieldLegend className="sr-only">Skills to learn</FieldLegend>
      <FieldDescription id={descriptionId} className="text-base text-foreground">
        {matchCount > 0
          ? "Skills your top matches are missing most come first."
          : "Your matches haven't been saved yet. Show all skills to pick some."}{" "}
        <span className="font-bold">
          {value.length} of {max} picked
        </span>
      </FieldDescription>

      <p role="status" aria-live="polite" className="font-bold">
        {message}
      </p>

      {shown.length > 0 && (
        <div id={listId} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map(({ skill, missingFrom, recommended }) => (
            // Whole card is the label, so the click target is far larger
            // than 44x44.
            <label
              key={skill}
              className="flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-xl border-2 border-foreground/50 bg-background p-4 text-foreground transition-[border-color,background-color] hover:border-card-blue has-checked:border-card-blue has-checked:bg-brand-yellow has-checked:text-black has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red motion-reduce:transition-none dark:bg-[var(--dm-card-grey)] dark:hover:border-[var(--dm-brand-yellow)] dark:has-checked:border-[var(--dm-brand-yellow)] dark:has-checked:bg-[var(--dm-brand-yellow)] dark:has-focus-visible:outline-[var(--dm-brand-yellow)]"
            >
              <input
                type="checkbox"
                name={name}
                value={skill}
                checked={value.includes(skill)}
                onChange={(event) => toggle(skill, event.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-card-blue focus-visible:outline-none"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-bold leading-snug break-words">{skill}</span>
                <span className="text-sm">
                  {matchCount > 0
                    ? `Missing from ${missingFrom} of your top ${matchCount} matches`
                    : "No saved matches yet"}
                </span>
                {recommended && missingFrom > 0 && (
                  // Words, not just the colour, mark the recommendation.
                  <span className="mt-1 self-start rounded-full border border-current px-3 py-1 text-xs font-bold">
                    Recommended for you
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      {(showAll || hiddenCount > 0) && (
        // A plain toggle: it stays in place, so focus stays on it.
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={shown.length > 0 ? listId : undefined}
          onClick={() => setShowAll((open) => !open)}
          className="min-h-11 cursor-pointer self-start rounded-lg border-2 border-card-blue px-4 font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:border-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)]"
        >
          {showAll ? "Show fewer skills" : `Show all skills (${hiddenCount} more)`}
        </button>
      )}
    </FieldSet>
  );
}
