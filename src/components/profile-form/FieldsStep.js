import { FieldGroup } from "@/components/ui/field";
import FormField from "./FormField";

// Renders one step from profileSteps. The full field name ("personal.firstName")
// decides where each value lives in the form data.
export default function FieldsStep({ step }) {
  return (
    <FieldGroup>
      {step.fields.map((field) => (
        <FormField
          key={field.name}
          name={`${step.key}.${field.name}`}
          label={field.label}
          rules={field.rules}
          {...field.inputProps}
        />
      ))}
    </FieldGroup>
  );
}
