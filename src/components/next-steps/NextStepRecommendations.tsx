"use client";

// "Your next moves" on /next-step: a ranked list of changes for the career
// the page leads with. Rebuilds the recommendations idea from Joshua Xie's
// #51 (Team 6), with his go-ahead, on his NextStepCard design, but computed
// here from the user's own journey rather than POST /api/steps:
//   1. the Look Forward plan, with its real match change;
//   2. finishing the education step, a year of experience, and the skill
//      the user's other matches list most, ranked by how much each raises
//      this match (Look Forward's projection), skipping any the plan covers
//      or that don't raise it;
//   3. a Nova Scotia job search.
// See rankNextMoves in src/lib/career-summary.ts. Nothing renders when
// there are no moves.

import { useId } from "react";

import NextStepCard from "@/components/next-steps/NextStepCard";
import { formatCurrency } from "@/components/look-forward/wage-projection-card";
import {
  rankNextMoves,
  type CareerSummary,
  type NextMove,
  type NextMoveKind,
} from "@/lib/career-summary";
import { formatScore } from "@/lib/projection-logic";
import type { CareerMatch } from "@/types/careers";
import type { Scenario } from "@/types/outcomes";

const BADGES: Record<NextMoveKind, string> = {
  plan: "Your plan",
  skill: "Skill",
  education: "Education",
  experience: "Experience",
  "job-search": "Job search",
};

export interface NextStepRecommendationsProps {
  // The career the page leads with.
  summary: CareerSummary;
  savedMatches?: CareerMatch[];
  savedSkills?: string[];
  // The Look Forward choice, when the page leads with its career.
  plan?: Scenario;
  // The profile's degree, for the education step.
  degree?: string;
  // The page's card style, so the section matches its neighbours.
  className?: string;
}

export function NextStepRecommendations({
  summary,
  savedMatches,
  savedSkills,
  plan,
  degree,
  className = "",
}: NextStepRecommendationsProps) {
  const headingId = useId();
  const moves = rankNextMoves({
    careerCode: summary.code,
    savedMatches,
    userSkills: savedSkills,
    plan,
    degree,
    outlook: summary.outlook,
    jobBankUrl: summary.jobBankUrl,
  });
  if (moves.length === 0) return null;

  const career = summary.title ?? `Career ${summary.code}`;
  return (
    <section aria-labelledby={headingId} className={`${className} space-y-4`}>
      <div className="space-y-1">
        <h2 id={headingId} className="text-2xl font-bold break-words">
          Your next moves
        </h2>
        <p>Ranked by how much each one raises your match for {career}.</p>
      </div>
      <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {moves.map((move) => (
          <li key={move.kind} className="min-w-0">
            <NextStepCard
              step={{ id: move.kind, title: move.title, description: move.why }}
              badge={BADGES[move.kind]}
              impact={impactLines(move)}
              action={actionFor(move, career, summary.jobBankUrl)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

// "Match 78 → 84, up 6", or for a plan that doesn't move this career,
// "Match 79.2, no change from this plan". The experience card adds the
// starting wage now and after the year.
function impactLines(move: NextMove): string[] {
  const lines: string[] = [];
  if (move.scoreToday !== undefined && move.scoreAfter !== undefined) {
    lines.push(
      move.gain
        ? `Match ${move.scoreToday} → ${move.scoreAfter}, up ${formatScore(move.gain)}`
        : `Match ${move.scoreToday}, no change from this plan`,
    );
  }
  if (move.wageNow !== undefined && move.wageAfter !== undefined) {
    lines.push(
      `Starting wage ${formatCurrency(move.wageNow)} → about ${formatCurrency(move.wageAfter)} a year after 1 year`,
    );
  }
  return lines;
}

function actionFor(
  move: NextMove,
  career: string,
  jobBankUrl: string | undefined,
): { label: string; href: string; context?: string } | undefined {
  if (move.kind === "job-search") {
    return jobBankUrl
      ? { label: `See Nova Scotia job postings for ${career} on Job Bank`, href: jobBankUrl }
      : undefined;
  }
  return {
    label: move.kind === "plan" ? "Adjust it on Updated Pathways" : "Try it on Updated Pathways",
    href: "/updated-pathways",
    context: move.title,
  };
}
