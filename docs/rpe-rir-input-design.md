# RPE / RIR Input Design

## Overview

This document defines the design direction for adding set-level `rpe`, `rir`, and `failure` fields to Workout Journal.

The goal is to support effort-aware training logs, fatigue review, hypertrophy analysis, strength analysis, and future AI summaries without breaking existing workout notes.

This is a design note only. It does not introduce code, UI, API, database, dependency, or package-lock changes.

Compatibility is the main constraint:

- Existing notes without `rpe`, `rir`, or `failure` must remain valid.
- New fields should be optional.
- Missing values should normalize to `null`.
- Analytics should treat missing effort data as unknown, not as zero effort.

## Current State

The current application already has partial analytics support for set-level intensity fields, but the input and persistence path is not complete.

Observed current state:

| Area | Current behavior |
| --- | --- |
| `NormalizedWorkoutSet` | Includes `rpe: number | null`, `rir: number | null`, and `failure: boolean | null`. |
| `normalizeWorkoutSets` | Parses optional `rpe`, `rir`, and `failure` from nested set objects when they exist. |
| `trainingMetrics` | Calculates volume load and estimated 1RM from `weight` and `reps`; it does not use RPE/RIR yet. |
| `weeklyTrainingVolume` | Already computes `averageRpe` and `averageRir` if normalized values are present. |
| Frontend `Set` type | Currently has `weight`, `reps`, and `rest` only. |
| Note input UI | Currently allows `weight`, `reps`, and `rest` input only. |
| Note save API | Serializes `noteData.exercises` with `JSON.stringify`. |
| Backend `saveNote` | Accepts `note`, `exercises`, and `tags`, then upserts them into `notes`; it does not validate nested sets. |
| Database schema | No SQL migration or schema file was found in the repository. |

Current gap:

- The analytics layer can tolerate `rpe`, `rir`, and `failure`.
- The note input UI does not collect these fields.
- Frontend types do not expose these fields.
- Backend validation does not guard these fields.
- The exact Supabase column type for `notes.exercises` is not documented in the repository.

## Why RPE/RIR Matter

Weight and reps describe what was lifted, but not how hard it was.

RPE/RIR/failure can improve interpretation in several ways:

- A set of `100 x 5 @ RPE 7` and `100 x 5 @ RPE 10` should not be interpreted the same way.
- Estimated 1RM is easier to interpret when effort context is available.
- Fatigue can be reviewed by tracking high-RPE or low-RIR sets.
- Hypertrophy volume can be separated into easy, moderate, and hard sets.
- Failure sets can be counted separately from non-failure volume.
- Deload or overload decisions can consider rising effort at flat or falling performance.
- AI weekly summaries can use deterministic effort metrics instead of guessing from raw logs.

## Field Definitions

### `rpe`

Recommended model:

```ts
rpe: number | null;
```

Meaning:

- Rating of perceived exertion.
- Recommended valid range: `1` to `10`.
- `10` means maximal effort or no meaningful reserve.
- `null` means unknown or not logged.

Decimal handling:

- The data model should allow decimals.
- The first UI can allow `0.5` increments, such as `7.5`, `8`, `8.5`, and `9`.
- Values outside `1` to `10`, `NaN`, and `Infinity` should be rejected or converted to `null` before saving.

### `rir`

Recommended model:

```ts
rir: number | null;
```

Meaning:

- Reps in reserve.
- Recommended valid range: `0` to `10`.
- `0` means no reps in reserve and may indicate failure or near-failure.
- `null` means unknown or not logged.

Decimal handling:

- The data model can allow decimals for flexibility.
- The first UI should prefer whole numbers to reduce ambiguity.
- If decimals are allowed later, `0.5` increments should be enough.
- Values outside `0` to `10`, `NaN`, and `Infinity` should be rejected or converted to `null` before saving.

### `failure`

Recommended model:

```ts
failure: boolean | null;
```

Meaning:

- `true`: the user explicitly reached failure.
- `false`: the user explicitly did not reach failure.
- `null`: unknown or not logged.

Important distinction:

- `false` and `null` are different.
- `false` means the user intentionally recorded "not failure".
- `null` means the app does not know.

## RPE vs RIR Relationship

RPE and RIR are related, but they should not be treated as perfectly equivalent.

Common rough interpretation:

| RPE | Rough RIR |
| --- | --- |
| `10` | `0` |
| `9` | `1` |
| `8` | `2` |
| `7` | `3` |

Why not auto-convert in the first implementation:

- Users may interpret RPE and RIR differently.
- Exercise type affects perceived effort.
- High-rep sets can make RPE/RIR less precise.
- Auto-filled values can look more certain than they really are.
- Failure and `RIR 0` are related, but not always identical in user intent.

Initial recommendation:

