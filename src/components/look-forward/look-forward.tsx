"use client";

// Team 5 — Look Forward: pick a "what if" change and compare today's top 3
// matches with the projected top 3. Status and hand-off notes: README.md in
// this folder.

import Link from "next/link";
import { useId, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	buildDefaultScenarios,
	describeScenario,
	projectOutcomes,
	rankMatches,
	rankProjections,
	scenarioKey,
	TOP_MATCH_COUNT,
	type ProjectableMatch,
} from "@/lib/projection-logic";
import type { Scenario } from "@/types/outcomes";

import { CurrentMatchList, ProjectedMatchList } from "./match-list";
import { ScenarioPicker } from "./scenario-picker";

export interface LookForwardProps {
	// Team 4's matches for the user, in any order.
	matches: readonly ProjectableMatch[];
	// Every skill the user has today; needed to project a new skill.
	userSkills: readonly string[];
	// Overrides the three default scenarios.
	scenarios?: readonly Scenario[];
}

export function LookForward({ matches, userSkills, scenarios }: LookForwardProps) {
	const headingId = useId();
	// Selection is stored by key, not index, so it can't silently point at a
	// different scenario if the props change; a vanished one clears it.
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [announcement, setAnnouncement] = useState("");

	const options = scenarios ?? buildDefaultScenarios(matches, userSkills);
	const scenario = options.find((option) => scenarioKey(option) === selectedKey);
	const currentTop = rankMatches(matches).slice(0, TOP_MATCH_COUNT);
	const projectedTop = scenario
		? rankProjections(matches, projectOutcomes(matches, scenario, { userSkills }))
		: [];

	function handleSelect(next: Scenario) {
		setSelectedKey(scenarioKey(next));
		// Includes the scenario so switching back and forth re-announces.
		setAnnouncement(`Projection updated: ${describeScenario(next)}.`);
	}

	return (
		<section aria-labelledby={headingId} className="space-y-6">
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
					<ScenarioPicker
						scenarios={options}
						selectedKey={scenario ? selectedKey : null}
						onSelect={handleSelect}
					/>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-xl border-2 border-neutral-500 bg-neutral-100 p-4">
							<h3 className="mb-3 text-lg font-bold">Today</h3>
							<CurrentMatchList matches={currentTop} />
						</div>

						<Card className="p-4 text-base ring-0">
							<CardHeader className="px-0">
								<h3 className="font-heading text-lg leading-snug font-bold break-words">
									{scenario ? describeScenario(scenario) : "With a change"}
								</h3>
							</CardHeader>
							<CardContent className="px-0">
								{scenario ? (
									<div
										key={selectedKey}
										className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
									>
										<ProjectedMatchList outcomes={projectedTop} />
									</div>
								) : (
									<p className="rounded-xl border-2 border-dashed border-brand-yellow p-4">
										Pick a change above to see your projected top matches.
									</p>
								)}
							</CardContent>
						</Card>
					</div>

					<p className="text-sm text-neutral-700">
						Estimates only. A new skill is scored the same way as your matches;
						education and experience shifts are rough guides.
					</p>
				</>
			)}

			<p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</p>
		</section>
	);
}

function EmptyState() {
	return (
		<div className="rounded-xl border-2 border-neutral-500 bg-white p-5">
			<p className="font-bold">No career matches yet.</p>
			<p className="mt-1">
				Look Forward needs your current matches to project a change.
			</p>
			<Link
				href="/current-pathways"
				className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
			>
				See your current pathways
			</Link>
		</div>
	);
}
