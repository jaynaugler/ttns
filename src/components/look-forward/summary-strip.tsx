import type { ReactNode } from "react";

import {
	describeShift,
	formatScore,
	MAX_SKILL_PICKS,
	type SummaryWage,
} from "@/lib/projection-logic";

import { careerTitle } from "./match-list";
import { formatCurrency } from "./wage-projection-card";

export interface SummaryTop {
	careerId: string;
	score: number;
	scoreShift?: number;
}

// Read between a tile's value and its detail, so screen readers and copied
// text don't run them together.
function Pause() {
	return <span className="sr-only">, </span>;
}

// Four tiles at the top of Look Forward, as a description list so each
// value is read with its label.
export function SummaryStrip({
	picks,
	today,
	todayTied,
	projected,
	projectedTied,
	wage,
	years,
}: {
	picks: readonly string[];
	today: SummaryTop | undefined;
	// Every career sharing today's #1, when more than one does.
	todayTied?: readonly string[];
	// The projected #1, or undefined with no change picked.
	projected: SummaryTop | undefined;
	// Every career sharing the projected #1, when more than one does.
	projectedTied?: readonly string[];

	// The wage tile's career and figures (see summaryWage).
	wage: SummaryWage | undefined;
	// Years of experience, when that applies.
	years?: number;
}) {
	const sameTop = projected !== undefined && projected.careerId === today?.careerId;
	// The wage tile follows the wage card. When that isn't the projected #1
	// (a selected row) or #1 is shared, it names its career.
	const wageNamed =
		wage?.careerId !== undefined && (wage.tied || wage.careerId !== projected?.careerId);

	return (
		<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<Tile term="Skills you're adding">
				<span className="block text-xl font-bold">
					{picks.length} of {MAX_SKILL_PICKS}
				</span>
				{picks.length > 0 && (
					<>
						<Pause />
						<span className="block text-sm">{picks.join(", ")}</span>
					</>
				)}
			</Tile>

			<Tile term="Your #1 today">
				{today ? (
					<>
						<span className="block font-bold leading-snug break-words">
							{todayTied
								? `Tied #1: ${todayTied.map(careerTitle).join(" and ")}`
								: careerTitle(today.careerId)}
						</span>
						<Pause />
						<span className="block text-sm">Match score {formatScore(today.score)}</span>
					</>
				) : (
					"No matches yet"
				)}
			</Tile>

			<Tile term="New #1 with the selected change">
				{projected ? (
					<>
						<span className="block font-bold leading-snug break-words">
							{projectedTied
								? `Tied #1: ${projectedTied.map(careerTitle).join(" and ")}`
								: careerTitle(projected.careerId)}
						</span>
						<Pause />
						<span className="block text-sm">
							Match score {formatScore(projected.score)}
							{/* Tied careers can move by different amounts, so no shift. */}
							{!projectedTied && (
								<>
									, {describeShift(projected.scoreShift ?? 0).text.toLowerCase()}
									{sameTop && " (same #1)"}
								</>
							)}
						</span>
					</>
				) : (
					"Pick a change in Step 2"
				)}
			</Tile>

			<Tile term="Median wage change vs today's #1">
				{!projected || !wage?.careerId ? (
					"Pick a change in Step 2"
				) : (
					<>
						<span className="block text-xl font-bold">
							{wageNamed
								? namedChange(wage.careerId, wage.change, today?.careerId)
								: wage.careerId === today?.careerId || wage.change === 0
									? "No change"
									: wage.change === undefined
										? "Not published"
										: `${wage.change > 0 ? "+" : "−"}${formatCurrency(Math.abs(wage.change))} ${wage.change > 0 ? "more" : "less"} a year`}
						</span>
						{wage.afterYears && years !== undefined && (
							<>
								<Pause />
								<span className="block text-sm">
									{wageNamed ? `${careerTitle(wage.careerId)}: about` : "About"}{" "}
									{formatCurrency(wage.afterYears.annual)} a year after {years}{" "}
									{years === 1 ? "year" : "years"}
								</span>
							</>
						)}
					</>
				)}
			</Tile>
		</dl>
	);
}

// A wage difference that always names its career, for a tie at #1.
function namedChange(careerId: string, change: number | undefined, todayId?: string): string {
	const title = careerTitle(careerId);
	if (careerId === todayId) return `${title} is today's #1`;
	if (change === undefined) return `${title}: wage not published`;
	if (change === 0) return `${title}: same as today's #1`;
	return `${title}: ${formatCurrency(Math.abs(change))} ${change > 0 ? "more" : "less"} a year than today's #1`;
}

function Tile({ term, children }: { term: string; children: ReactNode }) {
	return (
		// min-w-0 lets a grid item shrink below its longest word, so long career
		// names wrap instead of pushing past the edge at 320px / 400% zoom.
		<div className="flex min-w-0 flex-col gap-1 rounded-xl border-2 border-foreground/50 bg-background p-4 text-foreground dark:bg-[var(--dm-card-grey)]">
			<dt className="text-sm font-bold tracking-wide break-words uppercase">{term}</dt>
			<dd className="min-w-0 space-y-1 break-words">{children}</dd>
		</div>
	);
}
