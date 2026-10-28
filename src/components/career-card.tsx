
"use client";

type CareerCardProps = {
  id: string;
  title: string;
  matchScore: number;
  medianWage?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
};

export default function CareerCard({
  id,
  title,
  matchScore,
  medianWage,
  matchedSkills = [],
  missingSkills = [],
}: CareerCardProps) {
  const score = Number.isFinite(matchScore)
    ? Math.max(0, Math.min(100, matchScore))
    : 0;

  const formattedWage =
    typeof medianWage === "number" && Number.isFinite(medianWage)
      ? new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        }).format(medianWage)
      : "Not available";

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            Career ID: {id}
          </p>
          <h3 className="text-xl font-semibold text-gray-900">
            {title}
          </h3>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
          {Math.round(score)}% Match
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600"
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-label="Career match percentage"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <p className="mb-4 text-sm text-gray-700">
        <span className="font-semibold">Median wage:</span>{" "}
        {formattedWage}
      </p>

      <div className="mb-3">
        <h4 className="mb-2 font-semibold text-gray-900">
          Matching Skills
        </h4>
        <div className="flex flex-wrap gap-2">
          {matchedSkills.length > 0 ? (
            matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-800"
              >
                {skill}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No matching skills listed.
            </p>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-semibold text-gray-900">
          Skills to Develop
        </h4>
        <div className="flex flex-wrap gap-2">
          {missingSkills.length > 0 ? (
            missingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-orange-100 px-2 py-1 text-sm text-orange-800"
              >
                {skill}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No missing skills listed.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
