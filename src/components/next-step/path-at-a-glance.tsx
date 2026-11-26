import { useId } from "react";

import { formatCurrency } from "@/components/look-forward/wage-projection-card";
import type { CareerSummary, PathSummary } from "@/lib/career-summary";

import { CARD, H2, H3 } from "./scale";

// "Your path at a glance": where the user is today, the plan chosen on
// Updated Pathways, and where it leads, as a 3-step ordered list. Shown only
// with a chosen plan; the order is in the <ol>, and the step numbers are a
// decorative echo of it.
export function PathAtAGlance({
  summary,
  path,
}: {
  summary: CareerSummary;
  path: PathSummary;
}) {
  const headingId = useId();
  const career = summary.title ?? `Career ${summary.code}`;
  const starting = summary.wages?.startingOut;
  const typical = summary.wages?.typical;
  const sameScore = path.scoreToday === path.scoreAfter;
  const yearsLabel =
    path.years !== undefined ? `${path.years} ${path.years === 1 ? "year" : "years"}` : undefined;

  const steps: { title: string; lines: string[]; list?: string[] }[] = [
    {
      title: "Today",
      lines: [
        `Match ${path.scoreToday} out of 100 for ${career}.`,
        ...(starting ? [`Starting pay about ${formatCurrency(starting.yearly)} a year.`] : []),
      ],
    },
    { title: "Your plan", lines: [], list: path.plan },
    {
      title: "After",
      lines: [
        sameScore
          ? `Match ${path.scoreAfter}, no change from this plan.`
          : `Match ${path.scoreAfter} out of 100, up from ${path.scoreToday}.`,
        ...(path.afterYears && yearsLabel
          ? [`About ${formatCurrency(path.afterYears.yearly)} a year after ${yearsLabel} (a rough guide).`]
          : typical
            ? [`Typical pay about ${formatCurrency(typical.yearly)} a year.`]
            : []),
      ],
    },
  ];

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <h2 id={headingId} className={H2}>
        Your path at a glance
      </h2>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex min-w-0 flex-col gap-2 rounded-lg border-2 border-foreground/30 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-blue font-bold text-white dark:bg-[var(--dm-brand-yellow)] dark:text-black"
              >
                {index + 1}
              </span>
              <h3 className={H3}>{step.title}</h3>
            </div>
            {step.lines.map((line) => (
              <p key={line} className="break-words">
                {line}
              </p>
            ))}
            {step.list && (
              <ul className="list-disc space-y-1 pl-5">
                {step.list.map((item) => (
                  <li key={item} className="break-words">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
