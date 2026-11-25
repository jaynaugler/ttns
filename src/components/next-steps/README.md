# Team 6 — Next Step Recommendation Frontend

Frontend work by Arshdeep Singh for TTNS.

## What's included

- `NextStepCard.tsx`: one recommendation card showing title, description, category, estimated duration, and a suggested resource link. Fields the API omits are simply not rendered.
- `NextStepsList.tsx`: responsive cards plus loading, error, and no-recommendations states.
- `mock-steps.ts`: sample data for testing. **Not actual career advice or live API data.**

This folder does **not** make API calls or change the backend. Xiaoyi will connect real recommendations later.

## How to integrate later

```tsx
import NextStepsList from "@/components/next-steps/NextStepsList";
import type { NextStep } from "@/types/outcomes";

const steps: NextStep[] = [
  {
    id: "step-1",
    title: "Learn TypeScript",
    description: "Improve your TypeScript skills.",
    category: "education",
    estimatedWeeks: 6,
    resourceUrl: "https://www.typescriptlang.org/docs/handbook/intro.html",
  },
];

<NextStepsList steps={steps} />;
```

The components take the shared `NextStep` type from `src/types/outcomes.ts` —
the exact contract `POST /api/steps` returns (200: `{ steps: NextStep[] }`), so
the API response can be passed straight to `NextStepsList` with no mapping.
`description`, `category`, `estimatedWeeks`, and `resourceUrl` are all optional;
each renders only when present.

Optional states:

```tsx
<NextStepsList steps={[]} />                       // empty
<NextStepsList steps={[]} isLoading />              // loading
<NextStepsList steps={[]} error="Please try again." /> // error
```

## Handoff checklist

- [ ] Test at mobile and desktop browser widths
- [ ] View the cards and the empty state
- [ ] Run `pnpm run build`
- [ ] Capture screenshots and share with Xiaoyi
- [ ] Commit only `src/components/next-steps/`
- [ ] Push your own branch and open a PR against `main`
