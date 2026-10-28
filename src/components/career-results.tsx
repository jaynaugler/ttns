
"use client";

import CareerCard from "./career-card";

type CareerMatch = {
  id: string;
  title: string;
  matchScore: number;
  medianWage?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
};

type CareerResultsProps = {
  careers: CareerMatch[];
  isLoading?: boolean;
  error?: string | null;
};

export default function CareerResults({
  careers,
  isLoading = false,
  error = null,
}: CareerResultsProps) {
  if (isLoading) {
    return (
      <section aria-live="polite" className="py-8 text-center">
        <p>Finding your career matches...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" className="py-8 text-center text-red-600">
        <p>{error}</p>
      </section>
    );
  }

  if (careers.length === 0) {
    return (
      <section className="py-8 text-center">
        <h2 className="text-xl font-semibold">
          No career matches found
        </h2>
        <p className="mt-2 text-gray-600">
          Try selecting different skills to explore more careers.
        </p>
      </section>
    );
  }

  const topCareers = [...careers]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return (
    <section
      aria-labelledby="career-results-heading"
      className="mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-6">
        <h2
          id="career-results-heading"
          className="text-2xl font-bold"
        >
          Your Career Matches
        </h2>
        <p className="mt-2 text-gray-600">
          Explore careers that match your selected skills.
        </p>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Showing {topCareers.length} of {careers.length} careers
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {topCareers.map((career) => (
          <CareerCard
            key={career.id}
            id={career.id}
            title={career.title}
            matchScore={career.matchScore}
            medianWage={career.medianWage}
            matchedSkills={career.matchedSkills}
            missingSkills={career.missingSkills}
          />
        ))}
      </div>
    </section>
  );
}
