"use client";

import { usePathname } from "next/navigation";

import { JourneyStepList } from "./journey-step-list";

export function Sidebar() {
  const pathname = usePathname();
  // The landing page is pre-journey — there is nothing to track yet.
  if (pathname === "/") return null;

  return (
    <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r min-h-full md:block">
      <nav aria-label="Your Journey" className="p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-4">Your Journey</h2>
        <JourneyStepList />
      </nav>
    </aside>
  );
}