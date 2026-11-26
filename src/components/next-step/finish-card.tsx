"use client";

import { useRouter } from "next/navigation";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetJourney } from "@/lib/journey-progress";

import { NEXT_STEP_BUTTON, PlanActions } from "./plan-actions";
import { CARD, H2 } from "./scale";

// The end of the page. With a career: "You've charted your path", a
// two-line summary, Save my plan / Copy plan as text, and Start a new
// journey. Without one, just the fresh start.
export function FinishCard({
  id,
  summary,
  planText,
}: {
  id?: string;
  // Two short lines: where the plan leads, and the first move.
  summary?: [string, string];
  planText?: string;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={CARD}>
      <h2 id={headingId} className={H2}>
        {summary ? "You've charted your path" : "Ready for a different path?"}
      </h2>
      {summary && (
        <div className="space-y-1">
          <p>{summary[0]}</p>
          <p>{summary[1]}</p>
        </div>
      )}
      {planText && <PlanActions text={planText} />}
      <StartNewJourney />
    </section>
  );
}

// Clearing the journey can't be undone, so the button asks first. Base UI's
// Dialog moves focus into the dialog (to "Keep my journey", the safe choice),
// traps it there, closes on Escape, and returns focus to the button.
function StartNewJourney() {
  const router = useRouter();
  const noteId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="space-y-2 border-t-2 border-foreground/20 pt-4">
      <p id={noteId}>Starting again clears your saved answers.</p>
      <Dialog>
        <DialogTrigger
          render={<Button variant="secondary" aria-describedby={noteId} className={NEXT_STEP_BUTTON} />}
        >
          Start a new journey
        </DialogTrigger>
        <DialogContent initialFocus={keepRef} className="max-w-md">
          <DialogTitle>Start a new journey?</DialogTitle>
          <DialogDescription>This clears your profile, skills and picks.</DialogDescription>
          <div className="flex flex-wrap gap-3">
            <Button
              className={NEXT_STEP_BUTTON}
              onClick={() => {
                resetJourney();
                router.push("/profile");
              }}
            >
              Clear and start over
            </Button>
            <DialogClose
              ref={keepRef}
              render={<Button variant="secondary" className={NEXT_STEP_BUTTON} />}
            >
              Keep my journey
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
