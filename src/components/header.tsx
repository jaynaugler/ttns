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
import { NAV_ITEMS } from "./nav-items";

// Mirrors the 5 steps in the desktop Sidebar, so mobile users keep the
// journey tracker. Not links — the step pages don't exist as routes yet.
const JOURNEY_STEPS = [
  "Personal Info",
  "Current Opportunities",
  "New Skill Interest",
  "Updated Opportunities",
  "The Next Step 👣",
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="font-bold text-xl">
          <Link href="/" className="hover:no-underline">Take The Next Step</Link>
        </div>
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex gap-6 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} active={pathname === item.href}>
                  {item.label}
                </NavLink>
              </li>
            ))}
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
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                        pathname === item.href
                          ? "bg-muted font-bold text-primary"
                          : ""
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mt-6 mb-4">
                Your Journey
              </h3>
              <ul className="space-y-4">
                {JOURNEY_STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-sidebar-border text-sidebar-foreground opacity-50"
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`text-sm ${index === 0 ? "font-bold" : "opacity-70"}`}>
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "font-bold text-primary" : "opacity-70 hover:opacity-100"}
    >
      {children}
    </Link>
  );
}