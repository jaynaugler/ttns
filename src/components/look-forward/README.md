# Team 5 — Look Forward

Shows how a user's career matches would shift if they made one change, and
today's median wage for a career.

Status as of 2026-11-12, written for the halfway team switch.

## Files

| File | Role |
|---|---|
| `look-forward.tsx` | `LookForward` client component: scenario picker, today vs projected top 3, status announcement |
| `scenario-picker.tsx` | Radio group in a fieldset with a legend |
| `match-list.tsx` | Current and projected match lists, shift and rank change in words |
| `mock-matches.ts` | Mock Team 4 output (real NOC codes) until matching is on main |
| `wage-projection-card.tsx` | Wage outlook card (earlier Team 5 work); optional `headingLevel` |
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
  `POST /api/steps`, with the reason first in `rationale`. It keeps within
  Team 6's request validation, where one bad match fails the whole request:
  blank career IDs are dropped, the best 500 matches are kept, and rationale
  is capped at 500 lines of 500 characters. `STEPS_API_MAX_ITEMS` and
  `STEPS_API_MAX_TEXT` mirror Team 6's `MAX_ARRAY_ITEMS` and
  `MAX_STRING_LENGTH`; a test fails if they drift.
- The "compatibility with Team 6" tests run Team 5's output through Team 6's
  own `validateNextStepsRequest`.

## Open items with Team 6

Team 6's `BACKEND_ROADMAP.md` and PR #25 (Phase 1 compatibility) don't ask
anything specific of Team 5. Open points that touch Team 5:

- **Which matches to send.** The roadmap asks which career matches the
  application should provide. Team 5 can supply projected matches through
  `toCareerMatches()`; the class needs to decide whether the Next Step page
  uses those or the current ones.
- **Who sends the request.** No client calls `POST /api/steps` yet. Team 5's
  logic is pure and doesn't fetch; the caller also has to build a valid
  `UserProfile`, which the roadmap assigns to the integration layer.
- **The 500-match cap.** Team 6 accepts at most 500 matches and there are 516
  careers. `toCareerMatches()` already keeps the best 500.

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
- Focus: 3px brand-red outline on the option card (about 12:1 on cream),
  shown at full strength immediately (only border and background animate).
- Shifts and rank changes are text ("Up 19.6 points", "Moved down from #1");
  colour and arrow icons are extras, and the icons are `aria-hidden`.
- `role="status"` announces "Projection updated: <scenario>." on each change.
- Score bars are decorative (`aria-hidden`); the score is always in text.
- Motion only runs under `prefers-reduced-motion: no-preference`.
- Checked in the browser: text contrast is at least 5.59:1, option borders
  at least 4.47:1, and no horizontal scroll at 375px or 320px.
- Section heading id comes from `useId`, so two instances on one page don't
  collide.

## Left to do

- Mount on `/updated-pathways` (page owners' call) and wire real data.
- Import Team 4's `DEFAULT_ALPHA` / `ScoredCareerMatch` once merged.
- Agree on the education/experience rule.
- Let the user pick which skill to gain.
- Manual passes: NVDA, keyboard-only, 400% zoom, OS reduced motion on.

## Wage projection card: review fixes

The wage card and its logic came from the earlier `team5-projection`
commits, which are kept in history. A review with both components on one
page turned up six issues, each fixed in its own commit:

1. **Label.** The card shows the career's median wage from `careers.json`,
   today's figure rather than a projection, so "Projected median wage" now
   reads "Median wage".
2. **Heading structure.** The card's `<h2>Look Forward</h2>` duplicated the
   Look Forward section on the same page. It is now named for its content,
   and an optional `headingLevel="h3"` prop lets it nest inside another
   section:

   ```
   h1  Updated Pathways                     (JourneyStepPage)
     h2  What if you took one more step?    (LookForward; "Look Forward" eyebrow)
       h3  Today / <chosen change>
         h4  career titles
     h2  Wage outlook for <career>          (wage card)
   ```

3. **Rounding.** `createOutcomeShift` returned the raw difference
   (85 − 65.4 gave 19.599999999999994). `delta` now uses the same one-decimal
   rounding as Team 4's scores, with tests.
4. **Test route.** `src/app/team5-test/page.tsx` shipped as a live
   `/team5-test` page. It has been removed (it stays in git history). Demo
   the card in the kitchen sink or on `/updated-pathways` instead.
5. **Non-null assertion.** `projection.projectedWage!` is now an explicit
   check that falls back to the "not available" message. Missing final
   newlines were added.
6. **Grey text contrast.** `text-muted-foreground` (`#737373`) measured
   4.47:1 on the cream page background (`#faf8f5`), under the 4.5:1 minimum.
   The card now uses `text-neutral-700` (`#404040`), measured 9.78:1.
   `globals.css` is unchanged.
