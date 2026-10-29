import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioButtonGroup } from "@/components/ui/radio-button";
import { Input } from "@/components/ui/input";

export default function KitchenSinkPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <header>
        <h1 className="text-3xl font-bold">Kitchen Sink - Component Library</h1>
        <br></br>
      </header>

      <div>
        <section aria-labelledby="buttons-heading">
          <h2 id="buttons-heading" className="text-xl font-medium">Normal Buttons</h2>
          <p>Hover to see effects</p>
          <br></br>
          {/* Normal Buttons */}
          <Button variant="default" className="m-2">Button on background</Button>
          <Button variant="secondary" className="m-2">Button on card components</Button>
        

          <br></br>
          {/* Radio Buttons */}
          <div className="p-4">
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
        </section>
      </div>

      <br></br>
      {/* Field and Input Components */}
      {/* <div className="w-60 h-80 border-2 rounded-xl p-4">
        <FieldSet>
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>Input field description</FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
              <FieldDescription>This appears on invoices and emails.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" autoComplete="off" aria-invalid />
              <FieldError>Choose another username.</FieldError>
            </Field>
          </FieldGroup>
        </FieldSet>
      </div> */}

      <br></br>
      <div></div>
    </main>
  )
}