// The journey structure shared by the stepper sidebar, the mobile drawer, and
// the step pages. Six pages map onto the five wizard steps, so the sidebar
// shows five labels: a step is "done" once every page in it is complete.
export type JourneyStepId =
  | "profile"
  | "skills"
  | "current-pathways"
  | "new-skill"
  | "updated-pathways"
  | "next-step";

export interface JourneyStep {
  id: JourneyStepId;
  label: string; // the wizard step it belongs to (sidebar label)
  href: string; // the page's route (the entry page for its step)
  stepIndex: number; // 0..JOURNEY_STEP_COUNT - 1
}

export const JOURNEY_STEP_COUNT = 5;

// /skills shares step 0 with /profile: both are part of "Personal Info" and
// are unlocked from the start.
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  { id: "profile", label: "Personal Info", href: "/profile", stepIndex: 0 },
  { id: "skills", label: "Personal Info", href: "/skills", stepIndex: 0 },
  { id: "current-pathways", label: "Current Pathways", href: "/current-pathways", stepIndex: 1 },
  { id: "new-skill", label: "New Skill Interest", href: "/new-skill", stepIndex: 2 },
  { id: "updated-pathways", label: "Updated Pathways", href: "/updated-pathways", stepIndex: 3 },
  { id: "next-step", label: "The Next Step 👣", href: "/next-step", stepIndex: 4 },
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