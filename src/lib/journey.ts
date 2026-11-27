// The journey structure shared by the stepper sidebar, the mobile drawer, and
// the step pages. Five pages map onto the four wizard steps, so the sidebar
// shows four labels: a step is "done" once every page in it is complete.
// (/new-skill was removed — its redesign will offer add-skills on
// /updated-pathways instead — but journey state still stores its picks.)
export type JourneyStepId =
  | "profile"
  | "skills"
  | "current-pathways"
  | "updated-pathways"
  | "next-step";

export interface JourneyStep {
  id: JourneyStepId;
  label: string; // the wizard step it belongs to (sidebar label)
  href: string; // the page's route (the entry page for its step)
  stepIndex: number; // 0..JOURNEY_STEP_COUNT - 1
  // Decorative emoji shown after the label (hidden from screen readers, so
  // "The Next Step 👣" isn't read as "The Next Step footprints").
  icon?: string;
}

export const JOURNEY_STEP_COUNT = 4;

// The skills selection lives on /profile now: both step-0 entries land there
// and are unlocked from the start. The sidebar labels a step with pages[0]'s
// label, so the "skills" entry's label is only read by the locked-page gate
// notice ("Continue with Personal Info") — keep it pointing at the page the
// link actually opens.
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  { id: "profile", label: "Personal Info", href: "/profile", stepIndex: 0 },
  { id: "skills", label: "Personal Info", href: "/profile", stepIndex: 0 },
  { id: "current-pathways", label: "Current Pathways", href: "/current-pathways", stepIndex: 1 },
  { id: "updated-pathways", label: "Updated Pathways", href: "/updated-pathways", stepIndex: 2 },
  { id: "next-step", label: "The Next Step", icon: "👣", href: "/next-step", stepIndex: 3 },
];

export type JourneyStepStatus = "done" | "current" | "locked";

// A page unlocks once every page belonging to an earlier wizard step is
// complete. Pages share a stepIndex, so completion is tracked per page.
export function isPageUnlocked(
  id: JourneyStepId,
  completed: readonly JourneyStepId[]
): boolean {
  const page = JOURNEY_STEPS.find((step) => step.id === id);
  if (!page) return false;
  return JOURNEY_STEPS.every(
    (step) => step.stepIndex >= page.stepIndex || completed.includes(step.id)
  );
}

// One status per wizard step (index 0..4): steps with all pages complete are
// "done", the first incomplete one is "current", everything after is "locked".
export function getStepStatuses(
  completed: readonly JourneyStepId[]
): JourneyStepStatus[] {
  const statuses: JourneyStepStatus[] = [];
  let currentAssigned = false;
  for (let stepIndex = 0; stepIndex < JOURNEY_STEP_COUNT; stepIndex++) {
    const pages = JOURNEY_STEPS.filter((step) => step.stepIndex === stepIndex);
    if (pages.every((page) => completed.includes(page.id))) {
      statuses.push("done");
    } else if (!currentAssigned) {
      statuses.push("current");
      currentAssigned = true;
    } else {
      statuses.push("locked");
    }
  }
  return statuses;
}