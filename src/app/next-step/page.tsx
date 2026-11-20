import { JourneyStepPage } from "@/components/journey-step-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Construction } from "lucide-react";

// Journey step 4 — the last, and the only one not implemented. GUTTED FOR
// RE-DESIGN: the original page sent the persisted matches/skills/profile to
// Team 6's POST /api/steps and rendered the returned action plan (see
// components/next-step-view.tsx in git history; the route and the
// lib/next-steps validation/adapter stack are kept for the new design to
// reuse). What this page should be is deliberately unresolved — treat
// everything below as scaffolding to replace, and keep the "needs work"
// signal until that happens. Its Continue ("Chart a new path") wraps the
// journey back to /profile instead of dead-ending on the landing page.
export default function NextStepPage() {
  return (
    <JourneyStepPage
      pageId="next-step"
      nextHref="/profile"
      isLast
      description="The wrap-up step of your journey — what it offers is being re-imagined."
    >
      {/* The card bg (bg-card) is brand blue, so every line here is explicitly
          white rather than muted tokens that would read blue-grey on it. */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Construction aria-hidden="true" className="size-5" />
            Under construction
          </CardTitle>
          <CardDescription className="text-white">
            This step is a placeholder for now — what it&apos;s for is still
            being decided.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-white">
          <p>
            It will eventually wrap up the journey — a last look at where
            you&apos;re headed, and the send-off into charting a fresh path
            through the wizard.
          </p>
          <p>
            For now, &ldquo;Chart a new path&rdquo; simply takes you back to
            Personal Info to work through the journey again.
          </p>
        </CardContent>
      </Card>
    </JourneyStepPage>
  );
}
