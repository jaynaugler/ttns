import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page's browser-tab title (the root layout's template, when there is
// one, adds "| Take The Next Step") and its search-result description.
export const metadata: Metadata = {
  title: "Your profile",
  description: "Tell us about yourself and pick your skills, so Take The Next Step can match you to careers in Nova Scotia.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
