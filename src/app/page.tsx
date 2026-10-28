import { UserSkillSelection } from "@/components/skill-selection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Team 2 Component Integration */}
      <main className="mx-auto max-w-6xl p-6 space-y-12">
        <UserSkillSelection />
        <hr className="border-border" />
      </main>
    </div>
  );
}