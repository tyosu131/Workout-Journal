# Supabase Notes Exercises Schema Verification

## Overview

This document records the Supabase database backup verification for whether set-level optional `rpe`, `rir`, and `failure` fields can be added inside `notes.exercises`.

This is a docs-only verification note. It does not introduce code, UI, API, database, dependency, or package-lock changes.

The main question was whether the current database schema enforces a strict nested shape for `notes.exercises`. Based on the reviewed backup, the compatibility decision is:

**Compatible for an initial optional-field implementation.**

## Backup Source

Backup reviewed:

```text
db_cluster-03-06-2025@18-16-32.backup
```

Source characteristics:

- Supabase paused project backup.
- PostgreSQL cluster dump.
- Used only for schema and shape verification.
- Actual workout note content is intentionally not documented here.

## Schema Findings

The backup contains the following `public.notes` DDL:

```sql
CREATE TABLE public.notes (
    date text NOT NULL,
    note text,
    exercises text,
    userid uuid,
    tags text[]
);
```

Column findings:

| Column | Type | Nullability / default |
| --- | --- | --- |
| `date` | `text` | `NOT NULL`; no default observed. |
| `note` | `text` | Nullable; no default observed. |
| `exercises` | `text` | Nullable; no default observed. |
| `userid` | `uuid` | Nullable; no default observed. |
| `tags` | `text[]` | Nullable; no default observed. |

Constraint findings for `public.notes`:

- Primary key: `PRIMARY KEY (date)`.
- Unique constraint: `UNIQUE (date, userid)`.
- Foreign key: `userid` references `public.users(uuid)` with `ON DELETE CASCADE`.

Important schema point:

- `notes.exercises` is `text`, not `jsonb` or a normalized child table.
- The database column itself does not define a nested set schema.

## Trigger / Policy Findings

Backup review did not identify a `public.notes` trigger that validates or rewrites the nested `exercises` payload.

Backup review did not identify a `public.notes` RLS policy.

`public.users` has RLS policies, but those policies do not define or validate the nested `notes.exercises` payload shape.

No `public.notes` constraint was found that checks whether `exercises` contains only the current set keys.

## Existing Data Shape Findings

Observed data shape from the backup:

- `public.notes` rows reviewed: `17`.
- `exercises` values reviewed: all `17` were parseable as JSON array strings.
- Exercise objects counted: `109`.
- Set objects counted: `478`.
- Existing set keys observed: `weight`, `reps`, and `rest`.
- Existing set data did not include `rpe`, `rir`, or `failure`.

Compatibility implication:

- Existing set objects are the old shape.
- Missing `rpe`, `rir`, and `failure` should normalize to `null`.
- Existing workout content does not need to be rewritten for optional-field support.

## Compatibility Decision

Decision:

```text
compatible
```

Reasons:

- `notes.exercises` is stored as `text`, so the database does not enforce nested object keys.
- Existing values are JSON array strings, which matches the current frontend save flow.
- Optional nested fields can be added to the JSON string payload without changing the column type.
- No `public.notes` trigger or constraint was found that would reject additional nested keys.
- Backend `saveNote` currently stores `exercises` as received from the request body.
- `normalizeWorkoutSets` already handles missing `rpe`, `rir`, and `failure` as `null`.
- Initial RPE/RIR/failure implementation likely does not require a database migration.

This decision is limited to initial optional nested fields in the current `notes.exercises` JSON string payload. It does not mean the schema is ideal for long-term analytics.

## RPE/RIR Implementation Impact

The verification supports the following next steps:

- Proceed to a pure validation helper for `rpe`, `rir`, and `failure`.
- Extend frontend set types with optional fields.
- Add optional advanced set input UI after validation behavior is defined.
- Keep old notes valid without backfilling missing fields.
- Add backend defensive validation in a later phase.
- Defer DB migration for the initial implementation.

Recommended validation targets:

- `rpe`: `null` or finite number from `1` to `10`.
- `rir`: `null` or finite number from `0` to `10`.
- `failure`: `null` or boolean.
- Empty string should become `null`.
- `NaN`, `Infinity`, and invalid strings should not be persisted as-is.

## Risks / Remaining Notes

- Because `exercises` is `text`, the database does not protect nested payload quality.
- Application-side validation becomes important.
- Backend nested set validation is not implemented yet.
- Old records are sparse and do not include `rpe`, `rir`, or `failure`.
- Analytics should treat missing intensity values as unknown, not zero.
- Future schema changes may still be useful if analytics needs queryable set-level rows.
- A normalized `workout_sets` table remains a future option, not a requirement for the initial optional-field implementation.

## Recommended Next Step

Suggested next phases:

- **Phase V: RPE/RIR/failure pure validation helper and tests** - Add deterministic validation and normalization before UI changes.
- **Phase W: Frontend Set type extension** - Add optional fields without changing behavior.
- **Phase X: Optional advanced set input UI** - Add RPE/RIR/failure controls in a low-friction set detail area.
- **Phase Y: Backend defensive validation** - Validate nested set payloads while preserving old notes.
- **Phase Z: Analytics effort display** - Surface RPE/RIR/failure in summaries, tooltips, and future AI inputs.
