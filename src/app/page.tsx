import Link from "next/link";

import { Button } from "@/components/ui/button";

// Landing page: introduce the journey and hand off to the wizard. Step
// content lives on the step pages, not here.
export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center text-center">
      {/* Hero art goes here — swap this block for a next/image when we have it */}
      <div
        aria-hidden="true"
        className="mb-8 flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted text-sm text-muted-foreground"
      >
        Hero image placeholder
      </div>
      <h1 className="text-3xl font-bold">Take The Next Step</h1>
      <p className="text-muted-foreground mt-3">
        Share your current skills and the skill you want to learn next, and
        we&apos;ll map the pathways in between — from the careers you match
        today to a concrete plan for your next step.
      </p>
      <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/profile" />}>
        Get Started
      </Button>
    </div>
  );
}
