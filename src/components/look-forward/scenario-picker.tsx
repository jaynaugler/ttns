"use client";

import { Check } from "lucide-react";
import { useId } from "react";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import { describeScenario, scenarioKey } from "@/lib/projection-logic";
import type { Scenario } from "@/types/outcomes";

// The years the experience card offers.
export const EXPERIENCE_YEAR_CHOICES = [1, 2, 5] as const;

function scenarioTitle(scenario: Scenario): string {
	switch (scenario.kind) {
		case "gain-skill":
			return `Try the recommended skill: ${scenario.skill}`;
		case "gain-skills":
			return `Learn your ${scenario.skills.length} ${scenario.skills.length === 1 ? "skill" : "skills"}`;
		case "finish-education":
			return "Finish an education step";
		case "add-experience":
			return "Add experience";
		case "combined":
			return "Do all three";
	}
}

function scenarioDetail(scenario: Scenario): string {
	return scenario.kind === "gain-skill"
		? "Pick your own skills in Step 1"
		: describeScenario(scenario);
}

// Native radios in a fieldset: the legend is read before the options, and
// the browser supplies arrow-key movement between them. Each card's label
// covers its title, so the click target is far larger than 44x44. The
// experience card adds its own small radio group for how many years.
export function ScenarioPicker({
	scenarios,
	selectedKey,
	onSelect,
	legend,
	experienceYears,
	onExperienceYearsChange,
}: {
	scenarios: readonly Scenario[];
	selectedKey: string | null;
	onSelect: (scenario: Scenario) => void;
	// Read before the options; the visible heading sits outside the fieldset.
	legend: string;
	experienceYears?: number;
	onExperienceYearsChange?: (years: number) => void;
}) {
	const name = useId();
	const yearsName = useId();

	return (
		<FieldSet className="gap-3">
			<FieldLegend className="sr-only">{legend}</FieldLegend>

			{/* One column on phones, 2x2 on tablets, four across on desktop. */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{scenarios.map((scenario) => {
					const key = scenarioKey(scenario);
					const selected = selectedKey === key;
					return (
						// Only border and background animate, so the focus outline
						// appears at full strength immediately.
						// Keyed by kind, not by scenarioKey: the key changes with the years
						// or skills, and remounting would drop focus from the year radios.
						<div
							key={scenario.kind}
							data-selected={selected || undefined}
							className="flex min-w-0 flex-col gap-3 rounded-xl border-2 border-foreground/50 bg-background p-4 text-foreground transition-[border-color,background-color] hover:border-card-blue has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red data-selected:border-card-blue data-selected:bg-brand-yellow data-selected:text-black motion-reduce:transition-none dark:bg-[var(--dm-card-grey)] dark:hover:border-[var(--dm-brand-yellow)] dark:has-focus-visible:outline-[var(--dm-brand-yellow)] dark:data-selected:border-[var(--dm-brand-yellow)] dark:data-selected:bg-[var(--dm-brand-yellow)]"
						>
							<label className="flex min-h-11 cursor-pointer items-start gap-3">
								<input
									type="radio"
									name={name}
									value={key}
									checked={selected}
									onChange={() => onSelect(scenario)}
									className="mt-0.5 size-5 shrink-0 cursor-pointer accent-card-blue focus-visible:outline-none"
								/>
								<span className="flex min-w-0 flex-col gap-1">
									<span className="font-bold leading-snug break-words">{scenarioTitle(scenario)}</span>
									<span className="text-sm break-words">{scenarioDetail(scenario)}</span>
								</span>
							</label>

							{scenario.kind === "add-experience" && onExperienceYearsChange && (
								<fieldset className="flex flex-wrap items-center gap-2">
									<legend className="sr-only">Years of experience</legend>
									{EXPERIENCE_YEAR_CHOICES.map((years) => (
										<label
											key={years}
											className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-current px-3 font-bold has-checked:bg-card-blue has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-red dark:has-checked:bg-[var(--dm-brand-red)]"
										>
											<input
												type="radio"
												name={yearsName}
												value={years}
												checked={experienceYears === years}
												onChange={() => onExperienceYearsChange(years)}
												className="sr-only"
											/>
											{/* A tick as well as the fill, so the choice isn't colour only. */}
											{experienceYears === years && (
												<Check aria-hidden="true" className="size-4" strokeWidth={3} />
											)}
											{years} {years === 1 ? "year" : "years"}
										</label>
									))}
								</fieldset>
							)}
						</div>
					);
				})}
			</div>
		</FieldSet>
	);
}