- Allow fields to exist independently.
- Do not auto-convert RPE to RIR or RIR to RPE.
- Do not auto-set `failure` from `rir === 0` in the first implementation.
- Consider helper text only, not automatic behavior.

## Input Options

### A. RPE Only

Pros:

- Familiar to many strength and hypertrophy users.
- Compact single-field input.
- Works well for high-level fatigue trends.

Cons:

- Some users think in RIR, not RPE.
- RPE can feel subjective or vague.
- Failure tracking still needs another signal.

### B. RIR Only

Pros:

- Easy to understand as "how many reps were left".
- Useful for hypertrophy training.
- Often easier for beginners than RPE.

Cons:

- Less standard in some strength logging contexts.
- Can be hard to estimate accurately.
- Does not explicitly distinguish failure unless `0` is interpreted carefully.

### C. RPE + RIR + Failure

Pros:

- Most complete effort model.
- Supports different user preferences.
- Enables better analytics later.
- Explicit failure tracking avoids relying only on RPE/RIR interpretation.

Cons:

- More fields can slow gym-time input.
- Users may enter inconsistent combinations.
- Requires careful UI to avoid clutter.

### D. Failure Only First

Pros:

- Very simple input.
- Low mobile UI cost.
- Useful for counting high-effort sets.

Cons:

- Too coarse for fatigue trend analysis.
- Does not capture moderate vs hard non-failure sets.
- Less useful for estimated 1RM context.

### E. Optional Advanced Fields

Pros:

- Keeps the main logging flow lightweight.
- Lets advanced users record RPE/RIR/failure.
- Preserves compatibility with users who only want weight/reps/rest.

Cons:

- Some users may not discover the fields.
- Extra UI state is needed.
- Analytics will have sparse data at first.

## Recommended Initial Approach

Use set-level optional `rpe`, `rir`, and `failure` fields.

Recommended behavior:

- Add them to each set as optional fields.
- Default all three fields to `null`.
- Do not make them required.
- Place the UI inside an advanced section or collapsible detail area.
- Keep the existing weight/reps/rest workflow as the primary path.
- Validate values defensively.
- Do not auto-convert between RPE and RIR.
- Do not auto-set `failure` from RPE/RIR initially.
- Treat old data without these fields as valid.
- Add analytics use only after the fields can be saved reliably.

Reasons:

- Preserves existing workout logs.
- Avoids increasing input friction for every user.
- Supports both hypertrophy and strength use cases.
- Gives analytics enough future signal for fatigue and effort trends.
- Makes `failure` easy to aggregate later.

## Data Model Proposal

### Frontend Set Shape

The frontend set type can evolve from:

```ts
type Set = {
  weight: string;
  reps: string;
  rest: string;
};
```

to:

```ts
type Set = {
  weight: string;
  reps: string;
  rest: string;
  rpe?: string | number | null;
  rir?: string | number | null;
  failure?: boolean | null;
};
```

Keeping `rpe` and `rir` string-compatible is practical while the UI uses form inputs. Normalization can continue converting values to numbers for analytics.

### Shared Intensity Shape

```ts
type SetIntensityInput = {
  rpe?: number | null;
  rir?: number | null;
  failure?: boolean | null;
};
```

### Validation Rules

Recommended validation:

- `rpe`: `null` or finite number between `1` and `10`.
- `rir`: `null` or finite number between `0` and `10`.
- `failure`: `null` or boolean.
- Empty string should become `null`.
- `NaN`, `Infinity`, and non-numeric strings should become `null` or fail validation before persistence.

Initial implementation can choose one of two behaviors:

- Lenient UI normalization: invalid optional values become `null`.
- Strict save validation: invalid optional values block save with a clear message.

For the current app, lenient normalization is likely safer because notes are autosaved during typing.

## DB/API Migration Considerations

Current persistence path:

1. Frontend edits `noteData.exercises`.
2. `saveNoteAPI` sends `exercises: JSON.stringify(noteData.exercises)`.
3. Backend `saveNote` receives `note`, `exercises`, and `tags`.
4. Backend upserts the daily `notes` record by `date` and `userid`.

Implications:

- If `notes.exercises` is stored as JSON, JSONB, or text, optional fields inside each set may be backward-compatible.
- If the Supabase schema has a narrower structure or trigger validation, a DB change may be required.
- The repository does not currently include SQL schema or migration files, so the actual Supabase column type should be confirmed before implementation.
- The backend currently does not validate nested `exercises`, so invalid RPE/RIR values could be persisted unless validation is added.

Compatibility strategy:

- Keep old notes valid when set objects do not include `rpe`, `rir`, or `failure`.
- Use `null` as the default unknown value.
- Avoid rewriting existing `exercises` JSON only for migration.
- Do not introduce normalized set-level tables in the first UI PR.
- Document the expected nested set shape before adding backend validation.

Possible migration paths:

### JSON-compatible path

