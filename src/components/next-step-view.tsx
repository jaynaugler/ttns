"use client";

// Journey step 5's view: sends the persisted matches and profile to Team 6's
// POST /api/steps and renders the ordered NextStep list. The request content
// is fixed by the time the user reaches this step; the page keys it on its
// content, so this effect re-runs only on a real payload change.

import { useEffect, useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { NextStepsRequest } from "@/lib/next-steps-types";
import type { NextStep } from "@/types/outcomes";

const BADGE_STYLES: Record<NonNullable<NextStep["category"]>, string> = {
  education: "bg-green-100 text-green-800",
  credential: "bg-secondary text-secondary-foreground",
  experience: "bg-blue-100 text-blue-800",
  application: "bg-muted text-foreground",
};

const CATEGORY_LABELS: Record<NonNullable<NextStep["category"]>, string> = {
  education: "Education",
  credential: "Credential",
  experience: "Experience",
  application: "Application",
};

type Phase = "loading" | "no-request" | "error" | "empty" | "steps";

export function NextStepView({
  request,
  onResolved,
}: {
  request: NextStepsRequest | null;
  onResolved?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(
    request === null ? "no-request" : "loading",
  );
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Keep the callback out of the fetch effect's dependencies: it's a call
  // target, not data. Assigned in an effect, never during render.
  const onResolvedRef = useRef(onResolved);

  useEffect(() => {
    onResolvedRef.current = onResolved;
  }, [onResolved]);

  useEffect(() => {
    if (request === null) {
      onResolvedRef.current?.();
      return;
    }

    const controller = new AbortController();

    async function fetchSteps() {
      try {
        const response = await fetch("/api/steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        const data: { steps?: NextStep[]; error?: string } =
          await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to build your next steps.");
        }

        const resolvedSteps = data.steps ?? [];
        setSteps(resolvedSteps);
        setPhase(resolvedSteps.length === 0 ? "empty" : "steps");
      } catch (err) {
        if (controller.signal.aborted) return;
        setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
        setPhase("error");
      } finally {
        onResolvedRef.current?.();
      }
    }

    void fetchSteps();

    return () => {
      controller.abort();
    };
  }, [request]);

  if (phase === "loading") {
    return (
      <p className="py-10 text-center text-muted-foreground">
        Building your next steps ...
      </p>
    );
  }

  if (phase === "no-request") {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">No matches saved yet</h2>
        <p className="mt-2 text-muted-foreground">
          Your next steps are built from the career matches saved on the
          current pathways page.
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        {errorMessage}
      </p>
    );
  }

  if (phase === "empty") {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">No curated steps yet</h2>
        <p className="mt-2 text-muted-foreground">
          Training steps for your specific path are still being added. Start
          with the scenario you picked on the updated pathways page.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.id}>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-primary">
                  #{index + 1}
                </span>
                {step.category && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE_STYLES[step.category]}`}
                  >
                    {CATEGORY_LABELS[step.category]}
                  </span>
                )}
                {step.estimatedWeeks !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ≈ {step.estimatedWeeks} weeks
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-lg font-bold text-foreground">
                {step.title}
              </h3>
              {step.description && (
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {step.description}
                </p>
              )}

              {step.resourceUrl && (
                <a
                  href={step.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center text-sm font-semibold text-primary underline underline-offset-4"
                >
                  View resource ↗
                </a>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
