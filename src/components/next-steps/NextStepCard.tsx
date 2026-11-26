import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { NextStep } from "@/types/outcomes";

type NextStepCardProps = {
  step: NextStep;
  // Optional, added for Team 5's "Your next moves" (built on this card):
  // a badge in place of the category label, impact lines (e.g. "Match 78 →
  // 84, up 6") and one action link. Without them the card is unchanged.
  badge?: string;
  // The small label above the title, e.g. "Move 1" or "Your plan".
  eyebrow?: string;
  // Content starts under the title instead of sitting at the card's foot,
  // so a short card in a row of taller ones has no empty gap.
  topAligned?: boolean;
  impact?: readonly string[];
  action?: {
    label: string;
    href: string;
    // Read after the label by screen readers, so repeated labels such as
    // "Try it on Updated Pathways" still say which card they belong to.
    context?: string;
  };
};

const categoryLabels: Record<NonNullable<NextStep["category"]>, string> = {
  education: "Education",
  credential: "Credential",
  experience: "Experience",
  application: "Application",
};

// A single recommendation card. No API requests happen here.
export default function NextStepCard({
  step,
  badge,
  eyebrow = "Recommended next step",
  topAligned = false,
  impact,
  action,
}: NextStepCardProps) {
  const badgeText = badge ?? (step.category ? categoryLabels[step.category] : undefined);
  return (
    <article className="h-full">
      <Card className="h-full gap-0 bg-card text-card-foreground shadow-sm">
        <CardHeader className="gap-3 pb-4">
          {/* min-w-0 here and on the label let it wrap instead of running
              past the card (it was clipped at 200% text size): this row is a
              grid item, which otherwise won't shrink below its content. */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{eyebrow}</span>
            </div>
            {badgeText ? (
              <span className="inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold text-black">
                {badgeText}
              </span>
            ) : null}
          </div>
          <h3 className="text-xl font-bold leading-snug break-words">
            {step.title}
          </h3>
        </CardHeader>

        <CardContent className={`${topAligned ? "" : "mt-auto "}space-y-4`}>
          {step.description ? (
            <p className="text-sm leading-relaxed text-card-foreground/90 break-words">
              {step.description}
            </p>
          ) : null}
          {step.estimatedWeeks ? (
            <p className="text-sm text-card-foreground/90">
              Approx. {step.estimatedWeeks}{" "}
              {step.estimatedWeeks === 1 ? "week" : "weeks"}
            </p>
          ) : null}
          {step.resourceUrl ? (
            <div className="rounded-lg bg-background p-4 text-foreground">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide">
                Suggested resource
              </p>
              <div className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={step.resourceUrl}
                  className="inline-flex min-h-11 items-center text-sm font-medium leading-relaxed break-all underline underline-offset-2 dark:text-[var(--dm-brand-yellow)]"
                >
                  {step.resourceUrl}
                </a>
              </div>
            </div>
          ) : null}
          {impact && impact.length > 0 ? (
            <div className="space-y-1">
              {impact.map((line) => (
                <p key={line} className="text-sm font-bold break-words">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {action ? <CardAction {...action} /> : null}
        </CardContent>
      </Card>
    </article>
  );
}

// White on the blue card, 44px tall, with a white focus outline. In-app
// links use Next's Link; anything else is a plain link.
function CardAction({ label, href, context }: NonNullable<NextStepCardProps["action"]>) {
  const className =
    "inline-flex min-h-11 cursor-pointer items-center font-bold text-card-foreground underline underline-offset-4 break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-card-foreground";
  const text = (
    <>
      {label}
      {context ? <span className="sr-only">: {context}</span> : null}
    </>
  );
  return (
    <p>
      {href.startsWith("/") ? (
        <Link href={href} className={className}>
          {text}
        </Link>
      ) : (
        <a href={href} className={className}>
          {text}
        </a>
      )}
    </p>
  );
}
