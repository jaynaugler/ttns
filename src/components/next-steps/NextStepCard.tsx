import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { NextStep } from "@/types/outcomes";

type NextStepCardProps = {
  step: NextStep;
};

const categoryLabels: Record<NonNullable<NextStep["category"]>, string> = {
  education: "Education",
  credential: "Credential",
  experience: "Experience",
  application: "Application",
};

// A single recommendation card. No API requests happen here.
export default function NextStepCard({ step }: NextStepCardProps) {
  return (
    <article className="h-full">
      <Card className="h-full gap-0 bg-card text-card-foreground shadow-sm">
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-5" aria-hidden="true" />
              <span>Recommended next step</span>
            </div>
            {step.category ? (
              <span className="inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold text-black">
                {categoryLabels[step.category]}
              </span>
            ) : null}
          </div>
          <h3 className="text-xl font-bold leading-snug break-words">
            {step.title}
          </h3>
        </CardHeader>

        <CardContent className="mt-auto space-y-4">
          {step.description ? (
            <p className="text-sm leading-relaxed text-card-foreground/90 break-words">
              {step.description}
            </p>
          ) : null}
          {step.estimatedWeeks ? (
            <p className="text-sm text-card-foreground/70">
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
                  className="text-sm font-medium leading-relaxed break-words underline underline-offset-2"
                >
                  {step.resourceUrl}
                </a>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </article>
  );
}
