"use client";

// Team 5 — Look Forward: pick up to three skills to learn, choose a change,
// and see how the user's top careers move, with a wage outlook for the
// career they select. Status and hand-off notes: README.md in this folder.

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import {
	buildDefaultScenarios,
	buildScenarios,
	describeScenario,
	estimateWageAfterYears,
	findWage,
	medianAnnualWage,
	labelRanks,
	pickWageCareer,
	projectedPaths,
	summaryWage,
	projectOutcomes,
	rankMatches,
	scenarioKey,
	skillsUsed,
	TOP_MATCH_COUNT,
	type ProjectableMatch,
	type SkillToLearn,
} from "@/lib/projection-logic";
import type { LookForwardChoice } from "@/lib/journey-progress";
import type { Scenario } from "@/types/outcomes";

import { careerTitle, PathList, rankText, type PathRow } from "./match-list";
import { ScenarioPicker } from "./scenario-picker";
import { SkillPickerDialog } from "./skill-picker-dialog";
import { SummaryStrip } from "./summary-strip";
import { formatCurrency, WageProjectionCard } from "./wage-projection-card";

export interface LookForwardProps {
	// Team 4's matches for the user, in any order.
	matches: readonly ProjectableMatch[];
	// Every skill the user has today; needed to project a new skill.
	userSkills: readonly string[];
	// Overrides the three default scenarios.
	scenarios?: readonly Scenario[];
	// Adds Step 1: the user's skill picks with a "Change skills" dialog.
	// onChange saves them; `scenarios` must then hold their "gain-skills"
	// option (see buildScenarios), which is selected.
	skillPicker?: {
		skills: readonly SkillToLearn[];
		picks: readonly string[];
		onChange: (picks: string[]) => void;
	};
	// Keeps the user's choice across visits: `saved` restores the selected
	// change, its years and the career row; onChange gets every change (null
	// when no change is selected), for /next-step to lead with.
	choice?: {
		saved?: LookForwardChoice;
		onChange: (choice: LookForwardChoice | null) => void;
	};
}

