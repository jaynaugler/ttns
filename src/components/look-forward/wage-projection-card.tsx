import type { ReactNode } from "react";

import {
	estimateWageAfterYears,
	findCareerById,
	findWage,
	medianWageChange,
	toAnnualWage,
} from "@/lib/projection-logic";
import { H2, H3, H4 } from "@/components/next-step/scale";

interface WageProjectionCardProps {
	careerId: string;
	// Another career to compare with: today's #1, or the new #1 after a
	// change (see pickWageCareer).
	comparedWith?: string;
	comparedAs?: "today" | "new";
	// The career's rank in words, e.g. "#1 today → #2 after this change".
	rankLine?: string;
	// Marks a rough "after N years" point on the wage path.
	years?: number;
	// One below the heading of the section the card sits in.
	headingLevel?: "h2" | "h3" | "h4";
}

const HEADING_BY_LEVEL = { h2: H2, h3: H3, h4: H4 } as const;

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: 0,
	}).format(value);
}

function formatHourly(value: number): string {
	return new Intl.NumberFormat("en-CA", {
		style: "currency",
		currency: "CAD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function careerTitle(careerId: string): string {
	return findCareerById(careerId)?.title ?? `Career ${careerId}`;
}

function yearUnit(years: number): string {
	return years === 1 ? "year" : "years";
}

// A career's wage path from Job Bank (src/data/wages.json): low, median and
// high wages, and optionally a rough point after N years. Every number is
// in text; the bar only repeats them.
export function WageProjectionCard({
	careerId,
	comparedWith,
	comparedAs = "today",
	rankLine,
	years,
	headingLevel = "h2",
}: WageProjectionCardProps) {
	const comparedLabel = comparedAs === "today" ? "today's #1" : "your new #1";
	const Heading = headingLevel;
	const wage = findWage(careerId);
	const median = wage?.medianWage ?? undefined;
	const low = wage?.lowWage ?? undefined;
	const high = wage?.highWage ?? undefined;
	const isAnnual = wage?.isAnnual ?? true;
	const rangePublished = low !== undefined && high !== undefined;
	const afterYears = years !== undefined ? estimateWageAfterYears(wage, years) : undefined;
	const difference = comparedWith ? medianWageChange(comparedWith, careerId) : undefined;
	const fiveTiles = rangePublished && afterYears !== undefined && comparedWith !== undefined;

	return (
		// Sits inside a Step card, so it takes the lighter tile border; the
		// heading size follows its level on Team 5's shared scale.
		<section className="min-w-0 space-y-4 rounded-lg border-2 border-foreground/30 p-4 text-foreground sm:p-5">
			<div className="space-y-1">
				<Heading className={HEADING_BY_LEVEL[headingLevel]}>
					Wage outlook: {careerTitle(careerId)}
				</Heading>
				{rankLine && <p className="font-bold">{rankLine}</p>}
				{comparedWith && (
					<p>
						Compared with {comparedLabel}, {careerTitle(comparedWith)}.
					</p>
				)}
			</div>

			{median === undefined ? (
				<p>Wage data is not published for this career.</p>
			) : (
				<>
					{/* Up to four tiles in a row. With five (an experience estimate and a
					    comparison), those two lead on a row of their own and the range
					    follows in a row of three, so nothing is left hanging. */}
					<dl
						className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${fiveTiles ? "lg:grid-cols-6" : "lg:grid-cols-4"}`}
					>
						{afterYears && years !== undefined && (
							<WageTile
								term={`After ${years} ${yearUnit(years)}`}
								className={fiveTiles ? "lg:col-span-3" : ""}
							>
								<WageAmount amount={afterYears.amount} isAnnual={isAnnual} />
							</WageTile>
						)}
						{comparedWith && (
							<WageTile
								term={
									comparedAs === "today"
										? "Vs today's #1"
										: `Vs your new #1, ${careerTitle(comparedWith)}`
								}
								className={fiveTiles ? "lg:col-span-3" : ""}
							>
								{difference === undefined ? (
									"Can't compare"
								) : difference === 0 ? (
									<span className="text-xl font-bold">No difference</span>
								) : (
									// "more" or "less" in words, so colour is never the only cue.
									<>
										<span className="text-xl font-bold">
											{difference > 0 ? "+" : "−"}
											{formatCurrency(Math.abs(difference))}
										</span>
										<span className="sr-only"> </span>
										<span className="text-sm">{difference > 0 ? "more" : "less"} a year</span>
									</>
								)}
							</WageTile>
						)}
						{rangePublished && (
							<WageTile term="Starting out" className={fiveTiles ? "lg:col-span-2" : ""}>
								<WageAmount amount={low} isAnnual={isAnnual} />
							</WageTile>
						)}
						<WageTile term="Typical (median)" className={fiveTiles ? "lg:col-span-2" : ""}>
							<WageAmount amount={median} isAnnual={isAnnual} />
							{!rangePublished && <span className="text-sm">Range not published</span>}
						</WageTile>
						{rangePublished && (
							<WageTile
								term="Top earners"
								className={fiveTiles ? "sm:col-span-2 lg:col-span-2" : ""}
							>
								<WageAmount amount={high} isAnnual={isAnnual} />
							</WageTile>
						)}
					</dl>

					{rangePublished && (
						<WagePath
							low={low}
							median={median}
							high={high}
							after={afterYears?.amount}
							years={years}
						/>
					)}

					<p>
						{rangePublished
							? `Starting out about ${formatCurrency(toAnnualWage(low, isAnnual))}, typical ${formatCurrency(toAnnualWage(median, isAnnual))}, top earners ${formatCurrency(toAnnualWage(high, isAnnual))} a year (Job Bank's lowest 10%, median and top 10%).`
							: `Typical ${formatCurrency(toAnnualWage(median, isAnnual))} a year. The range isn't published.`}
						{afterYears && years !== undefined && (
							<>
								{" "}
								After {years} {yearUnit(years)}, about {formatCurrency(afterYears.annual)} a year
								{afterYears.rangePublished
									? " — a rough guide, not pay by years."
									: " (the median, because the range isn't published)."}
							</>
						)}
					</p>
				</>
			)}
		</section>
	);
}

