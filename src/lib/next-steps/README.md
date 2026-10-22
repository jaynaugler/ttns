# Team 6 - Next Step Generation backend

`POST /api/steps` turns Career Matching results plus a user profile into an
ordered list of `NextStep` objects. Logic is pure and deterministic; the route
only parses, validates and delegates.

| File | Role |
|---|---|
| `src/app/api/steps/route.ts` | Thin `POST` route |
| `src/lib/next-steps/handler.ts` | Request pipeline (parse, validate, load, generate, validate output) |
| `src/lib/next-steps.ts` | Data loader + algorithm (normalize, gaps, candidates, dedupe, order) |
| `src/lib/next-steps-validation.ts` | Request, dataset and output validators |
| `src/lib/next-steps-types.ts` | Team 6 request/response/dataset types |
| `src/data/education-steps.json` | Knowledge base (intentionally empty: `{"steps": []}`) |
| `src/lib/next-steps/next-steps.test.ts` | Tests (Node built-in runner) |

## Contract

Request: `{ "matches": CareerMatch[], "profile": UserProfile }` (shared types).
Responses: `200 {"steps": NextStep[]}`, `400 {"error": string}`, `500 {"error": string}`.
Empty data always yields `200 {"steps": []}`.

## What Team 4 must provide

1. `CareerMatch.careerId` values that are **stable** and identical to the ids
   used in `careerIds` of `education-steps.json` (compared exactly, never altered).
2. `CareerMatch.score` where **higher means a better match** (only used to
   break ties between otherwise equal steps; any finite number is accepted).
3. Agreement on how new careers get ids, so data authors can reference them.

Not required: structured career requirements. Gaps are declared in
`education-steps.json` (`closesGap`), so `Career` needs no new fields. If Team 4
later adds structured requirements to `careers.json`, extend `closesGap`.

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

- **Gaps** are only reported from data the user supplied. Empty `skills`, a
  missing `educationLevel`, or a skill without `proficiency` (when a minimum is
  required) means "unknown", never "lacks it". `UserProfile` has no credential
  or experience fields, so those categories are recommended via generic steps
  or skill/education conditions, not profile checks.
- **Order**: prerequisites first; then steps closing a confirmed gap; then
  explicit `priority`; then best match score (higher first); then `id`.
- **Dedupe**: only by shared `dedupeKey` (or identical id). Titles are never compared.
