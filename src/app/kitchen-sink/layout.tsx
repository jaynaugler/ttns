import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// The page's browser-tab title (the root layout's template, when there is
// one, adds "| Take The Next Step") and its search-result description.
export const metadata: Metadata = {
  title: "Kitchen sink",
  description: "The component library used to build the Take The Next Step app.",
};

export default function Layout({ children }: { children: ReactNode }) {
  // A developer tool: production builds answer 404 here.
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