export function LookForward({ matches, userSkills, scenarios, skillPicker, choice }: LookForwardProps) {
	const headingId = useId();
	const saved = choice?.saved;
	// Selection is stored by key, not index, so it can't silently point at a
	// different scenario if the props change; a vanished one clears it.
	const [selectedKey, setSelectedKey] = useState<string | null>(
		saved ? scenarioKey(saved.scenario) : null,
	);
	// The career row the user clicked; until then the wage card follows #1.
	const [chosenCareer, setChosenCareer] = useState<string | null>(saved?.careerCode ?? null);
	const [announcement, setAnnouncement] = useState("");
	const [experienceYears, setExperienceYears] = useState(
		saved?.scenario.kind === "add-experience" || saved?.scenario.kind === "combined"
			? saved.scenario.years
			: 1,
	);

	// The experience and "Do all three" options take the years chosen on the
	// experience card.
	const options = (scenarios ?? buildDefaultScenarios(matches, userSkills)).map((option) =>
		option.kind === "add-experience" || option.kind === "combined"
			? { ...option, years: experienceYears }
			: option,
	);
	const scenario = options.find((option) => scenarioKey(option) === selectedKey);
	const picks = skillPicker?.picks ?? [];
	const currentTop = rankMatches(matches).slice(0, TOP_MATCH_COUNT);
	const rows = pathRows(scenario);
	const wage = pickWageCareer(currentTop, scenario ? rows : undefined, chosenCareer);
	const wageCareer = wage?.careerId;
	const wageRow = rows.find((row) => row.careerId === wageCareer);
	const todayTop = currentTop[0];
	const projectedTop = scenario ? rows[0] : undefined;
	// Careers sharing #1, so the summary doesn't name one as ahead.
	const todayTiedTop = pathRows(undefined).filter((row) => row.rank === 1);
	const projectedTiedTop = scenario ? rows.filter((row) => row.rank === 1) : [];
	const years =
		scenario?.kind === "add-experience" || scenario?.kind === "combined"
			? scenario.years
			: undefined;

	// Report the choice whenever the change, its years or the wage career
	// changes. Keyed on strings, so a new array identity doesn't re-fire it.
	const choiceKey = scenario && wageCareer ? `${scenarioKey(scenario)}@${wageCareer}` : "";
	const onChoiceChange = choice?.onChange;
	useEffect(() => {
		if (!onChoiceChange) return;
		onChoiceChange(scenario && wageCareer ? { scenario, careerCode: wageCareer } : null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [choiceKey, onChoiceChange]);

	function pathRows(next: Scenario | undefined): PathRow[] {
		if (!next) {
			// Today's top 3, with every career tied at #3 kept.
			const ranked = rankMatches(matches);
			const labels = labelRanks(ranked);
			return ranked
				.map((match, index) => ({ careerId: match.careerId, ...labels[index], score: match.score }))
				.filter((row) => row.rank <= TOP_MATCH_COUNT);
		}
		const outcomes = projectOutcomes(matches, next, { userSkills });
		// Today's #1 stays listed even when it drops out of the top 3.
		return projectedPaths(matches, outcomes).map((outcome) => ({
			careerId: outcome.careerId,
			rank: outcome.rank,
			tied: outcome.tied,
			previousRank: outcome.previousRank,
			score: outcome.score,
			previousScore: outcome.currentScore,
			scoreShift: outcome.scoreShift,
			detail: rowDetail(next, outcome.careerId, outcome.reason),
		}));
	}

	function rowDetail(next: Scenario, careerId: string, reason: string): string {
		const skills =
			next.kind === "gain-skills" ? next.skills : next.kind === "gain-skill" ? [next.skill] : null;
		if (!skills) return reason;
		const match = matches.find((m) => m.careerId === careerId);
		const used = match ? skillsUsed(match, skills, userSkills) : [];
		if (used.length === 0) {
			return skills.length === 1 ? "Doesn't use this skill" : "Doesn't use these skills";
		}
		return skills.length === 1
			? next.kind === "gain-skill"
				? `Uses the recommended skill: ${used[0]}`
				: `Uses your new skill: ${used[0]}`
			: `Uses ${used.length} of your ${skills.length} new skills: ${used.join(", ")}`;
	}

	function wageSentence(careerId: string): string {
		const median = medianAnnualWage(careerId);
		return median !== undefined
			? `Showing wage for ${careerTitle(careerId)}: median ${formatCurrency(median)} a year.`
			: `Showing wage for ${careerTitle(careerId)}: wage not published.`;
	}

	// The experience estimate for a career, e.g. "about $63,000 a year after
	// 2 years". Undefined when its wages aren't published.
	function afterYearsText(careerId: string, after: number): string | undefined {
		const estimate = estimateWageAfterYears(findWage(careerId), after);
		return estimate
			? `about ${formatCurrency(estimate.annual)} a year after ${after} ${after === 1 ? "year" : "years"}`
			: undefined;
	}

	function select(next: Scenario) {
		setSelectedKey(scenarioKey(next));
		const nextRows = pathRows(next);
		const parts = [`Projection updated: ${describeScenario(next)}.`];
		if (nextRows[0]) parts.push(`New #1: ${careerTitle(nextRows[0].careerId)}.`);
		const nextWage = pickWageCareer(currentTop, nextRows, chosenCareer)?.careerId;
		if (nextWage && nextWage !== wageCareer) parts.push(wageSentence(nextWage));
		if ((next.kind === "add-experience" || next.kind === "combined") && nextRows[0]) {
			const estimate = afterYearsText(nextRows[0].careerId, next.years);
			if (estimate) parts.push(`${careerTitle(nextRows[0].careerId)}: ${estimate}.`);
		}
		// Includes the scenario so switching back and forth re-announces.
		setAnnouncement(parts.join(" "));
	}

	// Choosing years selects Add experience, unless "Do all three" is
	// selected, which keeps its selection with the new years.
	function chooseYears(next: number) {
		setExperienceYears(next);
		select(
			scenario?.kind === "combined"
				? { ...scenario, years: next }
				: { kind: "add-experience", years: next },
		);
	}

	function chooseCareer(careerId: string) {
		setChosenCareer(careerId);
		setAnnouncement(wageSentence(careerId));
	}

	function changePicks(next: string[]) {
		skillPicker?.onChange(next);
		if (next.length > 0) {
			select({ kind: "gain-skills", skills: next });
		} else {
			// Back to the suggested skill, if there is one.
			const suggested = buildScenarios(matches, userSkills)[0];
			if (suggested?.kind === "gain-skill") select(suggested);
			else setSelectedKey(null);
		}
	}

	return (
		<section aria-labelledby={headingId} className="space-y-8">
			<header className="relative overflow-hidden rounded-2xl bg-card-blue px-5 py-6 text-white sm:px-8 sm:py-8">
				<div
					aria-hidden="true"
					className="absolute inset-y-0 right-0 w-3 bg-brand-yellow sm:w-4"
				/>
				<p className="text-sm font-bold tracking-widest text-brand-yellow uppercase">
					Look Forward
				</p>
				<h2 id={headingId} className="mt-1 text-2xl font-bold text-balance sm:text-3xl">
					What if you took one more step?
				</h2>
				<p className="mt-2 max-w-prose text-base text-white">
					Try a change and see how your top career matches would move.
				</p>
			</header>

			{currentTop.length === 0 ? (
				<EmptyState />
			) : (
				<>
					<section aria-label="At a glance">
						<SummaryStrip
							picks={picks}
							today={todayTop}
							todayTied={todayTiedTop.length > 1 ? todayTiedTop.map((row) => row.careerId) : undefined}
							projected={projectedTop}
							projectedTied={
								projectedTiedTop.length > 1
									? projectedTiedTop.map((row) => row.careerId)
									: undefined
							}
							wage={
								scenario && todayTop
									? summaryWage(todayTop.careerId, rows, wageCareer, years)
									: undefined
							}
							years={years}
						/>
					</section>

					{skillPicker && (
						<Step title="Step 1: Pick up to 3 skills">
							<SkillPickerDialog
								skills={skillPicker.skills}
								matchCount={matches.length}
								picks={picks}
								onSave={changePicks}
							/>
						</Step>
					)}

					<Step title={`Step ${skillPicker ? 2 : 1}: Choose a change`}>
						<p>Your matches are re-scored as if you had already made the change.</p>
						<ScenarioPicker
							scenarios={options}
							selectedKey={scenario ? selectedKey : null}
							onSelect={select}
							legend="Choose a change"
							experienceYears={experienceYears}
							onExperienceYearsChange={chooseYears}
						/>
					</Step>

					<Step title={`Step ${skillPicker ? 3 : 2}: Your new paths`}>
						<p>
							{scenario
								? "Select a career to see its wage outlook."
								: "Pick a change above to see how these move. Select a career to see its wage outlook."}
						</p>
						<div
							key={selectedKey ?? "today"}
							className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
						>
							<PathList rows={rows} selectedId={wageCareer} onSelect={chooseCareer} />
						</div>
						{wageCareer && (
							<WageProjectionCard
								careerId={wageCareer}
								comparedWith={wage?.comparedWith}
								comparedAs={wage?.comparedAs}
								rankLine={wageRow && rankLine(wageRow)}
								years={years}
								headingLevel="h4"
							/>
						)}
					</Step>
				</>
			)}

			<p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</p>
		</section>
	);
}

// The selected row's rank in words, for the wage card.
function rankLine(row: PathRow): string {
	const now = rankText(row.rank, row.tied);
	if (row.previousScore === undefined) return `${now} today`;
	if (row.previousRank === undefined) return `New to your top 3: ${now} after this change`;
	if (row.previousRank === row.rank && !row.tied) return `Still #${row.rank}`;
	return `#${row.previousRank} today → ${now} after this change`;
}

function Step({ title, children }: { title: string; children: ReactNode }) {
	const id = useId();
	return (
		<section aria-labelledby={id} className="space-y-3">
			<h3 id={id} className="text-xl font-bold">
				{title}
			</h3>
			{children}
		</section>
	);
}

function EmptyState() {
	return (
		<div className="rounded-xl border-2 border-foreground/50 bg-background p-5 text-foreground dark:bg-[var(--dm-card-grey)]">
			<p className="font-bold">No career matches yet.</p>
			<p className="mt-1">
				Look Forward needs your current matches to project a change.
			</p>
			{/* Dark mode: the global dark link blue is under 2:1 on the grey
			    card, and brand red is under 3:1 as a focus outline, so both
			    switch to the dark-mode yellow here. */}
			<Link
				href="/current-pathways"
				className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:text-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)]"
			>
				See your current pathways
			</Link>
		</div>
	);
}
