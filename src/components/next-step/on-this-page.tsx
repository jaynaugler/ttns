"use client";

import { useEffect, useRef } from "react";

// "On this page": jump links to each section of The Next Step, under the
// page title. Sticky on desktop, below the site's 4rem sticky header. While
// it's sticky, the page's scroll-padding-top is set from its real height, so
// jump targets and keyboard focus land clear of the header and this bar
// (WCAG 2.4.11, focus not obscured). On smaller screens it isn't sticky and
// only the header needs clearing.

export interface JumpLink {
  id: string;
  label: string;
}

const HEADER = 64; // the site header, h-16
const GAP = 16;

const PRINT_AND_FALLBACK = `
html:has(nav[data-on-this-page]) { scroll-padding-top: ${HEADER + GAP}px; }
@media print { nav[data-on-this-page] { display: none; } }
`;

export function OnThisPage({ links }: { links: readonly JumpLink[] }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const desktop = window.matchMedia("(min-width: 64rem)");
    const update = () => {
      root.style.scrollPaddingTop = desktop.matches
        ? `${Math.ceil(nav.getBoundingClientRect().height) + HEADER + GAP * 1.5}px`
        : "";
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    desktop.addEventListener("change", update);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", update);
      root.style.scrollPaddingTop = "";
    };
  }, []);

  if (links.length === 0) return null;
  return (
    <nav
      ref={navRef}
      aria-label="On this page"
      data-on-this-page=""
      className="z-30 rounded-xl border-2 border-foreground/30 bg-background px-3 py-1 lg:sticky lg:top-[4.5rem] dark:bg-[var(--dm-surface-grey)]"
    >
      <style>{PRINT_AND_FALLBACK}</style>
      <ul className="flex flex-wrap gap-x-4">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4 break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-red dark:text-[var(--dm-brand-yellow)] dark:focus-visible:outline-[var(--dm-brand-yellow)]"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
