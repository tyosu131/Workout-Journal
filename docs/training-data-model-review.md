# Training Data Model Review

## Overview

This document reviews the current Workout Journal data shape before adding RPE/RIR, set-level analytics, hypertrophy analysis, BIG3 analysis, graph views, AI summaries, and mobile workout input improvements.

This is an investigation note only. It does not define an immediate code, API, UI, or database change.

## Current Data Model Findings

The current workout log is centered on a daily `notes` record.

Observed fields from backend and frontend code:

| Area | Current shape |
| --- | --- |
| Daily note | `date`, `note`, `exercises`, `tags`, `userid` |
| Exercise | `exercise`, optional `note`, `sets` |
| Set | `weight`, `reps`, `rest` |
| Tags | `tags` on `notes`, plus `user_tags` table |

The frontend TypeScript model is:

```ts
interface Set {
  weight: string;
  reps: string;
  rest: string;
}

interface Exercise {
  exercise: string;
  note?: string;
  sets: Set[];
}

interface NoteData {
  date: string;
  note: string;
  exercises: Exercise[];
  tags?: string[];
}
```

Important findings:

- One `notes` record appears to represent one user and one date.
- `saveNote` upserts by `date` and `userid`, so the current uniqueness model is daily.
- `exercises` is sent from the frontend as `JSON.stringify(noteData.exercises)`.
- On read, the frontend parses `exercises` if it is a string.
- Sets already exist as nested objects under each exercise.
- The database does not appear to have normalized set-level rows.
- No SQL migration or schema file was found in the repository.
- The current shape can support basic exercise, weight, reps, rest, and date analysis, but deeper analytics will be easier if the nested structure is documented or normalized.

## Current API / Service Findings

Current note routes:

| Route | Purpose |
| --- | --- |
| `GET /api/notes/:date` | Fetch notes for one date. |
| `POST /api/notes/:date` | Upsert a daily note. |
| `GET /api/notes/range?start=...&end=...` | Fetch notes in a date range. |
| `GET /api/notes/all-tags` | Fetch user tags. |
| `GET /api/notes/by-tags?tags=...` | Fetch notes that overlap tags. |
| `POST /api/notes/tag` | Create a user tag. |
| `DELETE /api/notes/tag/:tagName` | Delete a user tag and remove it from notes through RPC. |

Service behavior:

- Every note route uses the Authorization header and `verifyToken`.
- `saveNote` accepts `note`, `exercises`, and `tags` from the request body.
- The backend does not validate the nested `exercises` structure before saving.
- `getNotesInRange` already provides a useful base for weekly/monthly analytics and graph data.
- `getNotesByTags` is currently tag-based, not exercise-name or muscle-group based.
- Current tests cover `getNotes`, `createTag`, and `getNotesByTags` with mocked Supabase and mocked auth.

API implication:

- Adding optional fields inside each set is likely possible without changing route names.
- Analytics endpoints should probably be added later instead of overloading the existing daily-note endpoints.
- If the DB remains JSON-based, analytics utilities must parse and normalize `exercises` in application code.

## Current Frontend Input Findings

The note page is the main workout input surface.

Current flow:

- The date route loads `NotePage`.
- A missing note creates a default note with one empty exercise and one empty set.
- Each exercise has a free-text exercise name and optional memo.
- Each set has `weight`, `reps`, and `rest`.
- Editing any exercise or set field immediately saves the note.
- Users can add, duplicate, and delete sets.
- Users can add, duplicate, and delete exercises.
- Tags can be added and displayed.
- A "Previous" action can fetch older notes by matching tags.

Mobile observations:

- The page has responsive behavior, but the main `NotePage` currently renders a custom table-like structure directly.
- There is an older or separate `table-body.tsx` component with mobile/tablet handling, but the active `NotePage` also contains its own table markup.
- Set copy and exercise duplicate already exist.
- Previous workout display exists, but it is based on tags rather than exact exercise matching.
- Exercise names are free text, so search, pinning, and metadata-driven suggestions are not yet available.

## Gaps for RPE/RIR

Natural location:

- `rpe`, `rir`, and `failure` belong at the set level because effort can differ per set.
- Exercise-level defaults or summaries could be added later, but set-level data is the most useful for analytics.

Likely future set shape:

```ts
interface Set {
  weight: string;
  reps: string;
  rest: string;
  rpe?: string;
  rir?: string;
  failure?: boolean;
}
```

