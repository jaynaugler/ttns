"use client";

import { useEffect, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { JourneyStepList } from "./journey-step-list";
import { set } from "react-hook-form";

// Stepper-driven navigation: the wizard's steps (not the top bar) are the
// real navigation, so the top bar stays brand + Home and the drawer mirrors
// the sidebar's journey list for mobile.
export function Header() {
  const [open, setOpen] = useState(false);
  // The landing page is pre-journey: like the sidebar, the drawer hides the
  // step list (and its "Reset journey") there.
  const isLanding = usePathname() === "/";

  // Using React useState and useEffect for the accessibility toggles
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [enhancedFocus, setEnhancedFocus] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem("dyslexic-font") === "true";
    setDyslexicFont(enabled);

    if (enabled) {
      document.documentElement.dataset.font = "dyslexic";
    } else {
      delete document.documentElement.dataset.font;
    }
  }, []);

  useEffect(() => {
    const enabled = localStorage.getItem("dark-mode") === "true";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    const enabled = localStorage.getItem("enhanced-focus") === "true";
    setEnhancedFocus(enabled);
    document.documentElement.dataset.enhancedFocus = String(enabled);
  }, []);

  function toggleDyslexicFont() {
    const enabled = !dyslexicFont;
    setDyslexicFont(enabled);
    localStorage.setItem("dyslexic-font", String(enabled));

    if (enabled) {
      document.documentElement.dataset.font = "dyslexic";
    } else {
      delete document.documentElement.dataset.font;
    }
  }

  function toggleDarkMode() {
    const enabled = !darkMode;
    setDarkMode(enabled);
    localStorage.setItem("dark-mode", String(enabled));
    document.documentElement.classList.toggle("dark", enabled);
  }

  function toggleEnhancedFocus() {
    const enabled = !enhancedFocus;
    setEnhancedFocus(enabled);
    localStorage.setItem("enhanced-focus", String(enabled));
    document.documentElement.dataset.enhancedFocus = String(enabled);
  }

  return (
    <header className="border-b bg-primary px-4 md:px-8 py-4 text-primary-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="font-bold text-xl">
          <Link href="/" className="text-primary-foreground hover:no-underline">Take The Next Step</Link>
        </div>
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex gap-6 text-sm font-medium">
            <li><Link href="/" className="text-primary-foreground">Home</Link></li>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="text-primary-foreground">Accessibility Settings</button>
                }
              />
              <DropdownMenuContent
                align="end"
                className="w-[380px] max-w-[calc(100vw-2rem)]">
                {/* Dark mode toggle */}
                <DropdownMenuItem
                  role="menuitemcheckbox"
                  aria-checked={darkMode}
                  onClick={toggleDarkMode}
                  className="flex items-center justify-between gap-4 whitespace-nowrap"
                >
                  <span>Dark mode</span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      darkMode ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        darkMode ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </DropdownMenuItem>
                {/* Dyslexic font toggle */}
                <DropdownMenuItem
                  role="menuitemcheckbox"
                  aria-checked={dyslexicFont}
                  onClick={toggleDyslexicFont}
                  className="flex items-center justify-between gap-4 whitespace-nowrap"
                >
                  <span>Use "OpenDyslexic" font</span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      dyslexicFont ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        dyslexicFont ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </DropdownMenuItem>
                {/* Enhanced keyboard focus */}
                <DropdownMenuItem
                  role="menuitemcheckbox"
                  aria-checked={enhancedFocus}
                  onClick={toggleEnhancedFocus}
                  className="flex items-center justify-between gap-4 whitespace-nowrap"
                >
                  <span>Enhanced keyboard focus</span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      enhancedFocus ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        enhancedFocus ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <li>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted">
                      <span>Accessibility Settings</span>
                      <span aria-hidden="true" className="transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>

                    <div className="pl-2 pt-1">
                      {/* Dark mode toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={darkMode}
                        onClick={toggleDarkMode}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted"
                      >
                        <span>Dark mode</span>
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            darkMode ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              darkMode ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                      {/* Dyslexic font toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={dyslexicFont}
                        onClick={toggleDyslexicFont}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted"
                      >
                        <span>Use OpenDyslexic font</span>
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            dyslexicFont ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              dyslexicFont ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                      {/* Enhanced keyboard focus toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enhancedFocus}
                        onClick={toggleEnhancedFocus}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted"
                      >
                        <span>Enhanced keyboard focus</span>
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            enhancedFocus ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              enhancedFocus ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </details>
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
