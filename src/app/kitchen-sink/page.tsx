import { Button } from "@/components/ui/button";
import { RadioButtonGroup } from "@/components/ui/radio-button";

export default function KitchenSinkPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header>
        <h1 className="text-3xl font-bold">Kitchen Sink - Component Library</h1>
        <br></br>
      </header>

    <div>
      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className="text-xl font-medium">Normal Buttons</h2>
        <p>Hover to see effects</p>
        <br></br>
        <Button variant="default">Button on white background</Button>
        <Button variant="secondary">Button on card components</Button>
      </section>

      <br></br>
      <h2 className="text-xl font-medium">Radio Buttons</h2>
      <RadioButtonGroup
        name="vibe"
        defaultValue="ocean"
        options={[
          {
            value: "ocean",
            title: "Ocean Breeze",
            description: "Calm, clear waters and cool air",
          },
          {
            value: "midnight",
            title: "Deep Midnight",
            description: "Rich, intense dark velvet night",
          },
          {
            value: "sunrise",
            title: "Warm Sunrise",
            description: "Soft light and a fresh start",
          },
        ]}
      />
    </div>
    </main>
  )
}