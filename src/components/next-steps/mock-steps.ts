import type { NextStepRecommendation } from "./NextStepCard";

// Sample information for frontend testing only. These are not real API results.
export const mockSteps: NextStepRecommendation[] = [
  {
    id: "step-1",
    title: "Learn TypeScript",
    description:
      "Improve your TypeScript skills to prepare for more web development opportunities.",
    priority: "High",
    action: "Complete a beginner TypeScript course and practise with a small app.",
  },
  {
    id: "step-2",
    title: "Build a Portfolio",
    description:
      "Show employers what you can create by putting your strongest projects in one place.",
    priority: "Medium",
    action: "Build and publish a personal project with a short description of your work.",
  },
  {
    id: "step-3",
    title: "Practise Professional Communication",
    description:
      "Strengthen the communication skills that are useful in many different workplaces and careers.",
    priority: "Low",
    action: "Join a workshop or practise explaining a project to a classmate.",
  },
];
