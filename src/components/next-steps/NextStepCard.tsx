import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRight, Lightbulb } from "lucide-react";

// The UI uses its own simple shape until Xiaoyi connects the real API.
export type NextStepRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  action: string;
};

type NextStepCardProps = {
  step: NextStepRecommendation;
};

const priorityClasses: Record<NextStepRecommendation["priority"], string> = {
  High: "bg-brand-yellow text-black",
  Medium: "bg-white text-brand-red",
  Low: "bg-background text-foreground",
};

// A single recommendation card. No API requests happen here.
export default function NextStepCard({ step }: NextStepCardProps) {
  return (
    <article className="h-full">
      <Card className="h-full gap-0 border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-5" aria-hidden="true" />
              <span>Recommended next step</span>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${priorityClasses[step.priority]}`}
            >
              {step.priority} priority
            </span>
          </div>
          <h3 className="text-xl font-bold leading-snug break-words">
            {step.title}
          </h3>
        </CardHeader>

        <CardContent className="mt-auto space-y-4">
          <p className="text-sm leading-relaxed text-card-foreground/90 break-words">
            {step.description}
          </p>
          <div className="rounded-lg bg-background p-4 text-foreground">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide">
              Suggested action
            </p>
            <div className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium leading-relaxed break-words">
                {step.action}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
