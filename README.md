# TTNS App (Next.js)

## Prerequisites

- Node.js 20+
- pnpm 12+

## Install Dependencies

From this folder (`ttns/`):

```bash
pnpm install
```

## Build And Run

Production build and run:

```bash
pnpm run build
node .\\node_modules\\next\\dist\\bin\\next start
```

Local development (recommended simple start/stop on Windows):

```bash
node start
```

Stop the app with `Ctrl + C`.

## Team Starting Points

Use the top-of-file ownership comments as the source of truth.

- Team 1 and Team 2 (profile + skills data/types)
	- `src/types/user.ts`
	- `src/components/profile/`
	- `src/components/skills/`

- Team 4 (career matching)
	- `src/lib/matching-algo.ts`
	- `src/app/api/match/route.ts`
	- `src/types/outcomes.ts`

- Team 5 (projection/outcome shifts)
	- `src/lib/projection-logic.ts`
	- `src/types/outcomes.ts`
	- `src/components/look-forward/`

- Team 6 (next step generation)
	- `src/app/api/steps/route.ts`
	- `src/components/next-steps/`
	- `src/data/education-steps.json`

## Entry UI Shell

- App entry page: `src/app/page.tsx`
- Shared app styles: `src/app/globals.css`