Impact:

- Frontend type expansion is straightforward.
- Existing API route names could remain unchanged if optional fields are stored inside `exercises`.
- A DB migration may be needed if `exercises` is typed too narrowly in Supabase, or if normalized set-level tables are introduced.
- Existing data should remain valid because old sets without `rpe`, `rir`, or `failure` can be treated as unknown.

Compatibility notes:

- Keep RPE/RIR optional.
- Avoid requiring effort fields for save.
- Analytics utilities should handle missing values safely.
- If values remain strings in the UI, analytics should parse and validate them before calculation.

## Gaps for Hypertrophy Analytics

Missing or weak areas:

- No exercise metadata table or shared exercise catalog.
- No `primaryMuscles`.
- No `secondaryMuscles`.
- No `exerciseCategory`.
- No `movementPattern`.
- No normalized exercise identifier.
- Exercise names are free text, so spelling differences and aliases will fragment analytics.
- Tags exist, but tags are user-defined and not reliable enough for muscle-group analysis.

What can be calculated today:

- Per-exercise volume load if `weight` and `reps` are numeric.
- Per-exercise set count.
- Basic weekly volume by exercise name.

What cannot be calculated reliably today:

- Muscle group volume.
- Push/pull or movement-pattern balance.
- Direct vs indirect muscle volume.
- Exercise alias merging.

Recommended metadata direction:

- Add an exercise metadata concept before serious hypertrophy analytics.
- Use stable exercise IDs or canonical names.
- Support aliases for user-entered names.
- Map exercises to primary muscles, optional secondary muscles, category, and movement pattern.

## Gaps for BIG3 Analytics

Missing or weak areas:

- No canonical lift type for squat, bench press, or deadlift.
- Free-text exercise names make BIG3 detection fragile.
- No `isBig3` or `liftType`.
- No explicit top-set marker.
- No unit handling for weight.
- No RPE/RIR yet, so intensity interpretation is limited.

String matching can work only as a temporary bridge:

- `squat`, `bench`, and `deadlift` name matching can be used for early prototypes.
- It will fail for aliases, language differences, variations, and typos.

Recommended direction:

- Add metadata such as `liftType: "squat" | "bench" | "deadlift" | null`.
- Keep variation names separate from canonical lift type.
- Calculate estimated 1RM from numeric `weight` and `reps`.
- Use RPE/RIR later to improve interpretation, not as a hard requirement for initial e1RM.

## Gaps for Graphs

Graphable with current structure:

- Exercise weight trend by free-text exercise name.
- Reps trend by free-text exercise name.
- Set count by date or week.
- Volume load by exercise name if values parse as numbers.
- Calendar-level training frequency.

Graphable after small optional fields:

- RPE/RIR trend by exercise.
- Failure frequency.
- Rest time trend.

Requires metadata:

- Muscle group volume.
- Movement-pattern balance.
- BIG3 trend that is robust to exercise aliases.
- Program/block-level trends.

Requires either normalization or careful parsing:

- Fast date-range analytics across many records.
- Set-level PR tracking.
- Weekly summaries over nested `exercises` JSON.

## AI Summary Readiness

Current readiness is partial.

Useful current inputs:

- Date range notes.
- Exercise names.
- Weight, reps, rest from set arrays.
- Tags.
- Exercise memo and daily note text.

Metrics to calculate before AI:

- Weekly sessions.
- Weekly set count.
- Exercise-level volume load.
- Exercise-level best sets.
- Estimated 1RM where weight/reps are numeric.
- PR candidates.
- RPE/RIR averages after those fields exist.
- Stagnation or fatigue flags from deterministic logic.

Data that should not be sent unnecessarily:

- Access tokens, refresh tokens, Authorization headers, cookies, or env values.
- User email or account identifiers unless strictly needed.
- Raw private memo text if the user has not opted into AI summary behavior.

Storage recommendation:

- Store raw workout logs and user-entered notes.
- Calculate most analytics on demand or cache derived summaries later.
- Store AI summaries only after product decisions about user consent, editability, and deletion.

## Mobile UX Readiness

Already present:

- Mobile route uses the same note page.
- Set add, duplicate, and delete exist.
- Exercise duplicate and delete exist.
- Previous note lookup exists.
- Inputs are simple and direct.

Current limitations:

