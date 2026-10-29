"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  JOURNEY_STEPS,
  isPageUnlocked,
  type JourneyStepId,
} from "@/lib/journey";
import { markStepComplete, useJourneyProgress } from "@/lib/journey-progress";

// The shared skeleton for wizard step pages: a locked notice until the
// earlier journey steps are complete (no redirect — a notice is unambiguous
// and needs no localStorage-before-render work), then the page content with a
// Continue action that marks this page done. The last step routes back to the
// landing page instead of another step.
export function JourneyStepPage({
  pageId,
  nextHref,
  title,
  description,
  isLast,
  children,
}: {
  pageId: JourneyStepId;
  nextHref: string;
  title: string;
  description: string;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  const { journey, hydrated } = useJourneyProgress();

  // Avoid flashing the locked notice while localStorage hydrates.
  if (!hydrated) return null;

  if (!isPageUnlocked(pageId, journey.completed)) {
    // Point the user at the first page they can still complete.
    const nextUp = JOURNEY_STEPS.find(
      (step) => !journey.completed.includes(step.id)
    );
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Card className="mt-4">
          <CardContent>
            <p>Finish the earlier journey steps to unlock this one.</p>
            {nextUp && (
              <Link
                href={nextUp.href}
                className="text-primary-foreground underline underline-offset-4"
              >
                Continue with {nextUp.label}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
      <div>
        <Button
          nativeButton={false}
          render={<Link href={nextHref} />}
          onClick={() => markStepComplete(pageId)}
        >
          {isLast ? "Finish" : "Continue"}
        </Button>
      </div>
    </div>
  );
}