# TTNS App (Next.js)

## Prerequisites

- Node.js 20+
- pnpm 12+

## Install Dependencies

From the repository root:

```bash
pnpm install
```

## Run Paths

Development path (hot reload):

```bash
node dev
# equivalent:
node scripts/dev.cjs
```

Production path (built app):

```bash
pnpm run build
node start
# equivalent:
node scripts/start.cjs
```

Stop either mode with `Ctrl + C`.

## Testing

Run the standard test command:

```bash
pnpm run test
```

Current scope:

- Runs Team 6 next-step backend tests, then Team 5 projection tests.
- Compiles test-target TypeScript to a temporary folder, then runs Node's built-in test runner.

Optional cleanup of temporary compiled test output:

```bash
pnpm run test:next-steps:clean
```

## Team Starting Points

Use the top-of-file ownership comments as a starting point.

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

## Team 5 — Look Forward

Look Forward answers "what if I took one more step?". The user picks one
change (gain a skill, finish an education step, or add a year of
experience) and sees today's top 3 career matches beside the projected
top 3. Each projected match shows its score shift and rank change in plain
words, with a one-line reason.

Hand-off notes, status and open items: `src/components/look-forward/README.md`.

### How it connects

- **Team 4 (input):** takes `CareerMatch[]` from `src/types/outcomes.ts`.
  When a match also carries `matchedSkills` and `missingSkills` (as Team 4's
  `matchCareers()` on `feature/matching-logic` returns), the skill scenario
  is re-scored with Team 4's own formula. Without those lists, it reports
  that it can't project, with no score change.
- **Team 6 (output):** `toCareerMatches(projected)` returns plain
  `CareerMatch` objects ready to send as `matches` to `POST /api/steps`,
  with the projection's reason first in `rationale`. It stays within Team 6's
  request validation (non-blank career IDs, at most 500 matches, rationale
  lines of at most 500 characters), and Team 5's tests run its output
  through Team 6's own `validateNextStepsRequest`. Team 6 still needs a
  `profile` in the same request; building that is the application
  integration layer's job (see Team 6's `BACKEND_ROADMAP.md`).
- **Shared types:** Team 5 added `Scenario`, `ScenarioKind` and
  `ProjectedOutcome` to `src/types/outcomes.ts`; existing types are unchanged.

### Run and test

- Logic: `src/lib/projection-logic.ts` (pure functions, no fetch or React).
- UI: `LookForward` in `src/components/look-forward/look-forward.tsx`, meant
  for `src/app/updated-pathways/page.tsx`:

  ```tsx
  <LookForward matches={MOCK_MATCHES} userSkills={MOCK_USER_SKILLS} />
  ```

  `mock-matches.ts` holds six real NOC matches scored with Team 4's formula,
  for use until live matches are available.
- Tests: `pnpm run test:projection` (also included in `pnpm run test`).

### Accessibility checks it passes

Checked in Chrome with the mock data:

- Scenario picker is a `fieldset` with a `legend`; native radios give
  arrow-key movement. Each option card is the label, well over 44×44 px.
- Text contrast is at least 5.59:1; option borders at least 4.47:1 and the
  brand-red focus outline about 12:1 against the cream background.
- Score shifts and rank changes are written out ("Up 19.6 points",
  "Moved down from #1"); colour and arrow icons only reinforce them.
- A `role="status"` region announces "Projection updated: <change>." on
  every change, without moving focus.
- All motion sits behind `prefers-reduced-motion: no-preference`.
- No horizontal scrolling at 320 px wide.

Still to run by hand: NVDA, keyboard-only, 400% zoom, and OS reduced motion.

### Placeholder rules

Team 4's score is built from skills only, so two scenarios use stand-in
weights until it covers education and experience:

| Scenario | Rule today | Constant |
|---|---|---|
| Gain a skill | Team 4's formula, exactly | `MATCH_ALPHA = 0.7` (mirrors Team 4's `DEFAULT_ALPHA`) |
| Finish an education step | closes 25% of the gap to 100 | `EDUCATION_GAP_SHARE` (placeholder) |
| Add experience | closes 10% of the gap per year, up to 5 years | `EXPERIENCE_GAP_SHARE_PER_YEAR`, `MAX_EXPERIENCE_YEARS` (placeholder) |

The page labels these shifts as rough guides.

### Recommendations for other teams

- **Team 4:** exporting `DEFAULT_ALPHA` and `ScoredCareerMatch` from
  `src/lib/matching-algo.ts` when matching merges would let Team 5 import
  them rather than mirror them.
- **Team 4:** if scoring gains education or experience inputs, Team 5 can
  replace the placeholder rules above with the real calculation.
- **Team 6 and the integration layer:** Team 6's roadmap leaves open which
  matches the application should send. Projected matches from
  `toCareerMatches()` could feed `POST /api/steps`, so next steps reflect
  the change the user is considering; current matches would reflect where
  they stand today. Agreeing on one would let the Next Step page be wired.

## Entry UI Shell

- App entry page: `src/app/page.tsx`
- Shared app styles: `src/app/globals.css`
