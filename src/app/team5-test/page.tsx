import { WageProjectionCard } from "@/components/look-forward/wage-projection-card";

export default function Team5TestPage() {
	return (
		<main className="mx-auto max-w-4xl p-6">
			<WageProjectionCard
				careerId="00010"
				currentWage={60000}
			/>
		</main>
	);
}