function WageTile({
	term,
	className = "",
	children,
}: {
	term: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={`flex min-w-0 flex-col gap-1 rounded-lg border-2 border-foreground/30 p-4 ${className}`}>
			<dt className="text-sm font-bold break-words">{term}</dt>
			<dd className="flex min-w-0 flex-col gap-1 break-words">{children}</dd>
		</div>
	);
}

// The yearly figure, plus the hourly rate behind it for hourly careers.
function WageAmount({ amount, isAnnual }: { amount: number; isAnnual: boolean }) {
	return (
		<>
			<span className="text-xl font-bold">{formatCurrency(toAnnualWage(amount, isAnnual))}/yr</span>
			{!isAnnual && (
				<>
					{/* Read as "…/yr, …/hour", not run together. */}
					<span className="sr-only">, </span>
					<span className="text-sm">{formatHourly(amount)}/hour</span>
				</>
			)}
		</>
	);
}

// Decorative: starting out to top earners as a lightly shaded range, filled
// up to "after N years" when experience applies, with the median as a plain
// labelled tick. The numbers are all in the text above and below it.
function WagePath({
	low,
	median,
	high,
	after,
	years,
}: {
	low: number;
	median: number;
	high: number;
	after?: number;
	years?: number;
}) {
	const at = (amount: number) =>
		`${high > low ? Math.max(0, Math.min(100, ((amount - low) / (high - low)) * 100)) : 50}%`;

	return (
		<div aria-hidden="true" className="space-y-1 pt-6 pb-6">
			{/* The whole range is lightly shaded, so the bar never looks empty; the
			    solid fill only appears for an "after N years" estimate. */}
			<div className="relative h-3 rounded-full bg-card-blue/25 dark:bg-[var(--dm-brand-yellow)]/30">
				{after !== undefined && (
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-card-blue motion-safe:transition-[width] motion-safe:duration-500 dark:bg-[var(--dm-brand-yellow)]"
						style={{ width: at(after) }}
					/>
				)}
				<Marker left={at(median)} label="Typical" position="below" />
				{after !== undefined && years !== undefined && (
					<Marker
						left={at(after)}
						label={`After ${years} ${yearUnit(years)}`}
						position="above"
						strong
					/>
				)}
			</div>
			<div className="flex justify-between text-sm">
				<span>Starting out</span>
				<span>Top earners</span>
			</div>
		</div>
	);
}

function Marker({
	left,
	label,
	position,
	strong = false,
}: {
	left: string;
	label: string;
	position: "above" | "below";
	strong?: boolean;
}) {
	return (
		<div
			className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center motion-safe:transition-[left] motion-safe:duration-500"
			style={{ left }}
		>
			<span
				className={`block h-6 rounded-full bg-foreground ${strong ? "w-1.5" : "w-0.5"}`}
			/>
			<span
				// top-9 keeps a below caption clear of the "Starting out / Top
				// earners" row under the bar (top-7 overlapped it when the median
				// sat near the low end of the range).
				className={`absolute whitespace-nowrap text-xs font-bold ${position === "above" ? "-top-5" : "top-9"}`}
			>
				{label}
			</span>
		</div>
	);
}
