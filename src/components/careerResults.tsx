"use client";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markStepComplete,
  saveMatches,
  saveSelectedCareer,
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
      <p className="text-sm text-muted-foreground">No skills to display.</p>
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
  onChoose,
  onContinue,
  selected,
}: {
  career: CareerMatch;
  rank: number;
  onChoose: (code: string) => void;
  onContinue: () => void;
  selected: boolean;
}) {
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

          <p className="mt-1 text-sm text-muted-foreground">
            NOC: {career.code}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold text-primary dark:text-[var(--dm-brand-pink)]">
            {formatPercentage(career.matchPercentage)}
          </p>
          <p className="text-xs text-muted-foreground">Skill overlap</p>
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
          <p className="text-xs text-muted-foreground">Career Skill Coverage</p>
          <p className="mt-1 text-xl font-bold">
            {formatPercentage(career.careerSkillCoverage)}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">User Skill Coverage</p>
          <p className="mt-1 text-xl font-bold">
            {formatPercentage(career.userSkillCoverage)}
          </p>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Median Wage (CAD)</p>
          <p className="mt-1 text-lg font-bold">
            {formatWage(career.medianWage, career.isAnnual)}
          </p>
          {career.wageReferencePeriod && (
            <p className="text-xs text-muted-foreground">
              {career.wageReferencePeriod}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Job Outlook</p>
          <p className="mt-1 text-lg font-bold">
            {career.outlook ?? "Not available"}
          </p>
          <p className="text-xs text-muted-foreground">
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

      {/* Selection action */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button
          type="button"
          size="lg"
          aria-pressed={selected}
          onClick={() => onChoose(career.code)}
          title={
            selected ? "Click to unselect this career" : "Select this career"
          }
          className={
            selected
              ? "cursor-pointer border-green-700 bg-green-700 text-white hover:border-green-800 hover:bg-green-800 dark:border-green-400 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800"
              : "cursor-pointer"
          }
        >
          {selected ? "✓ This career is selected" : "Choose This Career"}
        </Button>
        {selected && (
          <>
            <Button type="button" size="lg" onClick={onContinue}>
              Continue →
            </Button>
          </>
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
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [isSelectedCardVisible, setIsSelectedCardVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [selectedCareerCode, setSelectedCareerCode] = useState<string | null>(
    () => journey.selectedCareerCode ?? null,
  );

  const requestNumber = useRef(0);
  // Selection changes should not cause a redundant match request. The next
  // slider/show-more request reads the latest choice from this ref.
  const selectedCodeRef = useRef(selectedCareerCode);

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
            selectedCareerCode: selectedCodeRef.current ?? undefined,
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
        setSelectedRank(data.selectedRank ?? null);
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

  // A click selects or unselects the career without navigating.
  function chooseCareer(code: string) {
    const nextCode = selectedCareerCode === code ? null : code;
    selectedCodeRef.current = nextCode;
    saveSelectedCareer(nextCode);
    setSelectedCareerCode(nextCode);
    // The user clicked a card that is already on screen. Avoid a banner flash.
    setIsSelectedCardVisible(Boolean(nextCode));
    setSelectedRank(
      nextCode
        ? (() => {
            const index = results.findIndex((item) => item.code === nextCode);
            return index >= 0 ? index + 1 : null;
          })()
        : null,
    );
  }

  // Only Continue completes this step and moves to Team 5's page.
  function continueWithCareer() {
    if (!selectedCareerCode) return;
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

  const selectedIndex = selectedCareerCode
    ? results.findIndex((item) => item.code === selectedCareerCode)
    : -1;
  const selectedMatch =
    selectedIndex >= 0
      ? results[selectedIndex]
      : journey.savedMatches?.find((item) => item.code === selectedCareerCode);
  const currentSelectedRank =
    selectedIndex >= 0 ? selectedIndex + 1 : selectedRank;

  // Watch the selected card as it enters/leaves the visible viewport.
  // The floating shortcut is only useful when that card is off-screen.
  useEffect(() => {
    if (!selectedCareerCode || selectedIndex < 0) return;

    const card = document.getElementById(`career-${selectedCareerCode}`);
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsSelectedCardVisible(entry.isIntersecting),
      {
        // Ignore the top sticky-header area and the bottom edge.
        rootMargin: "-80px 0px -24px 0px",
        threshold: 0,
      },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [selectedCareerCode, selectedIndex]);

  // Checked before the loading state: with no skills the fetch effect bails
  // out early (loading stays true), and this must win instead.
  if (skills.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-white p-6 text-foreground dark:bg-[var(--dm-card-grey)]">
        <h2 className="text-xl font-semibold">No Skills Selected</h2>

        <p className="mt-2 text-muted-foreground">
          Please select your skills on the Skills page.
        </p>

        <Button className="mt-4" onClick={() => router.push("/skills")}>
          Go to Skills
        </Button>
      </section>
    );
  }

  // Show a loading message while career matches are being fetched.
  if (loading) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        Loading your career profile...
      </p>
    );
  }

  return (
    <section className={`space-y-6 ${selectedCareerCode ? "pb-24" : ""}`}>
      {selectedCareerCode && (selectedIndex < 0 || !isSelectedCardVisible) && (
        <button
          type="button"
          onClick={() => {
            document
              .getElementById(`career-${selectedCareerCode}`)
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
          }}
          className="fixed bottom-4 left-1/2 z-40 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-green-700 bg-green-800 px-5 py-3 text-left text-sm font-semibold text-white shadow-xl hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-100 dark:hover:bg-green-900 dark:focus-visible:outline-green-400 sm:bottom-6"
          aria-label={`Scroll to chosen career: ${selectedMatch?.title ?? selectedCareerCode}`}
        >
          You chose:{" "}
          {currentSelectedRank
            ? `Recommendation #${currentSelectedRank} — `
            : ""}
          {selectedMatch?.title ?? `NOC ${selectedCareerCode}`} ↑
        </button>
      )}
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold">Career Matching Results</h1>

        <p className="mt-2 text-muted-foreground">
          Explore your top career matches and choose the occupation that
          interests you most.
        </p>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
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
            onClick={() => router.push("/skills")}
          >
            Edit My Skills
          </Button>

          <Button
            type="button"
            variant="ghost"
            aria-expanded={showWeights}
            aria-controls="matching-weights-panel"
            onClick={showWeights ? cancelWeights : openWeights}
            className="cursor-pointer border-border bg-white text-primary hover:bg-muted hover:text-primary dark:bg-[var(--dm-card-grey)] dark:text-[var(--dm-brand-pink)] dark:hover:bg-muted dark:hover:text-foreground"
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

          <p className="mt-2 text-sm text-muted-foreground">
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

          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
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

          <p className="mt-2 text-xs text-muted-foreground">
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
          <p className="text-muted-foreground">
            No matching occupations were found.
          </p>
        )}

        {results.map((career, index) => (
          <CareerCard
            key={career.code}
            career={career}
            rank={index + 1}
            onChoose={chooseCareer}
            onContinue={continueWithCareer}
            selected={selectedCareerCode === career.code}
          />
        ))}

        {/* The saved choice may move outside the visible top results after
            changing weights. Keep Continue accessible without reselecting. */}
        {selectedCareerCode &&
          !results.some((c) => c.code === selectedCareerCode) && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-900 dark:border-green-600 dark:bg-green-950/40 dark:text-green-100">
              <p className="font-semibold">
                You have already selected a career (NOC {selectedCareerCode}).
              </p>
              <p className="mt-1 text-sm">
                It is not in the currently displayed recommendations.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button" onClick={continueWithCareer}>
                  Continue →
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    selectedCodeRef.current = null;
                    saveSelectedCareer(null);
                    setSelectedCareerCode(null);
                    setSelectedRank(null);
                  }}
                >
                  Unselect career
                </Button>
              </div>
            </div>
          )}

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