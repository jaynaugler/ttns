# Team 6 - Next Step Generation backend

`POST /api/steps` turns Career Matching results plus a user profile into an
ordered list of `NextStep` objects. Logic is pure and deterministic; the route
only parses, validates and delegates.

Team 6 owns this backend's dataset, recommendation algorithm, API, validation,
and tests. Team 6 does not require Team 4 to create recommendation data,
custom APIs, or extra features. See [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md)
for development phases, ownership boundaries, and unresolved decisions.

| File | Role |
|---|---|
| `src/app/api/steps/route.ts` | Thin `POST` route |
| `src/lib/next-steps/handler.ts` | Request pipeline (parse, validate, load, generate, validate output) |
| `src/lib/next-steps.ts` | Data loader + algorithm (normalize, gaps, candidates, dedupe, order) |
| `src/lib/next-steps-validation.ts` | Request, dataset and output validators |
| `src/lib/next-steps-types.ts` | Team 6 request/response/dataset types |
| `src/data/education-steps.json` | Knowledge base (12 records covering 16 career IDs at baseline `8cd20de`) |
| `src/lib/next-steps/next-steps.test.ts` | Tests (Node built-in runner) |

## Contract

Request: `{ "matches": CareerMatch[], "profile": UserProfile }` (shared types).
Responses: `200 {"steps": NextStep[]}`; `400` and `500` return an
`error` string and currently include an `image` string.
Empty data always yields `200 {"steps": []}`.

Each match requires a nonblank string `careerId` and a finite numeric `score`;
`rationale` is optional. Higher scores win when earlier ordering rules tie.
The validator accepts at most 500 matches and ignores unknown input fields.
The profile requires a nonblank `id`, a `skills` array, and an `interests`
array; an empty array is allowed by the contract. Missing optional fields can
be omitted. The API returns the shared `NextStep` fields only.

## Career matching boundary

Recommendation `careerIds` must exactly match `CareerMatch.careerId` strings;
preserve leading zeroes, e.g. `"00010"`. The 516 codes in
`public/data/skillToOccupation.json` match the 516 IDs in
`src/data/careers.json` at main commit `db5b81b`. A different representation,
such as `"NOC_00010"` from `job_outlook.json`, does not match `"00010"`.

Main's `POST /api/match` returns `results` with `code`,
`matchPercentage`, and a string `rationale`. The existing
`src/lib/match-adapter.ts` export `toStepsMatches` converts those fields to
the shared `careerId`, `score`, and `rationale: string[]`. It keeps at most
500 results. Team 6 tests use simulated match snapshots and the real bundled
recommendation data; they do not call the matching API.

## Profile conversion and integration boundary

The shared `UserProfile` in `src/types/user.ts` is the API contract, not the
current browser storage format. `JourneyState.profile` stores grouped form
strings (`personal`, `skills`, `interests`, and `education`), while
`savedSkills` is a separate array of selected labels. Sending the stored form
directly fails validation: it has no profile `id`, and its `skills` and
`interests` are objects rather than arrays. The free-text degree is not a
verified education level; years of experience has no shared profile field.

The existing `buildStepsRequest` export in `src/lib/profile-adapter.ts`
combines saved matches, skills, and grouped form values. Its identity
`ttns-journey-user` and its label-as-ID mappings are **provisional**, not
approved production identifiers. It leaves free-text education and experience
unmapped and returns `null` when there are no matches. The application
integration layer must agree on identity and mapping rules, construct an
appropriate shared profile, and send it with matches. The API does not read
browser storage, and the current next-step page does not call it.

The following consumer-side example uses the existing adapter for match
conversion while requiring the caller to supply an already approved profile.
It does not treat the adapter's provisional profile as production-ready:

```ts
import { buildStepsRequest, type StepsRequestInput } from "@/lib/profile-adapter";
import type { NextStepsRequest, NextStepsResponse } from "@/lib/next-steps-types";
import type { UserProfile } from "@/types/user";

export async function requestSteps(
  input: StepsRequestInput,
  approvedProfile: UserProfile,
): Promise<NextStepsResponse["steps"]> {
  const draft = buildStepsRequest(input);
  if (!draft) return [];
  const body: NextStepsRequest = { matches: draft.matches, profile: approvedProfile };
  const response = await fetch("/api/steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Unable to load next steps.");
  return ((await response.json()) as NextStepsResponse).steps;
}
```

Empty required arrays are accepted but are not proof that the user has no
skills or interests. The integration layer must also decide which matches to
send and how to display `NextStep` fields. See the roadmap for open decisions.

## Dataset record (education-steps.json)

```jsonc
{
  "steps": [{
    "id": "unique-step-id",            // required, unique -> NextStep.id
    "title": "...",                    // required
    "category": "education",           // education | credential | experience | application
    "careerIds": ["career-id"],        // required, non-empty, exact Team 4 ids
    "description": "...",              // optional
    "estimatedWeeks": 12,              // optional, >= 0
    "resourceUrl": "https://...",      // optional, http(s) only
    "priority": 1,                     // optional integer >= 0, lower = earlier
    "prerequisiteStepIds": ["other-id"], // optional, must exist, no cycles
    "dedupeKey": "same-action-key",    // optional: records sharing it collapse to one
    "closesGap": {                     // optional: omit for a generic step
      "missingSkills": [{ "skill": "sql", "minProficiency": 3 }],
      "educationLevelNotIn": ["bachelor", "master"]
    }
  }]
}
```

Unknown fields, duplicate ids, unknown prerequisites and cycles make the whole
file invalid (API returns 500) so bad data can never be half-loaded.

## Rules

- **Gaps**: empty `skills`, a missing `educationLevel`, or a skill without
  `proficiency` (when a minimum is required) means "unknown". For a non-empty
  skills list, the current algorithm assumes the selection is complete and
  treats an unlisted required skill as missing. `UserProfile` has no credential
  or experience fields, so those categories use generic or skill/education
  conditions, not credential or experience checks.
- **Order**: recommended prerequisites first; then steps closing a confirmed gap; then
  explicit `priority`; then best match score (higher first); then `id`.
- **Dedupe**: only by shared `dedupeKey` (or identical id). Titles are never
  compared. Equivalent records should have consistent prerequisites: the
  kept record's prerequisite list is used, not a union of duplicate lists.
- **Prerequisite cycles**: dataset validation rejects cycles in the original
  records. If deduplication creates a cycle among the recommended steps, the
  handler returns the existing generic 500 response instead of an invalid
  ordering. Prerequisites that are not recommended remain ordering hints only.
