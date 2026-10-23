import { Button } from "@/components/ui/button"

export default function KitchenSinkPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header>
        <h1>Component Library</h1>
        <p>A place to preview the components available to the team.</p>
      </header>

      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">Buttons</h2>

        {/* Add button examples here */}
        <Button>Default button</Button>
      </section>

      {/* Add more component sections here */}
    </main>
  )
}