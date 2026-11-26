"use client";

import { useId, useState } from "react";

import { formatCurrency } from "@/components/look-forward/wage-projection-card";
import { payRange } from "@/lib/career-summary";

import { H3, TILE } from "./scale";

// "Pay range": Job Bank's starting out, typical and top earners pay (its
// 10th percentile, median and 90th percentile). A single-series bar chart, one hue (card blue, brand
// yellow in dark mode; both over 3:1 against the card), bars from a zero
// baseline with 4px rounded tops, every value labelled. The bars are inline
// SVG; values and labels are HTML text so they stay readable at 320px. The
// chart is one role="img" named by its text summary, and "Show as table"
// switches to the same numbers as a table.
export function WageGrowthChart({ careerCode }: { careerCode: string }) {
  const headingId = useId();
  const summaryId = useId();
  const regionId = useId();
  const [table, setTable] = useState(false);
  const points = payRange(careerCode);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.annual));
  const summary = `Pay range from Job Bank: ${points
    .map((p) => `${p.label.toLowerCase()} (${p.note}) ${formatCurrency(p.annual)} a year`)
    .join("; ")}.`;

  return (
    <div className={`${TILE} gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={headingId} className={H3}>
          Pay range
        </h3>
        <button
          type="button"
          aria-pressed={table}
          aria-controls={regionId}
          onClick={() => setTable((on) => !on)}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border-2 border-foreground/50 px-4 font-bold hover:border-card-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red aria-pressed:border-card-blue aria-pressed:bg-brand-yellow aria-pressed:text-black dark:hover:border-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)] dark:aria-pressed:border-[var(--dm-brand-yellow)] dark:aria-pressed:bg-[var(--dm-brand-yellow)]"
        >
          Show as table
        </button>
      </div>
      <p id={summaryId}>{summary}</p>

      <div id={regionId}>
        {table ? (
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Pay range from Job Bank</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b-2 border-foreground/30 py-2 pr-3">
                  Pay level
                </th>
                <th scope="col" className="border-b-2 border-foreground/30 py-2">
                  A year
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.label}>
                  <th scope="row" className="border-b border-foreground/20 py-2 pr-3 font-normal">
                    {p.label} ({p.note})
                  </th>
                  <td className="border-b border-foreground/20 py-2 font-bold">
                    {formatCurrency(p.annual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div role="img" aria-labelledby={summaryId} className="grid grid-cols-3 items-end gap-3">
            {points.map((p) => {
              const height = Math.max(4, Math.round((p.annual / max) * 100));
              return (
                // The {" "} text nodes don't show (flex items) but keep the raw
                // text apart: "$43,992 Starting out 10th percentile $68,250 …".
                <div key={p.label} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <span className="text-sm font-bold break-words">{formatCurrency(p.annual)}</span>{" "}
                  <svg
                    viewBox="0 0 40 100"
                    preserveAspectRatio="none"
                    className="block h-32 w-full max-w-24"
                    focusable="false"
                  >
                    <path
                      d={`M0,100 V${100 - height + 4} Q0,${100 - height} 4,${100 - height} H36 Q40,${100 - height} 40,${100 - height + 4} V100 Z`}
                      className="fill-card-blue dark:fill-[var(--dm-brand-yellow)]"
                    />
                  </svg>
                  <span className="w-full border-t-2 border-foreground/30 pt-1 text-sm break-words">
                    {p.label}{" "}
                    <span className="block text-xs">{p.note}</span>
                  </span>{" "}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
