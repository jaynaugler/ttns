import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page's own browser-tab title; the root layout adds "| Take The Next Step".
export const metadata: Metadata = { title: "Current Pathways" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
