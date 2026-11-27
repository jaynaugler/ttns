"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

// The Next Step's button style: 44px tall, a 3px outline instead of the
// faint default ring (outline-solid because the Button sets outline-none).
export const NEXT_STEP_BUTTON =
  "min-h-11 cursor-pointer px-5 text-base focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:focus-visible:outline-[var(--dm-brand-yellow)]";

// "Save my plan" opens the browser's print dialog (where "Save as PDF" is
// one choice); the page's print stylesheet turns it into "My career plan".
// "Copy plan as text" puts the same plan on the clipboard. The status line
// is always present, so the result is announced when its text changes.
export function PlanActions({ text }: { text: string }) {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Plan copied. You can paste it into an email or a document.");
    } catch {
      setStatus("Your browser didn't allow copying. Use Save my plan instead.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button className={NEXT_STEP_BUTTON} onClick={() => window.print()}>
          Save my plan
        </Button>
        <Button variant="secondary" className={NEXT_STEP_BUTTON} onClick={copy}>
          Copy plan as text
        </Button>
      </div>
      <p className="text-sm">Save my plan opens your browser&apos;s print dialog, where you can choose Save as PDF.</p>
      <p role="status" className="min-h-6 font-bold">
        {status}
      </p>
    </div>
  );
}
