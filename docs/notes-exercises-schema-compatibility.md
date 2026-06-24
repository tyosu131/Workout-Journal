# Notes Exercises Schema Compatibility

## Overview

Before adding set-level `rpe`, `rir`, and `failure` input, the current `notes.exercises` persistence shape needs to be documented.

RPE/RIR/failure should be added without breaking existing logs. The safest path depends on how `notes.exercises` is actually stored in Supabase and whether the database has constraints or triggers that expect the current shape.

This is a docs-only compatibility review. It does not introduce code, UI, API, database, dependency, or package-lock changes.

The main priority is preserving existing notes.

## Current Persistence Flow

Current save flow:

1. The note input/edit UI stores workout data in `noteData`.
2. `noteData.exercises` is an array of exercises.
3. Each exercise contains an `exercise` name, optional `note`, and a `sets` array.
4. `saveNoteAPI` sends `exercises: JSON.stringify(noteData.exercises)`.
5. `POST /api/notes/:date` reaches `backend/routes/noteRoutes.js`.
6. `saveNote` in `backend/services/noteService.js` reads `note`, `exercises`, and `tags` from `req.body`.
7. `saveNote` upserts the daily row into the `notes` table with `date`, `note`, `exercises`, `tags`, and `userid`.
8. Reads use `GET /api/notes/:date` or `GET /api/notes/range`.
9. Frontend `parseNoteFields` parses `note.exercises` when it is a string.
10. Analytics utilities normalize parsed notes with `normalizeWorkoutSets`.

Current persistence is daily-note based. One `notes` row appears to represent one user and one date, with nested exercises and sets stored inside `notes.exercises`.

## Current Frontend Set Shape

The current frontend type is:

```ts
export interface Set {
  weight: string;
  reps: string;
  rest: string;
}

export interface Exercise {
  exercise: string;
  note?: string;
  sets: Set[];
}

export interface NoteData {
  date: string;
  note: string;
  exercises: Exercise[];
  tags?: string[];
}
```

Current note UI behavior:

- A new note starts with one empty exercise and one set.
- A new set starts as `{ weight: "", reps: "", rest: "" }`.
- Exercise name is stored in `exercise.exercise`.
- Exercise memo is stored in `exercise.note`.
- Set rows currently input `weight`, `reps`, and `rest`.
- RPE/RIR/failure are not included in the frontend `Set` type.
- RPE/RIR/failure cannot currently be entered in the note UI.
- Duplicating a set copies the current set object as-is.

Important compatibility implication:

- Adding optional fields to `Set` should not require changing old set objects.
- Old set objects without the fields should remain valid.

## Current Normalized Shape

`shared/utils/normalizeWorkoutSets.ts` already supports a broader input shape:

```ts
export type WorkoutSetInput = {
  weight?: string | number | null;
  reps?: string | number | null;
  rest?: string | number | null;
  rpe?: string | number | null;
  rir?: string | number | null;
  failure?: boolean | null;
};
```

The normalized output includes:

```ts
export type NormalizedWorkoutSet = {
  date: string | null;
  userId: string | null;
  exerciseName: string;
  exerciseNote: string | null;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  restSeconds: number | null;
  rpe: number | null;
  rir: number | null;
  failure: boolean | null;
  tags: string[];
};
```

Current normalization behavior:

- `note.exercises` may be an array or a JSON string.
- Invalid exercise JSON is ignored for that note.
- `weight`, `reps`, `rest`, `rpe`, and `rir` are converted with `Number(...)`.
- Empty string, `undefined`, `null`, and non-finite values become `null`.
- `failure` is preserved only when it is a boolean.
- Missing `rpe`, `rir`, or `failure` become `null`.

`NormalizedWorkoutSetWithMetrics` extends this normalized set with:

```ts
metrics: {
  volumeLoad: number | null;
  estimatedOneRepMax: number | null;
}
```

`trainingMetrics` currently uses only `weight` and `reps`.

`weeklyTrainingVolume` already computes `averageRpe` and `averageRir` when normalized values are present.

## Backend Persistence Behavior

Current backend note save behavior:

```js
const { note, exercises, tags } = req.body;

await supabase
  .from("notes")
  .upsert(
    [
      {
        date,
        note,
        exercises,
        tags,
        userid: user.id,
      },
    ],
    { onConflict: ["date", "userid"] }
  );
```

Findings:

- `saveNote` accepts `exercises` from the request body.
- The frontend currently sends `exercises` as a JSON string.
- The backend saves the received `exercises` value without parsing it.
- No nested set validation exists in `saveNote`.
- No backend code currently rejects unknown set fields.
- The backend itself is unlikely to reject `rpe`, `rir`, or `failure` if they are included in the serialized `exercises` payload.

Important caveat:

- Supabase may reject the write if the actual `notes.exercises` column type, constraints, triggers, or RLS-related logic do not accept the payload.
- The repository alone does not prove the database behavior.

## Database Schema Findings

Repository search results:

- No SQL migration files were found.
- No Supabase schema file was found.
- No `notes` table DDL was found.
- Only `backend/utils/supabaseClient.js` exists for Supabase connection setup.
- Existing docs mention Supabase, but do not define the `notes.exercises` column type.

Conclusion:

- Repository does not contain schema evidence for `notes.exercises`.
- The exact column type is unknown from local code/docs.

Items to confirm in the real database:

- `notes.exercises` column type.
- Whether it is `text`, `json`, `jsonb`, or another type.
- Whether constraints validate the nested shape.
- Whether triggers read or rewrite `exercises`.
- Whether RLS policies depend on column content.
- Whether old records store `exercises` as text, JSON, JSONB, array-like values, or mixed shapes.
- Whether `notes.tags` has similar storage assumptions.

