import type { NextStep } from "@/types/outcomes";

// Sample information for frontend testing only. These are not real API results.
export const mockSteps: NextStep[] = [
  {
    id: "step-1",
    title: "Learn TypeScript",
    description:
      "Improve your TypeScript skills to prepare for more web development opportunities.",
    category: "education",
    estimatedWeeks: 6,
    resourceUrl: "https://www.typescriptlang.org/docs/handbook/intro.html",
  },
  {
    id: "step-2",
    title: "Build a Portfolio",
    description:
      "Show employers what you can create by putting your strongest projects in one place.",
    category: "experience",
    estimatedWeeks: 3,
  },
  {
    id: "step-3",
    title: "Practise Professional Communication",
    category: "experience",
    estimatedWeeks: 1,
    resourceUrl: "https://example.com/communication-workshops",
  },
];
