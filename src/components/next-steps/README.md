# Team 6 — Next Step Recommendation Frontend

Frontend work by Arshdeep Singh for TTNS.

## What's included

- `NextStepCard.tsx`: one recommendation card showing title, description, priority, and suggested action.
- `NextStepsList.tsx`: responsive cards plus loading, error, and no-recommendations states.
- `mock-steps.ts`: sample data for testing. **Not actual career advice or live API data.**

This folder does **not** make API calls or change the backend. Xiaoyi will connect real recommendations later.

## How to integrate later

```tsx
import NextStepsList from "@/components/next-steps/NextStepsList";
import type { NextStepRecommendation } from "@/components/next-steps/NextStepCard";

const steps: NextStepRecommendation[] = [
  {
    id: "step-1",
    title: "Learn TypeScript",
    description: "Improve your TypeScript skills.",
    priority: "High",
    action: "Complete a TypeScript course",
  },
];

<NextStepsList steps={steps} />;
```

The frontend expects each step to have `id`, `title`, `description`, `priority` (`High`, `Medium`, or `Low`), and `action`. Xiaoyi can map the API response to this shape without modifying these components.

Optional states:

```tsx
<NextStepsList steps={[]} />                       // empty
<NextStepsList steps={[]} isLoading />              // loading
<NextStepsList steps={[]} error="Please try again." /> // error
```

## Test preview

The downloaded ZIP also includes **temporary** `src/app/team6-preview/page.tsx` for screenshot testing. Open `/team6-preview` while running the dev server. It shows the sample cards and offers a button to display the empty state.

**Remove** the temporary `src/app/team6-preview` folder before committing. It is not part of the final Team 6 contribution.

## Handoff checklist

- [ ] Test at mobile and desktop browser widths
- [ ] View the cards and the empty state
- [ ] Run `pnpm run build`
- [ ] Capture screenshots and share with Xiaoyi
- [ ] Commit only `src/components/next-steps/`
- [ ] Push your own branch and open a PR against `main`
