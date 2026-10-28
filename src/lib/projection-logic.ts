// Team 5 logic for calculating outcome shifts

import careersData from "@/data/careers.json";
import type { Career, WageProjection } from "@/types/outcomes";

const careers = careersData as Career[];

export function findCareerById(careerId: string): Career | undefined {
	return careers.find((career) => career.id === careerId);
}

export function createWageProjection(
	careerId: string,
	currentWage?: number,
): WageProjection | undefined {
	const career = findCareerById(careerId);

	if (career?.medianWage === undefined) {
		return undefined;
	}

	const validCurrentWage =
		typeof currentWage === "number" &&
		Number.isFinite(currentWage) &&
		currentWage >= 0
			? currentWage
			: undefined;

	return {
		currentWage: validCurrentWage,
		projectedWage: career.medianWage,
		delta:
			validCurrentWage !== undefined
				? career.medianWage - validCurrentWage
				: undefined,
		periodLabel: "per year",
	};
}