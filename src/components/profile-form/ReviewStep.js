import { Fragment } from "react";
import { useFormContext } from "react-hook-form";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { profileSteps } from "./profileSteps";

// Read-only summary of everything entered, one section per step in
// profileSteps. Edit passes the step's index so ProfileForm can jump back to it.
// getValues reads the current form values; this step is rendered fresh each
// time we reach it, so it's up to date.
export default function ReviewStep({ onEdit }) {
  const { getValues } = useFormContext();

  return (
    <div className="flex flex-col gap-4">
      {profileSteps.map((step, i) => (
        <Fragment key={step.key}>
          {i > 0 && <Separator />}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{step.reviewTitle}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(i)}
                aria-label={`Edit ${step.reviewTitle}`}
              >
                <PencilIcon />
                Edit
              </Button>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {step.fields.map((field) => {
                const value = getValues(`${step.key}.${field.name}`)?.trim();
                return (
                  <Fragment key={field.name}>
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="break-words">
                      {value || (
                        <span className="text-muted-foreground italic">
                          {field.optional ? "Optional, not added" : "Missing"}
                        </span>
                      )}
                    </dd>
                  </Fragment>
                );
              })}
            </dl>
          </section>
        </Fragment>
      ))}
    </div>
  );
}
