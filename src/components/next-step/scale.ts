// Team 5's type and spacing scale, shared by The Next Step and Look Forward
// so both pages read as one design. Colours are globals.css tokens only.

// One heading scale: h2 per section, h3 per card or career, h4 inside cards.
// The banner's career title is the one display size, set where it's used.
export const H2 = "text-2xl font-bold break-words";
export const H3 = "text-xl font-bold leading-snug break-words";
export const H4 = "text-lg font-bold break-words";
export const EYEBROW = "text-sm font-bold tracking-wide uppercase";

// Cards and tiles: the same border, radius and padding everywhere, with a
// 1rem gap inside cards and 2rem between them (PAGE_STACK).
export const CARD =
  "min-w-0 space-y-4 rounded-xl border-2 border-foreground/50 bg-background p-5 text-foreground sm:p-6 dark:bg-[var(--dm-card-grey)]";
export const TILE = "flex min-w-0 flex-col gap-1 rounded-lg border-2 border-foreground/30 p-4";
export const PAGE_STACK = "space-y-8";

// Body text keeps to about 70 characters a line, a comfortable measure.
export const MEASURE = "[&_p]:max-w-[70ch] [&_li]:max-w-[70ch]";
