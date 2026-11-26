# Team 5 — Look Forward

Shows how a user's career matches would shift if they made one change, and
a wage outlook for the career they pick.

Status as of 2026-11-26.

## Files

| File | Role |
|---|---|
| `look-forward.tsx` | `LookForward` client component: skill picker (Step 1), scenario picker (Step 2), summary strip and new-paths list (Step 3), wage card, status announcement |
| `skill-picker-dialog.tsx` | Step 1 chips and the "Change skills" dialog (Base UI); up to `MAX_SKILL_PICKS` picks, saved on Done |
| `summary-strip.tsx` | The four "at a glance" tiles: picks, #1 today, #1 after the change, median wage change |
| `scenario-picker.tsx` | Radio group in a fieldset with a legend, plus the years control for experience |
| `match-list.tsx` | `PathList`, the career rows of Step 3, with shift and rank in words |
| `mock-matches.ts` | Mock Team 4 output (real NOC codes) until matching is on main |
| `wage-projection-card.tsx` | Wage outlook card from `src/data/wages.json`; optional `headingLevel` |
| `../ui/dialog.tsx` | Base UI `Dialog` wrapper the skill picker uses |
| `src/lib/projection-logic.ts` | Pure logic, no fetch or React |
| `src/lib/projection-logic.test.ts` | Tests: `pnpm run test:projection` (also part of `pnpm test`) |
| `src/types/outcomes.ts` | Team 5 added `Scenario`, `ScenarioKind`, `ProjectedOutcome`, `OutcomeShift` |

## Mounting

Journey step 3, `src/app/updated-pathways/page.tsx`, mounts `LookForward`
inside `JourneyStepPage` with the journey's saved state:

```tsx
<LookForward
  matches={toProjectable(journey.savedMatches ?? [])}
  userSkills={journey.savedSkills ?? []}
  scenarios={buildScenarios(matches, userSkills, picks, journey.profile?.education?.degree)}
  skillPicker={{
    skills: rankSkillsToLearn(matches, userSkills, skillsData),
    picks,
    hiddenPicks: Math.max(0, savedPicks.length - MAX_SKILL_PICKS),
    onChange: saveNewSkills,
  }}
/>
```

`picks` is `journey.newSkills` sliced to `MAX_SKILL_PICKS` (3), and
`hiddenPicks` counts the ones sliced off so the dialog can warn before
saving drops them. Without a `skillPicker` prop the component hides Step 1
and renumbers the steps; `mock-matches.ts` still feeds the tests.

## Contract

- Input: `CareerMatch[]`, optionally with Team 4's `matchedSkills` and
  `missingSkills`. Without those lists the skill scenarios report that they
  can't project, with no score change; education and experience still work.
- `projectOutcomes` returns `ProjectedOutcome[]`, best projected score
  first. `score` is the projected score, `currentScore` the original.
- Ranks are tie-aware at the shown precision: careers whose scores equal to
  one decimal share a rank and are marked tied, and Step 3 keeps every
  career tied at the last rank (`projectedPaths`, `labelRanks`).
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

- **Gain a skill / the user's picks:** Team 4's formula, `S = α × C + (1 − α)
  × U`, where C is the share of the career's skills the user has (out of at
  least 5) and U the share of the user's skills the career uses. Instead of
  a fixed weight, each match's own α is solved from its saved score
  (`scoredAlpha`), so a projection starts from the same formula the score
  came from; it falls back to 0.3 (`MATCH_ALPHA`) when the score can't tell
  the weight apart. A skill the career uses raises the score; one it doesn't
  use leaves the match unchanged — learning a skill never lowers a match.
- **Ties:** careers whose scores show the same to one decimal share the
  group's best rank, marked "Tied #N", so none is presented as ahead.
- **Finish an education step / add experience:** placeholder rule, closing
  25% (education) or 10% per year, up to 5 years (experience), of the gap to
  100. "Do all three" applies the skills, then education, then experience.
  Not research figures; the class needs to agree a rule.

## Wage data

Wages no longer come from `careers.json`'s `medianWage`; every figure on the
card comes from Job Bank's `src/data/wages.json` by NOC code (`findWage`),
with hourly wages converted to yearly at 1,950 hours. The low–high path and
its "after N years" estimate are placeholders (low at the start, median
after 5 years, high after 15), not pay research. Wages Job Bank doesn't
publish show as such.

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

- Import Team 4's `DEFAULT_ALPHA` / `ScoredCareerMatch` once merged.
- Agree on the education/experience rule and a researched wage path.
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
