import { UserSkillSelection } from "@/components/skill-selection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="w-full bg-card px-6 py-4 text-card-foreground">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold">Placeholder Nav</span>
          <div className="flex items-center gap-6 text-sm">
            <a className="text-current no-underline visited:text-current hover:underline" href="#">
              Home
            </a>
            <a className="text-current no-underline visited:text-current hover:underline" href="#">
              About
            </a>
            <a className="text-current no-underline visited:text-current hover:underline" href="#">
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Team 2 Component Integration */}
      <main className="mx-auto max-w-6xl p-6 space-y-12">
        <UserSkillSelection />
        <hr className="border-border" />
      </main>
    </div>
  );
}