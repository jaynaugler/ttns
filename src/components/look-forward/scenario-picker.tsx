"use client";

import { useId } from "react";

import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { describeScenario, scenarioKey } from "@/lib/projection-logic";
import type { Scenario, ScenarioKind } from "@/types/outcomes";

const SCENARIO_TITLES: Record<ScenarioKind, string> = {
	"gain-skill": "Gain a skill",
	"finish-education": "Finish an education step",
	"add-experience": "Add experience",
};

// Native radios in a fieldset: the legend is read before the options, and
// the browser supplies arrow-key movement between them. Each whole card is
// the label, so the click target is far larger than 44x44.
export function ScenarioPicker({
	scenarios,
	selectedKey,
	onSelect,
}: {
	scenarios: readonly Scenario[];
	selectedKey: string | null;
	onSelect: (scenario: Scenario) => void;
}) {
	const name = useId();
	const descriptionId = `${name}-description`;

	return (
		<FieldSet aria-describedby={descriptionId} className="gap-3">
			<FieldLegend className="text-lg font-bold text-foreground data-[variant=legend]:text-lg">
				Choose a change to try
			</FieldLegend>
			<FieldDescription
				id={descriptionId}
				className="text-base text-neutral-700 dark:text-neutral-300"
			>
				Your matches are re-scored as if you had already made the change.
			</FieldDescription>

			<div className="grid gap-3 sm:grid-cols-3">
				{scenarios.map((scenario) => {
					const key = scenarioKey(scenario);
					return (
						// Only border and background animate, so the focus outline
						// appears at full strength immediately. Dark mode swaps in
						// PR #28's grey card and yellow; card blue and brand red
						// are under 3:1 against the dark page.
						<label
							key={key}
							className="group flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-neutral-500 bg-white p-4 text-black transition-[border-color,background-color] hover:border-card-blue has-checked:border-card-blue has-checked:bg-brand-yellow has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red motion-reduce:transition-none dark:border-neutral-400 dark:bg-[var(--dm-card-grey)] dark:text-white dark:hover:border-white dark:has-checked:border-white dark:has-checked:bg-[var(--dm-brand-yellow)] dark:has-checked:text-black dark:has-focus-visible:outline-[var(--dm-brand-yellow)]"
						>
							<input
								type="radio"
								name={name}
								value={key}
								checked={selectedKey === key}
								onChange={() => onSelect(scenario)}
								className="mt-0.5 size-5 shrink-0 cursor-pointer accent-card-blue focus-visible:outline-none"
							/>
							<span className="flex min-w-0 flex-col gap-1">
								<span className="font-bold leading-snug">
									{SCENARIO_TITLES[scenario.kind]}
								</span>
								<span className="text-sm break-words text-neutral-800 dark:text-neutral-200 dark:group-has-checked:text-neutral-800">
									{describeScenario(scenario)}
								</span>
							</span>
						</label>
					);
				})}
			</div>
		</FieldSet>
	);
}
