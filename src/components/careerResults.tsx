"use client";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_TOP_CAREERS,
  markStepComplete,
  saveMatches,
  saveTopCareers,
  useJourneyProgress,
} from "@/lib/journey-progress";

import type { CareerMatch, MatchResponse } from "@/types/careers";

const DEFAULT_ALPHA = 0.3;
const PAGE_SIZE = 10;
const MAX_RESULTS = 1000;

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function formatWage(wage: number | null, isAnnual: boolean | null): string {
  if (wage === null || isAnnual === null) {
    return "Not available";
  }

  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: isAnnual ? 0 : 2,
  }).format(wage);

  return `${amount}/${isAnnual ? "year" : "hour"}`;
}

// Reusable visual list of skills.
function SkillBadges({
  skills,
  color = "gray",
}: {
  skills: string[];
  color?: "green" | "gray" | "blue";
}) {
  const styles = {
    green:
      "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100",
    gray: "bg-muted text-foreground",
    blue: "bg-secondary text-secondary-foreground dark:text-black",
  };

  if (skills.length === 0) {
    return (
      <p className="text-sm text-foreground/70">No skills to display.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className={`rounded-full px-3 py-1
            text-xs font-medium ${styles[color]}`}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function CareerCard({
  career,
  rank,
  pickNumber,
  canPickMore,
  onTogglePick,
}: {
  career: CareerMatch;
  rank: number;
  // 1, 2 or 3 if this career is one of the user's Top 3; null if not picked.
  pickNumber: number | null;
  // False when 3 careers are already picked (so this box can't be checked).
  canPickMore: boolean;
  onTogglePick: (code: string) => void;
}) {
  const selected = pickNumber !== null;
  const disabled = !selected && !canPickMore;
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      id={`career-${career.code}`}
      className={`scroll-mt-36 rounded-xl border p-5 text-foreground shadow-sm transition-colors sm:p-6 ${
        selected
          ? "border-green-700 bg-green-50 ring-2 ring-green-600 dark:border-green-400 dark:bg-green-950/30 dark:ring-green-500"
          : "border-border bg-white dark:bg-[var(--dm-card-grey)]"
      }`}
    >
      {/* Career title and match score */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-primary dark:text-[var(--dm-brand-pink)]">
            Recommendation #{rank}
          </p>

          <h2 className="mt-1 text-xl font-bold text-foreground">
            {career.title}
          </h2>

          <p className="mt-1 text-sm text-foreground/70">
            NOC: {career.code}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 text-right">
          {/* Top 3 tick box in the top right corner */}
          <label
            title={
              disabled
                ? `You already picked ${MAX_TOP_CAREERS} careers. Uncheck one to pick this.`
                : undefined
            }
            className={`flex items-center gap-2 text-sm font-semibold ${
              disabled
                ? "cursor-not-allowed text-foreground/70 opacity-60"
                : "cursor-pointer text-foreground"
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={disabled}
              onChange={() => onTogglePick(career.code)}
              aria-label={`Add ${career.title} to my Top ${MAX_TOP_CAREERS} career choices`}
              className="h-4 w-4 cursor-pointer accent-green-700 disabled:cursor-not-allowed"
            />
            {selected ? `Top Choice #${pickNumber}` : "Add to Top 3"}
          </label>

          <div>
            <p className="text-3xl font-bold text-primary dark:text-[var(--dm-brand-pink)]">
              {formatPercentage(career.matchPercentage)}
            </p>
            <p className="text-xs text-foreground/70">Skill overlap</p>
          </div>
        </div>
      </div>

      {/* Matching progress bar */}
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary dark:bg-[var(--dm-brand-pink)] transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, career.matchPercentage))}%`,
          }}
        />
      </div>

      {/* Coverage, wage, and outlook */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-foreground/70">Career Skill Coverage</p>
          <p className="mt-1 text-xl font-bold">
            {formatPercentage(career.careerSkillCoverage)}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-foreground/70">User Skill Coverage</p>
          <p className="mt-1 text-xl font-bold">
            {formatPercentage(career.userSkillCoverage)}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-foreground/70">Median Wage (CAD)</p>
          <p className="mt-1 text-lg font-bold">
            {formatWage(career.medianWage, career.isAnnual)}
          </p>
          {career.wageReferencePeriod && (
            <p className="text-xs text-foreground/70">
              {career.wageReferencePeriod}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-foreground/70">Job Outlook</p>
          <p className="mt-1 text-lg font-bold">
            {career.outlook ?? "Not available"}
          </p>
          <p className="text-xs text-foreground/70">
            {career.outlookRegion ?? "Nova Scotia"}
          </p>
        </div>
      </div>

      {/* Matched Skills */}
      <div className="mt-5">
        <h3 className="mb-2 font-semibold text-green-800 dark:text-[var(--dm-badge-green)]">
          Matched Skills ({career.matchedSkills.length})
        </h3>

        <SkillBadges skills={career.matchedSkills} color="green" />
      </div>

      {/* Missing Skills */}
      <div className="mt-5">
        <h3 className="mb-2 font-semibold text-foreground">
          Skills to Develop ({career.missingSkills.length})
        </h3>

        <SkillBadges skills={career.missingSkills} color="gray" />
      </div>

      {/* Explanation */}
      <div className="mt-5 rounded-lg bg-muted p-4">
        <h3 className="mb-2 font-semibold text-foreground">
          Why This Career Matches
        </h3>

        <p className="text-sm leading-6 text-foreground">{career.rationale}</p>
      </div>

      {/* Expandable complete skill list */}
      <div className="mt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="cursor-pointer border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
        >
          {expanded
            ? "Hide All Career Skills ▲"
            : `Show All Career Skills (${career.requiredSkills.length}) ▼`}
        </Button>

        {expanded && (
          <div className="mt-3 rounded-lg border border-border bg-white p-4 dark:bg-[var(--dm-card-grey)]">
            <SkillBadges skills={career.requiredSkills} color="blue" />
          </div>
        )}
      </div>

    </article>
  );
}

export default function CareerResults({
  selectedSkills,
}: {
  selectedSkills: string[];
}) {
  const router = useRouter();
  // Safe in the useState initializer below: the parent page only renders us
  // once the persisted journey state has hydrated.
  const { journey } = useJourneyProgress();

  const [alpha, setAlpha] = useState(DEFAULT_ALPHA);
  // Is the "Adjust Matching Weights" panel open? It starts closed.
  const [showWeights, setShowWeights] = useState(false);
  // The slider value while the panel is open. Only Save copies it into alpha.
  const [draftAlpha, setDraftAlpha] = useState(DEFAULT_ALPHA);
  const [results, setResults] = useState<CareerMatch[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  // The user's Top 3 picks, in the order they were checked. Starts from what
  // was saved before (older saves only had one pick).
  const [topCareerCodes, setTopCareerCodes] = useState<string[]>(
    () =>
      journey.topCareerCodes ??
      (journey.selectedCareerCode ? [journey.selectedCareerCode] : []),
  );

  const requestNumber = useRef(0);
  // Picking a career should not reload the matches. The next slider/show-more
  // request reads the latest #1 pick from this ref, so the API keeps it in
  // the results even if it is ranked lower than the top 10.
  const firstPickRef = useRef<string | null>(topCareerCodes[0] ?? null);

  const skills = selectedSkills;
  // Keyed on this string in the refetch effect: journey-state writes recreate
  // the array with a new identity, which would otherwise refire the fetch.
  const skillsKey = skills.join("|");

  // Fetch career matches when skills or slider weight changes.
  useEffect(() => {
    if (skills.length === 0) {
      return;
    }

    const controller = new AbortController();
    const currentRequest = ++requestNumber.current;

    const fetchMatches = async () => {
      setUpdating(true);
      setError("");

      try {
        const response = await fetch("/api/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skills,
            alpha,
            limit: visibleCount,
            selectedCareerCode: firstPickRef.current ?? undefined,
          }),
          signal: controller.signal,
        });

        const data: MatchResponse & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to match careers");
        }

        if (currentRequest !== requestNumber.current) return;

        setResults(data.results);
        setHasMore(Boolean(data.hasMore));
        // Persisted for /updated-pathways (projection) and /next-step
        // (POST /api/steps). The fetch effect is keyed on skillsKey/alpha,
        // so the journey-state write can't re-trigger it.
        saveMatches(data.results);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (currentRequest !== requestNumber.current) return;

        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (
          !controller.signal.aborted &&
          currentRequest === requestNumber.current
        ) {
          setLoading(false);
          setUpdating(false);
        }
      }
    };

    void fetchMatches();

    return () => {
      controller.abort();
    };
    // Keyed on skillsKey instead of skills (the string is content-stable;
    // see its declaration above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsKey, alpha, visibleCount]);

  // Check or uncheck a career. Checking adds it to the end of the Top 3 list;
  // unchecking removes it, and the other picks move up a number.
  function togglePick(code: string) {
    const next = topCareerCodes.includes(code)
      ? topCareerCodes.filter((item) => item !== code)
      : topCareerCodes.length < MAX_TOP_CAREERS
        ? [...topCareerCodes, code]
        : topCareerCodes; // already 3 picks: ignore the click

    firstPickRef.current = next[0] ?? null;
    saveTopCareers(next);
    setTopCareerCodes(next);
  }

  // Continue completes this step and moves to Team 5's page.
  function continueWithCareers() {
    if (topCareerCodes.length === 0) return;
    markStepComplete("current-pathways");
    router.push("/updated-pathways");
  }

  function changeAlpha(next: number) {
    setVisibleCount(PAGE_SIZE);
    setAlpha(next);
  }

  // Open the panel, starting the slider at the weights in use right now.
  function openWeights() {
    setDraftAlpha(alpha);
    setShowWeights(true);
  }

  // Use the new weights (this reloads the rankings) and close the panel.
  function saveWeights() {
    changeAlpha(draftAlpha);
    setShowWeights(false);
  }

  // Close the panel without changing anything.
  function cancelWeights() {
    setShowWeights(false);
  }

  // A picked career's title: from the results on screen, or from the saved
  // matches if it has dropped out of the list after changing weights.
  function titleFor(code: string): string {
    return (
      results.find((item) => item.code === code)?.title ??
      journey.savedMatches?.find((item) => item.code === code)?.title ??
      `NOC ${code}`
    );
  }

  // Checked before the loading state: with no skills the fetch effect bails
  // out early (loading stays true), and this must win instead.
  if (skills.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-white p-6 text-foreground dark:bg-[var(--dm-card-grey)]">
        <h2 className="text-xl font-semibold">No Skills Selected</h2>

        <p className="mt-2 text-foreground/70">
          Please select your skills on the Personal Info page.
        </p>

        <Button className="mt-4" onClick={() => router.push("/profile")}>
        Go to Personal Info
        </Button>
      </section>
    );
  }

  // Show a loading message while career matches are being fetched.
  if (loading) {
    return (
      <p className="py-10 text-center text-foreground/70">
        Loading your career profile...
      </p>
    );
  }

  return (
    <section className="space-y-6 pb-48">
      {/* Top 3 bar: always at the bottom of the screen */}
      <div className="fixed bottom-4 left-1/2 z-40 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border-2 border-green-700 bg-white p-4 text-foreground shadow-xl dark:border-green-400 dark:bg-[var(--dm-card-grey)] sm:bottom-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">
              Your Top {MAX_TOP_CAREERS} Career Choices ({topCareerCodes.length}/
              {MAX_TOP_CAREERS})
            </p>

            {topCareerCodes.length === 0 ? (
              <p className="text-sm text-foreground/70">
                Check the box on up to {MAX_TOP_CAREERS} careers. We recommend
                picking {MAX_TOP_CAREERS}.
              </p>
            ) : (
              <ol className="mt-2 flex flex-wrap gap-2">
                {topCareerCodes.map((code, index) => (
                  <li
                    key={code}
                    className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-900 dark:bg-green-900/50 dark:text-green-100"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(`career-${code}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className="cursor-pointer hover:underline"
                    >
                      #{index + 1} {titleFor(code)}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePick(code)}
                      aria-label={`Remove ${titleFor(code)} from my Top ${MAX_TOP_CAREERS}`}
                      className="cursor-pointer font-bold hover:text-red-700"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            disabled={topCareerCodes.length === 0}
            onClick={continueWithCareers}
            className="cursor-pointer"
          >
            Continue →
          </Button>
        </div>
      </div>
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold">Career Matching Results</h1>

        <p className="mt-2 text-foreground/70">
          Explore your top career matches and check the box on up to{" "}
          {MAX_TOP_CAREERS} careers that interest you most.
        </p>

        <div className="mt-3">
          <p className="text-sm text-foreground/70">
            Your selected skills: {skills.length}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground dark:text-black"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Edit My Skills and Adjust Matching Weights, side by side */}
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="ghost"
            className="border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
            onClick={() => router.push("/profile")}
          >
            Edit My Skills
          </Button>

          <Button
            type="button"
            variant="ghost"
            aria-expanded={showWeights}
            aria-controls="matching-weights-panel"
            onClick={showWeights ? cancelWeights : openWeights}
            // Wraps at 320px instead of pushing the page sideways.
            className="h-auto min-h-8 max-w-full whitespace-normal text-left cursor-pointer border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Adjust Matching Weights ({Math.round(alpha * 100)}% /{" "}
            {Math.round((1 - alpha) * 100)}%) {showWeights ? "▲" : "▼"}
          </Button>
        </div>
      </div>

      {/* Weighted hybrid slider: only shown after the button is clicked */}
      {showWeights && (
        <div
          id="matching-weights-panel"
          className="rounded-2xl border-2 border-primary/60 bg-muted p-6 shadow-md dark:border-[var(--dm-brand-pink)]"
        >
          <h2 className="flex items-center gap-2 text-2xl font-bold text-primary dark:text-[var(--dm-brand-pink)]">
            <SlidersHorizontal className="h-6 w-6" />
            Adjust Matching Weights
          </h2>

          <p className="mt-2 text-sm text-foreground/70">
            Career coverage measures how many career skills you have. User
            coverage measures how many of your selected skills apply.
          </p>

          <div className="mt-5 flex justify-between gap-4 font-semibold">
            <span>Career Coverage: {Math.round(draftAlpha * 100)}%</span>

            <span>User Coverage: {Math.round((1 - draftAlpha) * 100)}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(draftAlpha * 100)}
            onChange={(event) => setDraftAlpha(Number(event.target.value) / 100)}
            aria-label="Career coverage weight"
            className="mt-4 w-full cursor-pointer accent-primary dark:accent-[var(--dm-brand-pink)]"
          />

          <div className="mt-1 flex justify-between text-xs text-foreground/70">
            <span>Focus on your skills</span>
            <span>Focus on career skills</span>
          </div>

          <p className="mt-4 text-sm text-foreground">
            Hybrid Score = {draftAlpha.toFixed(2)} × Career Coverage +{" "}
            {(1 - draftAlpha).toFixed(2)} × User Coverage
          </p>

          <button
            type="button"
            onClick={() => setDraftAlpha(DEFAULT_ALPHA)}
            className="mt-3 cursor-pointer text-sm font-semibold text-primary hover:underline dark:text-[var(--dm-brand-pink)]"
          >
            <span aria-hidden="true">↺</span> Reset to 30% / 70%
          </button>

          <p className="mt-2 text-xs text-foreground/70">
            Match scores measure skill overlap, not the probability of getting a
            job.
          </p>

          {/* Save uses the new weights; Cancel keeps the old ones */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={saveWeights} className="cursor-pointer">
              Save
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={cancelWeights}
              className="cursor-pointer border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Status */}
      {updating && (
        <p role="status" className="text-sm text-primary">
          Updating career rankings...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {/* Career cards */}
      <div className="space-y-5">
        <h2 className="text-xl font-semibold">
          Top {results.length} Recommended Careers
        </h2>

        {results.length === 0 && !updating && (
          <p className="text-foreground/70">
            No matching occupations were found.
          </p>
        )}

        {results.map((career, index) => (
          <CareerCard
            key={career.code}
            career={career}
            rank={index + 1}
            pickNumber={
              topCareerCodes.includes(career.code)
                ? topCareerCodes.indexOf(career.code) + 1
                : null
            }
            canPickMore={topCareerCodes.length < MAX_TOP_CAREERS}
            onTogglePick={togglePick}
          />
        ))}

        {hasMore && (
          <div className="flex justify-center">
            <Button
              type="button"
              size="lg"
              variant="ghost"
              disabled={updating || visibleCount >= MAX_RESULTS}
              onClick={() =>
                setVisibleCount(
                  Math.min(
                    Math.max(
                      visibleCount,
                      Math.ceil(results.length / PAGE_SIZE) * PAGE_SIZE,
                    ) + PAGE_SIZE,
                    MAX_RESULTS,
                  ),
                )
              }
              className="cursor-pointer border border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
            >
              {updating ? "Loading more careers..." : "Show 10 More Careers"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          className="border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          ↑ Back to Top
        </Button>
      </div>
    </section>
  );
}