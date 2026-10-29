import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// One labeled input wired to react-hook-form, built from shadcn's Field parts.
// This is the pattern from shadcn's form docs, wrapped once so every step can
// reuse it. Controller connects the input to the form (value, onChange, rules)
// and gives us fieldState, which says whether this field has an error.
export default function FormField({ name, label, rules, ...inputProps }) {
  const { control } = useFormContext();

  // `required` only rejects "", so "   " would pass. For required fields, also
  // reject values that are only spaces, with the same message.
  const allRules = rules?.required
    ? { ...rules, validate: (value) => value.trim() !== "" || rules.required }
    : rules;

  return (
    <Controller
      name={name}
      control={control}
      rules={allRules}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            {...field}
            {...inputProps}
            id={field.name}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
