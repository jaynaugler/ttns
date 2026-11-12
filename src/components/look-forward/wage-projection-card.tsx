import {
	createWageProjection,
	findCareerById,
} from "@/lib/projection-logic";

interface WageProjectionCardProps {
	careerId: string;
	currentWage?: number;
	// "h3" when the card sits inside another section's h2.
	headingLevel?: "h2" | "h3";
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: 0,
	}).format(value);
}

export function WageProjectionCard({
	careerId,
	currentWage,
	headingLevel = "h2",
}: WageProjectionCardProps) {
	const Heading = headingLevel;
	const career = findCareerById(careerId);

	if (!career) {
		return (
			<div className="rounded-lg border p-4">
				<p className="text-sm text-neutral-700">
					Career data unavailable.
				</p>
			</div>
		);
	}

	const projection = createWageProjection(careerId, currentWage);
	const medianWage = projection?.projectedWage;

	return (
		<section className="space-y-4 rounded-lg border p-5">
			{/* Named for its content, not "Look Forward", so it doesn't
			    duplicate the LookForward section's heading on the same page. */}
			<div>
				<Heading className="text-2xl font-bold">
					Wage outlook for {career.title}
				</Heading>
				<p className="text-sm text-neutral-700">
					Today&apos;s median wage for this occupation
				</p>
			</div>

			{projection && medianWage !== undefined ? (
				<div className="space-y-3">
					<div>
						<p className="text-sm text-neutral-700">
							Median wage
						</p>
						<p className="text-2xl font-semibold">
							{formatCurrency(medianWage)}
						</p>
						<p className="text-sm text-neutral-700">
							per year
						</p>
					</div>

					{projection.currentWage !== undefined && (
						<div>
							<p className="text-sm text-neutral-700">
								Current wage
							</p>
							<p className="font-medium">
								{formatCurrency(projection.currentWage)}
							</p>
						</div>
					)}

					{projection.delta !== undefined && (
						<div>
							<p className="text-sm text-neutral-700">
								Potential wage difference
							</p>
							<p className="font-medium">
								{projection.delta >= 0 ? "+" : ""}
								{formatCurrency(projection.delta)}
							</p>
						</div>
					)}
				</div>
			) : (
				<p className="text-sm text-neutral-700">
					Wage data is not available for this career.
				</p>
			)}
		</section>
	);
}
