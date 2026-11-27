import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page's browser-tab title (the root layout's template, when there is
// one, adds "| Take The Next Step") and its search-result description.
export const metadata: Metadata = {
  title: "Current Pathways",
  description: "See the careers your skills match today, with typical wages and the Nova Scotia job outlook for each.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