- The input table can become dense as more fields are added.
- RPE/RIR fields would increase horizontal and vertical complexity.
- Previous values are tag-based, not exercise-specific.
- There is no pinned exercise list.
- There is no exercise search or canonical exercise picker.
- Numeric input controls are plain text inputs.
- Auto-save on every field change may be noisy during fast mobile entry.

Low-risk mobile improvements later:

- Show last used values for the same canonical exercise.
- Add set copy shortcuts near each set.
- Add larger stepper-style controls for weight/reps.
- Add pinned/frequent exercises.
- Keep RPE/RIR collapsed or optional by default.
- Avoid placing AI summaries in the active logging flow.

## Recommended Data Model Direction

Recommended staged direction:

1. Document the current JSON shape clearly.
2. Add optional set-level fields only after confirming current Supabase column type.
3. Add analytics utilities that normalize the current `NoteData` shape into flat set rows in memory.
4. Introduce exercise metadata before muscle-group or BIG3 analytics.
5. Consider a future normalized schema only when analytics needs outgrow the JSON shape.

Suggested intermediate normalized view in application code:

```ts
interface NormalizedWorkoutSet {
  date: string;
  userId?: string;
  exerciseName: string;
  exerciseNote?: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  restSeconds: number | null;
  rpe?: number | null;
  rir?: number | null;
  failure?: boolean | null;
  tags?: string[];
}
```

This view can be derived from current notes without changing the database immediately.

Future metadata shape:

```ts
interface ExerciseMetadata {
  id: string;
  canonicalName: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  exerciseCategory?: string;
  movementPattern?: string;
  liftType?: "squat" | "bench" | "deadlift" | null;
}
```

## Suggested Implementation Phases

### 1. Data Model Docs

- Record current `notes.exercises` JSON shape.
- Decide expected set-level optional fields.
- Document old-data compatibility rules.

### 2. DB Migration Planning

- Confirm actual Supabase column types for `notes.exercises` and `notes.tags`.
- Decide whether to keep JSON storage for Phase B or introduce normalized tables later.
- Avoid destructive migration.

### 3. API Request/Response Extension

- Add optional `rpe`, `rir`, and `failure` fields to the accepted exercises payload.
- Keep existing route names and response formats initially.
- Add validation without rejecting old records.

### 4. Frontend Form Extension

- Add optional RPE/RIR/failure controls.
- Keep them compact and optional.
- Preserve existing add/duplicate/delete behavior.

### 5. Analytics Utilities

- Add pure functions to normalize notes to set rows.
- Add estimated 1RM, volume load, weekly volume, PR detection, and RPE/RIR trend utilities.
- Unit test these functions before adding graph UI.

### 6. Graph UI

- Start with exercise-level trends and volume load.
- Add BIG3 trends after metadata or canonical lift detection exists.
- Add muscle group volume after exercise metadata exists.

### 7. AI Summary

- Feed AI calculated metrics, not raw logs alone.
- Start with weekly summaries.
- Avoid sensitive auth or account data.
- Use cautious language and show source metrics.

### 8. Mobile UX Polish

- Add previous values by exercise.
- Add pinned exercises and quick search.
- Add larger controls and faster set copy.
- Keep advanced fields out of the default fast-entry path.

## Risks / Migration Notes

- Existing data may store `exercises` as a stringified JSON value; parsing must remain defensive.
- Changing from one daily note record to normalized set rows would affect save, fetch, range queries, tags, tests, and UI state.
- `saveNote` currently upserts the whole day. Set-level APIs would need conflict and partial-update rules.
- DB migration must preserve current daily notes and nested exercises.
- Free-text exercise names will produce fragmented analytics.
- Adding too many fields directly to the table UI could make mobile logging slower.
- AI summaries introduced before reliable metrics may produce vague or misleading output.
- Analytics should tolerate missing or invalid numeric values.

## First Implementation Candidate

The lowest-risk first implementation is to add a pure analytics normalization layer before changing the database.

Candidate:

- Add a shared utility that converts `NoteData[]` into normalized set rows.
- Parse `weight`, `reps`, and `rest` safely.
- Ignore or set `null` for invalid numeric values.
- Preserve date, exercise name, exercise memo, set index, and tags.
- Add unit tests for old records, empty exercises, invalid numbers, and multiple sets.

Why this should come first:

- It does not require DB migration.
- It does not change API behavior.
- It creates the foundation for graphs, RPE/RIR support, BIG3 metrics, and AI summaries.
- It clarifies whether the current JSON model is enough for the next phase.
