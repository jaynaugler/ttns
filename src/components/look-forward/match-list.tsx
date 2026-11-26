import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import {
	describeShift,
	findCareerById,
	formatScore,
	type ShiftDirection,
} from "@/lib/projection-logic";

// Shifts are always in words and arrows too, so colour is never the only
// signal. Black on the badge green is about 8:1 in both modes.
const SHIFT_STYLES: Record<ShiftDirection, string> = {
	up: "bg-[var(--dm-badge-green)] text-black",
	down: "bg-brand-pink text-white dark:bg-[var(--dm-brand-pink)]",
	none: "bg-foreground/15 text-foreground",
};

const SHIFT_ICONS = { up: ArrowUp, down: ArrowDown, none: Minus } as const;

export function careerTitle(careerId: string): string {
	return findCareerById(careerId)?.title ?? `Career ${careerId}`;
}

function percent(score: number): number {
	return Math.max(0, Math.min(100, score));
}

// Decorative: the score is always given in text beside it. The tick marks
// the score before the change so the bar shows the shift at a glance.
function ScoreBar({ score, previousScore }: { score: number; previousScore?: number }) {
	return (
		<span aria-hidden="true" className="relative mt-1 block h-2.5 rounded-full bg-foreground/20">
			<span
				className="block h-full rounded-full bg-card-blue dark:bg-[var(--dm-brand-yellow)] motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
				style={{ width: `${percent(score)}%` }}
			/>
			{previousScore !== undefined && (
				<span
					className="absolute -top-1 block h-4.5 w-0.5 rounded-full bg-foreground"
					style={{ left: `calc(${percent(previousScore)}% - 1px)` }}
				/>
			)}
		</span>
	);
}

// "#2", or "Tied #2" when another career shows the same score.
export function rankText(rank: number, tied = false): string {
	return tied ? `Tied #${rank}` : `#${rank}`;
}

export interface PathRow {
	careerId: string;
	// Shared by careers whose scores show the same (see labelRanks).
	rank: number;
	tied?: boolean;
	// Before the change; undefined with no change picked, or if it's new.
	previousRank?: number;
	score: number;
	// Before the change; undefined with no change picked.
	previousScore?: number;
	scoreShift?: number;
	// Which new skills it uses, or why it moved.
	detail?: string;
}

// The user's top careers as one list. Every row is a toggle button that shows
// that career's wage outlook; aria-pressed marks the one showing.
export function PathList({
	rows,
	selectedId,
	onSelect,
}: {
	rows: readonly PathRow[];
	selectedId: string | undefined;
	onSelect: (careerId: string) => void;
}) {
	return (
		<ol role="list" className="space-y-3">
			{rows.map((row) => {
				const selected = row.careerId === selectedId;
				const changed = row.previousScore !== undefined;
				const shift = describeShift(row.scoreShift ?? 0);
				const Icon = SHIFT_ICONS[shift.direction];
				return (
					<li key={row.careerId}>
						<button
							type="button"
							aria-pressed={selected}
							onClick={() => onSelect(row.careerId)}
							className="flex min-h-11 w-full cursor-pointer flex-col gap-1 rounded-xl border-2 border-foreground/50 bg-background p-4 text-left text-foreground transition-[border-color] hover:border-card-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red aria-pressed:border-4 aria-pressed:border-card-blue motion-reduce:transition-none dark:bg-[var(--dm-card-grey)] dark:hover:border-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)] dark:aria-pressed:border-[var(--dm-brand-yellow)]"
						>
							<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span className="text-lg font-bold">
									{changed && row.previousRank === row.rank && !row.tied ? (
										<>Still #{row.rank}</>
									) : changed && row.previousRank !== undefined ? (
										<>
											<span aria-hidden="true">
												#{row.previousRank} → {rankText(row.rank, row.tied)}
											</span>
											<span className="sr-only">
												Was number {row.previousRank}, now {row.tied ? "tied at " : ""}number{" "}
												{row.rank}.
											</span>
										</>
									) : changed ? (
										<>
											<span aria-hidden="true">New → {rankText(row.rank, row.tied)}</span>
											<span className="sr-only">
												New, now {row.tied ? "tied at " : ""}number {row.rank}.
											</span>
										</>
									) : (
										<>
											<span aria-hidden="true">{rankText(row.rank, row.tied)}</span>
											<span className="sr-only">
												{row.tied ? "Tied at number" : "Number"} {row.rank}.
											</span>
										</>
									)}
								</span>
								{selected && (
									<span className="rounded-full bg-card-blue px-3 py-0.5 text-sm font-bold text-white dark:bg-[var(--dm-brand-yellow)] dark:text-black">
										Showing wage
									</span>
								)}
							</span>

							<span className="font-bold leading-snug break-words">{careerTitle(row.careerId)}</span>
							{row.detail && <span className="text-sm break-words">{row.detail}</span>}

							<span className="text-sm">
								{changed ? (
									<>
										Match score {formatScore(row.previousScore!)}
										<span aria-hidden="true"> → </span>
										<span className="sr-only"> to </span>
										<strong>{formatScore(row.score)}</strong> out of 100
									</>
								) : (
									<>
										Match score <strong>{formatScore(row.score)}</strong> out of 100
									</>
								)}
							</span>
							<ScoreBar score={row.score} previousScore={row.previousScore} />

							{changed && (
								<span
									className={`mt-1 inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-sm font-bold ${SHIFT_STYLES[shift.direction]}`}
								>
									<Icon aria-hidden="true" className="size-4" strokeWidth={3} />
									{shift.text}
								</span>
							)}
						</button>
					</li>
				);
			})}
		</ol>
	);
}
