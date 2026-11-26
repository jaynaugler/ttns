"use client";

import { useState } from "react";

import { NewSkillPicker } from "@/components/new-skill-picker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { MAX_SKILL_PICKS, type SkillToLearn } from "@/lib/projection-logic";

// Text-size buttons that still meet the 44x44 target. cursor-pointer is set
// here, not in ui/button.tsx, which a teammate is changing site-wide. The
// outline replaces the default focus ring, which is grey at 50% (about
// 1.5:1 on cream) and, as a box-shadow, disappears in Windows High
// Contrast; outline-solid is needed because the Button sets outline-none.
const BUTTON_SIZE =
	"min-h-11 cursor-pointer px-4 text-base font-bold focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:focus-visible:outline-[var(--dm-brand-yellow)]";

// The user's skill picks as chips, and a "Change skills" dialog holding the
// full list. Picks are a draft until Done, so Cancel or Escape leaves them
// alone. Base UI moves focus into the dialog and back to the button.
export function SkillPickerDialog({
	skills,
	matchCount,
	picks,
	onSave,
}: {
	skills: readonly SkillToLearn[];
	matchCount: number;
	picks: readonly string[];
	onSave: (picks: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<string[]>([]);

	function handleOpenChange(next: boolean) {
		// Each opening starts from the saved picks.
		if (next) setDraft([...picks]);
		setOpen(next);
	}

	function done() {
		onSave(draft);
		setOpen(false);
	}

	return (
		<div className="flex flex-col gap-3">
			{picks.length > 0 ? (
				<ul aria-label="Skills you're adding" className="flex flex-wrap gap-2">
					{picks.map((skill) => (
						<li
							key={skill}
							className="max-w-full rounded-full border-2 border-card-blue px-3 py-1 font-bold break-words dark:border-[var(--dm-brand-yellow)]"
						>
							{skill}
						</li>
					))}
				</ul>
			) : (
				<p>No skills picked yet — Step 2 shows the recommended skill until you pick.</p>
			)}

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogTrigger
					render={<Button variant="secondary" className={`self-start ${BUTTON_SIZE}`} />}
				>
					{picks.length > 0 ? "Change skills" : "Pick skills"}
				</DialogTrigger>

				<DialogContent>
					<DialogTitle>Pick up to {MAX_SKILL_PICKS} skills to learn</DialogTitle>
					<DialogDescription>
						Your top matches are re-scored as if you already had them.
					</DialogDescription>

					<NewSkillPicker
						skills={skills}
						matchCount={matchCount}
						max={MAX_SKILL_PICKS}
						value={draft}
						onValueChange={setDraft}
					/>

					<div className="flex flex-wrap gap-3">
						<Button type="button" className={BUTTON_SIZE} onClick={done}>
							Done
						</Button>
						<DialogClose
							render={<Button type="button" variant="secondary" className={BUTTON_SIZE} />}
						>
							Cancel
						</DialogClose>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
