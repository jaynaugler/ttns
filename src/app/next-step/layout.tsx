import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page's browser-tab title (the root layout's template, when there is
// one, adds "| Take The Next Step") and its search-result description.
export const metadata: Metadata = {
  title: "The Next Step",
  description: "Your chosen career up close: what it pays, the Nova Scotia outlook, skills to build and a plan you can print.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
