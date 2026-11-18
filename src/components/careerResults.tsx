"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markStepComplete,
  saveSelectedCareer,
  useJourneyProgress,
} from "@/lib/journey-progress";

import type { CareerMatch, MatchResponse } from "@/types/careers";

const DEFAULT_ALPHA = 0.7;

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
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
    green: "bg-green-100 text-green-800",
    gray: "bg-muted text-foreground",
    blue: "bg-secondary text-secondary-foreground",
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
  choosing,
  selected,
}: {
  career: CareerMatch;
  rank: number;
  onChoose: (code: string) => Promise<void>;
  choosing: boolean;
  selected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-border bg-white p-5 text-foreground shadow-sm sm:p-6">
      {/* Career title and match score */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">
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
          <p className="text-3xl font-bold text-primary">
            {formatPercentage(career.matchPercentage)}
          </p>
          <p className="text-xs text-muted-foreground">Hybrid Match</p>
        </div>
      </div>

      {/* Matching progress bar */}
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
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
        <h3 className="mb-2 font-semibold text-green-800">
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
          className="cursor-pointer border-border bg-white text-primary hover:bg-muted hover:text-primary"
        >
          {expanded
            ? "Hide All Career Skills ▲"
            : `Show All Career Skills (${career.requiredSkills.length}) ▼`}
        </Button>

        {expanded && (
          <div className="mt-3 rounded-lg border border-border bg-white p-4">
            <SkillBadges skills={career.requiredSkills} color="blue" />
          </div>
        )}
      </div>

      {/* Selection action */}
      <div className="mt-6 border-t border-border pt-4">
        <Button
          type="button"
          size="lg"
          disabled={choosing || selected}
          onClick={() => void onChoose(career.code)}
          className="cursor-pointer"
        >
          {selected
            ? "✓ Career Selected"
            : choosing
              ? "Submitting..."
              : "Choose This Career"}
        </Button>
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
  const [results, setResults] = useState<CareerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [selectedCareerCode, setSelectedCareerCode] = useState<string | null>(
    () => journey.selectedCareerCode ?? null,
  );

  const [choosingCode, setChoosingCode] = useState<string | null>(null);

  const requestNumber = useRef(0);

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
          }),
          signal: controller.signal,
        });

        const data: MatchResponse & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to match careers");
        }

        if (currentRequest !== requestNumber.current) return;

        setResults(data.results);
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
  }, [skillsKey, alpha]);

  // Handles the selection of a career and persists it using the journey state.
  async function chooseCareer(code: string) {
    if (choosingCode !== null) return;

    setChoosingCode(code);
    setError("");

    try {
      saveSelectedCareer(code);
      // The career pick is this page's real Continue action: without it the
      // user would land on /new-skill while the step is still incomplete.
      markStepComplete("current-pathways");

      setSelectedCareerCode(code);

      router.push("/new-skill");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to select career");
    } finally {
      setChoosingCode(null);
    }
  }

  // Checked before the loading state: with no skills the fetch effect bails
  // out early (loading stays true), and this must win instead.
  if (skills.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-white p-6 text-foreground">
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
    <section className="space-y-6">
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
                className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-3 border-border bg-white text-primary hover:bg-muted hover:text-primary"
          onClick={() => router.push("/skills")}
        >
          Edit My Skills
        </Button>
      </div>

      {/* Weighted hybrid slider */}
      <div className="rounded-xl border border-border bg-muted p-5 text-foreground">
        <h2 className="text-xl font-semibold">Adjust Matching Weights</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Career coverage measures how many career skills you have. User
          coverage measures how many of your selected skills apply.
        </p>

        <div className="mt-5 flex justify-between gap-4 font-semibold">
          <span>Career Coverage: {Math.round(alpha * 100)}%</span>

          <span>User Coverage: {Math.round((1 - alpha) * 100)}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(alpha * 100)}
          onChange={(event) => setAlpha(Number(event.target.value) / 100)}
          aria-label="Career coverage weight"
          className="mt-4 w-full cursor-pointer accent-primary"
        />

        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Focus on your skills</span>
          <span>Focus on career skills</span>
        </div>

        <p className="mt-4 text-sm text-foreground">
          Hybrid Score = {alpha.toFixed(2)} × Career Coverage +{" "}
          {(1 - alpha).toFixed(2)} × User Coverage
        </p>

        <button
          type="button"
          onClick={() => setAlpha(DEFAULT_ALPHA)}
          className="mt-3 cursor-pointer text-sm font-semibold text-primary hover:underline"
        >
          Reset to 70% / 30%
        </button>

        <p className="mt-2 text-xs text-muted-foreground">
          Match scores measure skill overlap, not the probability of getting a
          job.
        </p>
      </div>

      {/* Status */}
      {updating && (
        <p role="status" className="text-sm text-primary">
          Updating career rankings...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200
      bg-red-50 p-3 text-sm text-red-700"
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
            choosing={choosingCode !== null}
            selected={selectedCareerCode === career.code}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          className="border-border bg-white text-primary hover:bg-muted hover:text-primary"
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
