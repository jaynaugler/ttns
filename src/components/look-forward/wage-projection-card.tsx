import {
	createWageProjection,
	findCareerById,
} from "@/lib/projection-logic";

interface WageProjectionCardProps {
	careerId: string;
	currentWage?: number;
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
}: WageProjectionCardProps) {
	const career = findCareerById(careerId);

	if (!career) {
		return (
			<div className="rounded-lg border p-4">
				<p className="text-sm text-muted-foreground">
					Career data unavailable.
				</p>
			</div>
		);
	}

	const projection = createWageProjection(careerId, currentWage);

	return (
		<section className="space-y-4 rounded-lg border p-5">
			<div>
				<h2 className="text-2xl font-bold">Look Forward</h2>
				<p className="text-sm text-muted-foreground">
					Estimated wage outlook for {career.title}
				</p>
			</div>

			{projection ? (
				<div className="space-y-3">
					<div>
						<p className="text-sm text-muted-foreground">
							Projected median wage
						</p>
						<p className="text-2xl font-semibold">
							{formatCurrency(projection.projectedWage!)}
						</p>
						<p className="text-sm text-muted-foreground">
							per year
						</p>
					</div>

					{projection.currentWage !== undefined && (
						<div>
							<p className="text-sm text-muted-foreground">
								Current wage
							</p>
							<p className="font-medium">
								{formatCurrency(projection.currentWage)}
							</p>
						</div>
					)}

					{projection.delta !== undefined && (
						<div>
							<p className="text-sm text-muted-foreground">
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
				<p className="text-sm text-muted-foreground">
					Wage data is not available for this career.
				</p>
			)}
		</section>
	);
}