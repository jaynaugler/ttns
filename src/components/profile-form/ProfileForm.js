// "use client" makes this a Client Component. It's needed because we use
// useState, react-hook-form and click handlers, which only run in the browser.
"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { profileSteps, profileDefaultValues } from "./profileSteps";
import FieldsStep from "./FieldsStep";
import ReviewStep from "./ReviewStep";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// All steps: the field steps from profileSteps, then the read-only review,
// which has no fields of its own. currentStep is just an index into this array.
const steps = [...profileSteps, { key: "review", title: "Review your profile" }];
const reviewStep = steps.length - 1;

export default function ProfileForm() {
  // react-hook-form holds all form values. They survive step changes because
  // unmounted fields keep their values by default (shouldUnregister: false).
  const methods = useForm({
    // Check a field when the user leaves it, then again on every keystroke,
    // so an error disappears as soon as it's fixed.
    mode: "onTouched",
    defaultValues: profileDefaultValues,
  });
  const [currentStep, setCurrentStep] = useState(0);
  // True after clicking Edit on the review, so Next goes straight back to the
  // review instead of walking through the remaining steps again.
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isLastStep = currentStep === reviewStep;
  const step = steps[currentStep];

  let nextLabel = "Next";
  if (isLastStep) nextLabel = "Create my profile";
  else if (editingFromReview) nextLabel = "Back to review";
  else if (currentStep === reviewStep - 1) nextLabel = "Review profile";

  // Validate only the current step's fields (e.g. everything under "personal")
  // and move on only if they all pass. shouldFocus puts the cursor in the first
  // field with an error.
  async function handleNext(e) {
    e.preventDefault();
    const valid = await methods.trigger(step.key, { shouldFocus: true });
    if (!valid) return;
    if (editingFromReview) {
      setEditingFromReview(false);
      setCurrentStep(reviewStep);
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  // Called by the review's Edit buttons with the step to go back to.
  function handleEdit(step) {
    setEditingFromReview(true);
    setCurrentStep(step);
  }

  // handleSubmit validates every field first and only calls this if all pass.
  function onSubmit() {
    setSubmitted(true);
  }

  function startOver() {
    methods.reset(profileDefaultValues);
    setCurrentStep(0);
    setEditingFromReview(false);
    setSubmitted(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      {/* Card uses bg-card, which is blue in our theme, so the card body is
          set to white and only the header gets the blue. pt-0 lets the header
          reach the top edge. --card-spacing sets the card's padding. */}
      <Card className="w-full max-w-md bg-white pt-0 text-foreground shadow-sm [--card-spacing:--spacing(6)]">
        <CardHeader className="bg-card py-4 text-card-foreground">
          {submitted ? (
            <>
              <CardTitle className="text-lg font-semibold">
                Profile form complete
              </CardTitle>
              <CardDescription className="text-card-foreground/80">
                Thanks for filling out the profile form.
              </CardDescription>
            </>
          ) : (
            <>
              <CardDescription className="text-card-foreground/80">
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
              <CardTitle className="text-lg font-semibold">
                {step.title}
              </CardTitle>
              {/* value is a percentage. The **:data-[slot=...] classes restyle the
                  track and indicator inside Progress: yellow bar on a light track. */}
              <Progress
                value={((currentStep + 1) / steps.length) * 100}
                className="mt-2 **:data-[slot=progress-indicator]:bg-secondary **:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:bg-white/20"
              />
            </>
          )}
        </CardHeader>

        {/* FormProvider shares the form with every FormField inside the steps,
            which reads it with useFormContext. noValidate turns off the
            browser's own popups. Every step submits the form (button or
            Enter key): steps 1-3 go to the next step, the last one submits. */}
        <CardContent>
          {submitted ? (
            <p role="status">
              The profile form was completed. This project does not persist
              profile data yet.
            </p>
          ) : (
            <FormProvider {...methods}>
              <form
                id="profile-form"
                onSubmit={
                  isLastStep ? methods.handleSubmit(onSubmit) : handleNext
                }
                noValidate
              >
                {/* Render only the current step. key makes React start fresh
                    when the step changes. */}
                {isLastStep ? (
                  <ReviewStep onEdit={handleEdit} />
                ) : (
                  <FieldsStep key={step.key} step={step} />
                )}
              </form>
            </FormProvider>
          )}
        </CardContent>

        {/* The buttons are outside the <form>, so form="profile-form" connects
            the submit button to it. */}
        <CardFooter className="justify-between">
          {submitted ? (
            <Button type="button" size="lg" onClick={startOver}>
              Start another profile
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
              >
                Back
              </Button>
              <Button type="submit" form="profile-form" size="lg">
                {nextLabel}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
