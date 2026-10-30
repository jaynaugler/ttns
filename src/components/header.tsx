"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { JourneyStepList } from "./journey-step-list";

// Stepper-driven navigation: the wizard's steps (not the top bar) are the
// real navigation, so the top bar stays brand + Home and the drawer mirrors
// the sidebar's journey list for mobile.
export function Header() {
  const [open, setOpen] = useState(false);
  // The landing page is pre-journey: like the sidebar, the drawer hides the
  // step list (and its "Reset journey") there.
  const isLanding = usePathname() === "/";

  return (
    <header className="border-b bg-primary px-4 md:px-8 py-4 text-primary-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="font-bold text-xl">
          <Link href="/" className="text-primary-foreground hover:no-underline">Take The Next Step</Link>
        </div>
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex gap-6 text-sm font-medium">
            <li><Link href="/" className="text-primary-foreground">Home</Link></li>
          </ul>
        </nav>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="top" className="md:hidden">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="px-4 pb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-4">
                Menu
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/"
                    className="block rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    Home
                  </Link>
                </li>
              </ul>
              {!isLanding && (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mt-6 mb-4">
                    Your Journey
                  </h3>
                  <JourneyStepList onStepClick={() => setOpen(false)} />
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
