"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JOURNEY_STEPS, JOURNEY_STEP_COUNT, getStepStatuses } from "@/lib/journey";
import { resetJourney, useJourneyProgress } from "@/lib/journey-progress";
import { cn } from "cn";

// The journey list shared by the desktop sidebar and the mobile drawer, so
// the two can't drift: done steps check off and stay clickable (users may look
// back), the current step is highlighted, and later steps are plain non-
// interactive spans (never disabled links, which are an a11y trap).
export function JourneyStepList({ onStepClick }: { onStepClick?: () => void }) {
  const { journey } = useJourneyProgress();
  const statuses = getStepStatuses(journey.completed);

  return (
    <>
      <ul className="space-y-4">
        {Array.from({ length: JOURNEY_STEP_COUNT }, (_, stepIndex) => {
          const pages = JOURNEY_STEPS.filter((step) => step.stepIndex === stepIndex);
          const { label, href } = pages[0];
          const status = statuses[stepIndex];
          const stepId = `journey-step-${stepIndex}`;

          if (status === "locked") {
            return (
              <li key={stepId} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-sidebar-border text-sidebar-foreground opacity-50">
                  {stepIndex + 1}
                </span>
                <span className="text-sm opacity-70">{label}</span>
              </li>
            );
          }

          return (
            <li key={stepId}>
              <Link
                href={href}
                onClick={onStepClick}
                aria-current={status === "current" ? "step" : undefined}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                  {status === "done" ? <Check className="size-3.5" /> : stepIndex + 1}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    status === "current" ? "font-bold" : "opacity-70"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Button
        variant="link"
        className="mt-6 h-auto p-0 text-xs"
        onClick={() => resetJourney()}
      >
        Reset journey
      </Button>
    </>
  );
}