## Compatibility Assessment

### Case A: `notes.exercises` Allows Arbitrary JSON/Text

If `notes.exercises` is `jsonb`, `json`, or `text` and has no strict shape constraints:

- Adding optional `rpe`, `rir`, and `failure` fields inside each set is likely backward-compatible.
- Old records remain valid because missing fields normalize to `null`.
- The existing frontend save path can preserve the new optional fields through `JSON.stringify`.
- The existing backend `saveNote` can persist the payload without route changes.
- `normalizeWorkoutSets` can already read the optional fields.
- A DB migration may not be needed for the first implementation.

This is the preferred low-risk path if the real schema supports it.

### Case B: `notes.exercises` Has Strict Constraints

If `notes.exercises` has constraints, triggers, generated columns, or strict schema expectations:

- Optional fields may be rejected or stripped.
- DB/API migration may be required before UI work.
- Backend validation should align with database constraints.
- Old client behavior and new client behavior need compatibility tests.
- The implementation should pause until schema details are documented.

## Proposed Nested Set Shape

Future persisted set shape:

```ts
type PersistedSet = {
  weight: string | number;
  reps: string | number;
  rest?: string | number | null;
  rpe?: string | number | null;
  rir?: string | number | null;
  failure?: boolean | null;
};
```

Future persisted exercise shape:

```ts
type PersistedExercise = {
  exercise: string;
  note?: string | null;
  sets: PersistedSet[];
};
```

Compatibility rules:

- Keep existing fields unchanged.
- Add `rpe`, `rir`, and `failure` only as optional fields.
- Do not rewrite old notes only to add missing fields.
- Treat missing effort fields as unknown.
- Preserve raw string values from form input until normalization or validation.

## Validation Strategy

Validation should be layered and defensive.

### Frontend

Frontend should normalize optional fields before save or at controlled form boundaries:

- Empty string becomes `null`.
- `rpe` must be `null` or a finite number from `1` to `10`.
- `rir` must be `null` or a finite number from `0` to `10`.
- `failure` must be `null` or boolean.
- `NaN`, `Infinity`, and invalid strings should not be persisted as-is.

Because note input autosaves while typing, lenient normalization is safer than blocking saves aggressively.

### Backend

Backend should eventually add defensive validation:

- Accept old sets missing `rpe`, `rir`, and `failure`.
- Accept optional valid values.
- Reject or sanitize invalid numeric values.
- Avoid assuming every historical set has the same shape.
- Preserve route names and response contracts unless a separate API change is planned.

### Analytics

Analytics should:

- Treat missing values as `null`.
- Ignore `null` effort values in averages.
- Avoid treating missing values as zero.
- Keep failure analytics separate from `rir === 0` until user behavior is validated.

## Migration Strategy

Initial strategy:

- Do not create a DB migration until the real schema is confirmed.
- Do not bulk rewrite existing `notes.exercises`.
- Do not introduce normalized `workout_sets` rows for the first RPE/RIR UI step.
- Prefer optional nested fields if the current column supports them.

If the current column is compatible:

- Add frontend/shared validation helpers first.
- Extend frontend types.
- Add UI in a small advanced set-detail area.
- Add backend validation after the UI shape is stable.

If the current column is not compatible:

- Design the smallest database/API migration required.
- Preserve existing records.
- Add tests for old and new payloads.
- Consider a long-term normalized set table only after the nested shape is proven insufficient.

## Implementation Recommendation

Suggested phases:

- **Phase U: Notes exercises schema compatibility docs** - Document current persistence flow, known schema gaps, and compatibility assumptions.
- **Phase V: Frontend/shared validation helper** - Add pure validation and normalization helpers for `rpe`, `rir`, and `failure`.
- **Phase W: Frontend Set type extension** - Extend types to include optional fields without changing UI behavior.
- **Phase X: Optional advanced set input UI** - Add set-level RPE/RIR/failure controls in a non-intrusive area.
- **Phase Y: Backend validation / persistence guard** - Add defensive nested set validation while preserving old notes.
- **Phase Z: Analytics use** - Add effort metrics to tables, tooltips, summaries, and later AI weekly summaries.

Recommended order:

1. Confirm the actual database shape.
2. Add pure validation helpers and tests.
3. Extend frontend types.
4. Add optional UI.
5. Add backend validation.
6. Expand analytics.

## Risks / Open Questions

- The real DB schema is not visible in this repository.
- If `notes.exercises` is stored as text, validation is mostly application responsibility.
- If `notes.exercises` is JSONB, constraints or triggers may still exist outside this repo.
- Old records may have inconsistent `exercises` shapes.
- Frontend and backend validation can drift if rules are duplicated.
- UI may capture RPE/RIR/failure but fail to persist them if schema assumptions are wrong.
- Sparse RPE/RIR data can make analytics misleading.
- Autosave makes strict validation more delicate.
- `failure`, `RIR 0`, and `RPE 10` should not be automatically treated as the same thing.

## Non-goals

- Do not change code in this phase.
- Do not change UI in this phase.
- Do not change backend APIs in this phase.
- Do not change the database in this phase.
- Do not create migrations in this phase.
- Do not implement RPE/RIR input in this phase.
- Do not implement AI summaries in this phase.
- Do not change package files or dependencies in this phase.

## Suggested Next Step

The next PR should confirm the real database behavior.

Recommended next step:

1. Inspect the actual Supabase `notes.exercises` column type and constraints.
2. Check whether old records are stored as JSON, JSONB, text, or mixed payloads.
3. Document those findings in this repository.
4. If compatible, add a pure validation helper for `rpe`, `rir`, and `failure`.
5. Only after that, extend frontend types and add optional set-level input UI.
