import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page's browser-tab title (the root layout's template, when there is
// one, adds "| Take The Next Step") and its search-result description.
export const metadata: Metadata = {
  title: "Updated Pathways",
  description: "Try a change, like a new skill, finishing school or more experience, and see how your career matches move.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