If `notes.exercises` can store arbitrary JSON/string content:

- Add optional fields in frontend types and UI.
- Save them inside each set object.
- Add backend validation later.
- Let `normalizeWorkoutSets` continue reading old and new shapes.

### Normalized set table path

If long-term analytics need queryable set rows:

- Add a separate `workout_sets` table later.
- Keep `notes.exercises` as the legacy source during migration.
- Backfill only after the shape is stable.
- This is a larger future phase, not the first RPE/RIR input step.

## UI Proposal

Initial UI should avoid making the active logging table feel heavy.

Recommended placement:

- Put RPE/RIR/failure inside a per-set detail area.
- The main visible set row should continue to prioritize weight, reps, and rest.
- The advanced area can be opened from the existing per-set settings menu or a compact detail toggle.

Input controls:

- RPE: `Select`, stepper, or `NumberInput` with values `1` to `10`, preferably `0.5` increments.
- RIR: `Select` or `NumberInput` with values `0` to `10`, initially whole numbers.
- Failure: checkbox or switch.

Mobile considerations:

- Avoid adding three always-visible columns to the set table.
- Use large tap targets.
- Make optional effort fields easy to skip.
- Keep the add/duplicate/delete set workflow unchanged.
- Avoid long helper text inside the active gym logging flow.

Possible labels:

- `Effort`
- `Advanced set details`
- `RPE / RIR`
- `Failure set`

## Analytics Use Cases

Once the values are reliably saved, analytics can use them in phases.

Potential uses:

- Show RPE/RIR beside latest top sets.
- Count failure sets per week.
- Count high-intensity sets, such as `RPE >= 9` or `RIR <= 1`.
- Compare estimated 1RM with RPE context.
- Group weekly volume by RPE range.
- Track average RPE/RIR by exercise.
- Flag rising RPE with flat weight/reps.
- Flag repeated failure sets for fatigue review.
- Feed weekly AI summaries with deterministic effort metrics.

AI summary inputs should be computed metrics, not raw guessing:

- Average RPE/RIR by week.
- Number of failure sets.
- High-effort set count.
- Top sets with RPE/RIR when available.
- Volume changes alongside effort changes.

## Implementation Plan

Suggested small phases:

- **Phase T: RPE/RIR input design docs** - Document field semantics, compatibility, validation, and rollout plan.
- **Phase U: DB/API compatibility check** - Confirm the actual Supabase `notes.exercises` column type and document the expected nested set schema.
- **Phase V: Frontend set type and normalization guardrails** - Extend frontend set types and add pure validation/normalization helpers without changing UI behavior.
- **Phase W: Frontend optional input UI** - Add a small advanced set-level UI for RPE/RIR/failure.
- **Phase X: Backend validation / persistence** - Add defensive nested set validation while preserving old data.
- **Phase Y: Analytics display** - Add RPE/RIR/failure to relevant tables, tooltips, and summary calculations.
- **Phase Z: AI weekly summary** - Feed deterministic effort metrics into AI summaries.

Alternative lower-risk split:

1. Add a docs/schema note for the nested `exercises` JSON shape.
2. Add tests for RPE/RIR/failure normalization ranges.
3. Add frontend-only optional UI behind an advanced toggle.
4. Add backend validation after the UI shape is stable.

## Risks / Notes

- Extra fields can increase logging friction.
- RPE/RIR are subjective and can vary by user, exercise, and day.
- Automatic conversion between RPE and RIR can create false precision.
- `failure: true`, `rir: 0`, and `rpe: 10` are related but not identical.
- Old data must remain valid with `null` effort fields.
- Analytics should ignore `null` values instead of treating them as zero.
- Mobile set rows can become crowded if effort fields are always visible.
- Sparse RPE/RIR data may make early charts misleading.
- Backend validation must not reject old notes that lack these fields.

## Non-goals

- Do not implement RPE/RIR/failure input in this phase.
- Do not run a DB migration in this phase.
- Do not change backend APIs in this phase.
- Do not change frontend UI in this phase.
- Do not implement AI summaries in this phase.
- Do not auto-estimate RPE/RIR from weight and reps.
- Do not change the estimated 1RM formula in this phase.
- Do not introduce a normalized set-level database table in the first RPE/RIR UI step.

## Suggested Next Step

The next safest implementation step is a small DB/API compatibility check.

Recommended next PR:

1. Confirm the actual Supabase type and constraints for `notes.exercises`.
2. Document the expected nested set schema in the repository.
3. Decide whether optional `rpe`, `rir`, and `failure` can be saved inside the existing `exercises` JSON without migration.
4. Add or adjust pure validation tests before changing the note input UI.

After that, choose one of two paths:

- If the current JSON storage is compatible, add a frontend-only advanced input prototype.
- If the schema is not compatible, design the minimal DB/API migration before adding UI.
