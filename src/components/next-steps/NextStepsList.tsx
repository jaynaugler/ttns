import NextStepCard, {
  type NextStepRecommendation,
} from "./NextStepCard";

type NextStepsListProps = {
  steps: readonly NextStepRecommendation[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
};

// The parent supplies recommendations. Xiaoyi can replace mock data with API data later.
export default function NextStepsList({
  steps,
  title = "Your recommended next steps",
  description = "Small actions today can open up new career opportunities.",
  isLoading = false,
  error = null,
}: NextStepsListProps) {
  return (
    <section className="w-full space-y-6" aria-label="Next step recommendations">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      {isLoading ? (
        <div
          className="rounded-xl border border-border bg-background p-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="text-sm font-medium text-foreground">
            Loading your recommendations...
          </p>
        </div>
      ) : error ? (
        <div
          className="rounded-xl border border-destructive bg-background p-6"
          role="alert"
        >
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Recommendations unavailable
          </h3>
          <p className="text-sm text-foreground">{error}</p>
        </div>
      ) : steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            No recommendations available yet
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Explore career matches and select a skill you want to develop.
            Your suggested next steps will appear here when they are ready.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <li key={step.id} className="min-w-0">
              <NextStepCard step={step} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
