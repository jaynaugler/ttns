# Team 5 — Look Forward

Shows how a user's career matches would shift if they made one change, and
the projected wage for a career.

Status as of 2026-11-12, written for the halfway team switch.

## Files

| File | Role |
|---|---|
| `look-forward.tsx` | `LookForward` client component: scenario picker, today vs projected top 3, status announcement |
| `scenario-picker.tsx` | Radio group in a fieldset with a legend |
| `match-list.tsx` | Current and projected match lists, shift and rank change in words |
| `mock-matches.ts` | Mock Team 4 output (real NOC codes) until matching is on main |
| `wage-projection-card.tsx` | Wage projection card (earlier Team 5 work) |
| `src/lib/projection-logic.ts` | Pure logic, no fetch or React |
| `src/lib/projection-logic.test.ts` | Tests: `pnpm run test:projection` (also part of `pnpm test`) |
| `src/types/outcomes.ts` | Team 5 added `Scenario`, `ScenarioKind`, `ProjectedOutcome`, `OutcomeShift` |

## Mounting

Journey step 4, `src/app/updated-pathways/page.tsx`, replaces the
placeholder `<p>` inside `JourneyStepPage`:

```tsx
import { LookForward } from "@/components/look-forward/look-forward";
import { MOCK_MATCHES, MOCK_USER_SKILLS } from "@/components/look-forward/mock-matches";

<LookForward matches={MOCK_MATCHES} userSkills={MOCK_USER_SKILLS} />
```

`LookForward` is a client component, so the page can stay a server
component. Swap the mocks for Team 4's `matchCareers(savedSkills)` result
and `journey.savedSkills` once matching is merged.

## Contract

- Input: `CareerMatch[]`, optionally with Team 4's `matchedSkills` and
  `missingSkills`. Without those lists the skill scenario reports that it
  can't project, with no score change; education and experience still work.
- `projectOutcomes` returns `ProjectedOutcome[]`, best projected score
  first. `score` is the projected score, `currentScore` the original.
- Team 6: `toCareerMatches(projected)` gives plain `CareerMatch` objects for
  `POST /api/steps`, with the reason first in `rationale`.

## Scoring

- **Gain a skill:** Team 4's formula (`0.7 × career coverage + 0.3 × user
  coverage`). A skill the career uses raises the score; one it doesn't use
  lowers it slightly, because less of the user's skill set fits.
- **Finish an education step / add experience:** placeholder rule, closing
  25% (education) or 10% per year, up to 5 years (experience), of the gap to
  100. Not research figures; the class needs to agree a rule.

## Accessibility (for Edward's review)

- Native radios in `FieldSet` + `FieldLegend`: arrow keys move between
  options, and the whole card is the label (well over 44×44).
- Focus: 3px brand-red outline on the option card (about 12:1 on cream).
- Shifts and rank changes are text ("Up 19.6 points", "Moved down from #1");
  colour and arrow icons are extras, and the icons are `aria-hidden`.
- `role="status"` announces "Projection updated: <scenario>." on each change.
- Score bars are decorative (`aria-hidden`); the score is always in text.
- Motion only runs under `prefers-reduced-motion: no-preference`.
- Checked in the browser: text contrast is at least 5.59:1, option borders
  at least 4.47:1, and no horizontal scroll at 320px.

## Left to do

- Mount on `/updated-pathways` (page owners' call) and wire real data.
- Import Team 4's `DEFAULT_ALPHA` / `ScoredCareerMatch` once merged.
- Agree on the education/experience rule.
- Let the user pick which skill to gain.
- Decide whether `wage-projection-card.tsx` sits beside the comparison.
  `src/app/team5-test/page.tsx` is the earlier test page for it.
- Manual passes: NVDA, keyboard-only, 400% zoom, OS reduced motion on.
