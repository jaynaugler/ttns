import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import {
	describeRankChange,
	describeShift,
	findCareerById,
	type RankedProjection,
	type ShiftDirection,
} from "@/lib/projection-logic";
import type { CareerMatch } from "@/types/outcomes";

const SHIFT_STYLES: Record<ShiftDirection, string> = {
	up: "bg-emerald-100 text-emerald-900",
	down: "bg-rose-100 text-brand-red",
	none: "bg-neutral-200 text-neutral-900",
};

const SHIFT_ICONS = { up: ArrowUp, down: ArrowDown, none: Minus } as const;

function careerTitle(careerId: string): string {
	return findCareerById(careerId)?.title ?? `Career ${careerId}`;
}

function percent(score: number): number {
	return Math.max(0, Math.min(100, score));
}

// Decorative: the score is always given in text beside it. The tick marks
// the score before the change so the bar shows the shift at a glance.
function ScoreBar({ score, previousScore }: { score: number; previousScore?: number }) {
	return (
		<div aria-hidden="true" className="relative mt-3 h-2.5 rounded-full bg-neutral-300">
			<div
				className="h-full rounded-full bg-card-blue motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
				style={{ width: `${percent(score)}%` }}
			/>
			{previousScore !== undefined && (
				<div
					className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-black"
					style={{ left: `calc(${percent(previousScore)}% - 1px)` }}
				/>
			)}
		</div>
	);
}

function RankBadge({ rank }: { rank: number }) {
	// The <ol> already conveys position to screen readers.
	return (
		<span
			aria-hidden="true"
			className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-red text-lg font-bold text-white"
		>
			{rank}
		</span>
	);
}

export function CurrentMatchList({ matches }: { matches: readonly CareerMatch[] }) {
	return (
		<ol role="list" className="space-y-3">
			{matches.map((match, index) => (
				<li key={match.careerId} className="flex gap-3 rounded-xl bg-white p-4 text-black">
					<RankBadge rank={index + 1} />
					<div className="min-w-0 flex-1">
						<h4 className="font-bold leading-snug break-words">{careerTitle(match.careerId)}</h4>
						<p className="mt-1 text-sm">
							Match score <strong>{match.score}</strong> out of 100
						</p>
						<ScoreBar score={match.score} />
					</div>
				</li>
			))}
		</ol>
	);
}

export function ProjectedMatchList({ outcomes }: { outcomes: readonly RankedProjection[] }) {
	return (
		<ol role="list" className="space-y-3">
			{outcomes.map((outcome) => {
				const shift = describeShift(outcome.scoreShift);
				const Icon = SHIFT_ICONS[shift.direction];
				return (
					<li key={outcome.careerId} className="flex gap-3 rounded-xl bg-white p-4 text-black">
						<RankBadge rank={outcome.rank} />
						<div className="min-w-0 flex-1">
							<h4 className="font-bold leading-snug break-words">
								{careerTitle(outcome.careerId)}
							</h4>
							<p className="mt-1 text-sm">
								Match score <strong>{outcome.score}</strong> out of 100, was{" "}
								{outcome.currentScore}
							</p>
							<p
								className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${SHIFT_STYLES[shift.direction]}`}
							>
								<Icon aria-hidden="true" className="size-4" strokeWidth={3} />
								{shift.text}
							</p>
							<p className="mt-2 text-sm text-neutral-800">{outcome.reason}</p>
							<p className="mt-1 text-sm font-medium text-neutral-800">
								{describeRankChange(outcome.rank, outcome.previousRank)}
							</p>
							<ScoreBar score={outcome.score} previousScore={outcome.currentScore} />
						</div>
					</li>
				);
			})}
		</ol>
	);
}
