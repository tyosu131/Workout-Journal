# Exercise Metadata Design

## Overview

Exercise metadata is needed before adding robust BIG3 trends, muscle group volume, exercise search, pinned exercises, and AI summaries.

The current app stores exercise names as free-text values. That is flexible for logging, but unstable for analysis. For example, `Bench Press`, `bench press`, `ベンチプレス`, `Paused Bench Press`, and `Competition Bench` may all represent related bench work, but current grouping treats them as separate names.

The goal is not to remove free-text input. The goal is to add a canonical metadata layer that can connect user-entered names to stable exercise identities when possible, while preserving the original text.

## Current Problem

- `exerciseName` is currently free text.
- Spelling differences, casing, language differences, exercise variations, and typos can split one exercise into many groups.
- Current weekly volume and PR detection utilities group by `exerciseName` as-is.
- BIG3 analysis needs to know whether a set belongs to squat, bench, or deadlift.
- Hypertrophy analysis needs target muscle metadata, not only the exercise name.
- Search, pinned exercises, and AI summaries are more useful when exercises have stable canonical metadata.

## Proposed Metadata Shape

```ts
type LiftType = "squat" | "bench" | "deadlift" | null;

type ExerciseMetadata = {
  id: string;
  canonicalName: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  movementPattern?: string;
  exerciseCategory?: string;
  liftType?: LiftType;
};
```

## Field Definitions

### `id`

A stable identifier for the exercise metadata entry.

Examples:

- `bench_press`
- `squat`
- `deadlift`
- `romanian_deadlift`

This should be stable across display name changes.

### `canonicalName`

The standard display name used by analytics and search.

Examples:

- `Bench Press`
- `Squat`
- `Deadlift`

This is the name analytics should prefer after matching user input.

### `aliases`

Alternative names that should map to the same canonical exercise.

Examples for bench press:

- `bench press`
- `Bench`
- `ベンチプレス`
- `Competition Bench`

Aliases should help match common user input, but they should not erase the original logged text.

### `primaryMuscles`

The main target muscles for hypertrophy-oriented volume analysis.

Examples:

- Bench Press: `chest`, `triceps`, `front_delts`
- Squat: `quads`, `glutes`
- Deadlift: `hamstrings`, `glutes`, `back`

Initial analysis can use this as direct or primary volume without trying to model every indirect contribution.

### `secondaryMuscles`

Optional supporting muscles.

This should stay optional at first because indirect volume is harder to define consistently.

### `movementPattern`

A high-level movement category.

Examples:

- `squat`
- `hinge`
- `horizontal_push`
- `vertical_push`
- `horizontal_pull`
- `vertical_pull`

This helps with program balance and future graph filters.

### `exerciseCategory`

An optional equipment or exercise category.

Examples:

- `barbell`
- `dumbbell`
- `machine`
- `bodyweight`
- `isolation`
- `compound`

This is useful for search and filtering, but not required for the first analytics step.

### `liftType`

BIG3 classification.

Allowed values:

- `squat`
- `bench`
- `deadlift`
- `null`

This field lets variations such as `Paused Bench Press` or `Competition Bench` count toward bench-related BIG3 analysis without relying only on fragile string matching.

## BIG3 Strategy

BIG3 analysis should use `liftType` as the primary signal.

Recommended behavior:

- `liftType: "squat"` feeds squat trend analysis.
- `liftType: "bench"` feeds bench press trend analysis.
- `liftType: "deadlift"` feeds deadlift trend analysis.
- `liftType: null` is excluded from BIG3 trend analysis.

Why not string matching only:

- User input may include casing differences.
- Japanese and English names may both exist.
- Variations such as paused, competition, tempo, and deficit lifts are hard to classify by simple matching.
- Typos can silently split data.

Variation handling:

- `Paused Bench Press` can have `canonicalName: "Paused Bench Press"` and `liftType: "bench"`.
- `Competition Bench` can also use `liftType: "bench"`.
- This preserves variation identity while still allowing a bench-family trend.

## Hypertrophy Strategy

Hypertrophy analysis should use `primaryMuscles` as the initial muscle group volume source.

Initial approach:

- Count sets and volume load toward each `primaryMuscles` entry.
- Keep `secondaryMuscles` optional.
- Avoid strict direct/indirect volume modeling in the first version.

Reasoning:

- Direct vs indirect volume can become subjective quickly.
- A simple primary-muscle model is easier to explain and test.
- The model can evolve later with weighting rules if needed.

## Alias / Canonicalization Strategy

Canonicalization should map user-entered `exerciseName` to metadata when possible.

Suggested matching order:

1. Exact match against `canonicalName`.
2. Case-insensitive match against `canonicalName`.
3. Exact match against `aliases`.
4. Case-insensitive match against `aliases`.

Japanese and English handling:

- Store common Japanese names as aliases when they are known.
- Store common English names and abbreviations as aliases.
- Do not assume automatic translation in the first version.

Fallback behavior:

- If no metadata entry matches, keep the original free-text exercise name.
- The unmatched exercise can still appear in logs, PR detection, and weekly volume by raw name.
- The original user-entered value should not be overwritten.

## Initial Metadata Scope

Do not try to cover every possible exercise at first.

Suggested first entries:

- Bench Press
- Squat
- Deadlift
- Overhead Press
- Barbell Row
- Pull Up
- Lat Pulldown
- Leg Press
- Romanian Deadlift
- Dumbbell Press

This scope is enough to support early BIG3 trend work, common hypertrophy volume analysis, search experiments, and AI summary inputs.

## Implementation Options

### A. Shared Constant

Store metadata in a shared constant file.

Pros:

- No DB migration.
- No API changes.
- Easy to unit test.
- Works well with pure analytics utilities.
- Fastest path to BIG3 trend and muscle group volume utilities.

Cons:

- Requires code changes to add metadata.
- User custom exercises are not centrally managed.
- Metadata updates require deployment.

### B. Supabase Table

Store metadata in a Supabase table.

Pros:

- Metadata can be updated without deploying frontend code.
- Enables user-specific or admin-managed exercise catalogs.
- Better long-term fit for custom exercises and search.

Cons:

- Requires DB migration.
- Requires API/query decisions.
- Adds loading and caching concerns.
- More moving parts before the analytics model is proven.

### C. Hybrid

Start with a shared constant, then move or extend metadata into Supabase later.

Pros:

- Keeps the first implementation simple.
- Allows analytics utilities to be tested early.
- Leaves a path for DB-backed custom exercises.
- Supports progressive migration.

Cons:

- Requires a later migration plan.
- Need to avoid diverging constant and DB records.
- The matching API should be designed so callers do not care where metadata comes from.

## Recommended First Step

Start with a shared constant plus pure canonicalization utility.

Recommended first implementation:

- Add a shared exercise metadata constant.
- Add a pure function that maps a raw `exerciseName` to metadata.
- Keep unmatched names as free text.
- Add tests for exact, case-insensitive, alias, Japanese alias, and unmatched behavior.

Why this is safest:

- No DB migration.
- No API changes.
- No UI changes required.
- Easy to test.
- Creates a foundation for BIG3 trend and muscle group volume utilities.

## Risks / Notes

- Incomplete metadata can bias analysis.
- Too many aliases can become hard to maintain.
- User custom exercises need a fallback path.
- Japanese, English, abbreviations, and typos need deliberate handling.
- Existing logged `exerciseName` values must not be destroyed or overwritten.
- Canonicalization should support analytics without hiding the original user input.
- Muscle group mapping should be understandable rather than overly precise at the start.

## Suggested Next Phases

### Phase F: Exercise Metadata Constant + Canonicalization Utility

- Add initial shared metadata entries.
- Add a pure matcher for raw exercise names.
- Keep unmatched exercises as free text.

### Phase G: BIG3 Trend Utility

- Use `liftType` to group squat, bench, and deadlift trends.
- Include estimated 1RM, top sets, and PR references.

### Phase H: Muscle Group Volume Utility

- Use `primaryMuscles` to aggregate weekly set count and volume load.
- Keep indirect volume optional for later.

### Phase I: Graph Data Utility

- Convert analytics rows into chart-ready series.
- Keep UI implementation separate.

### Phase J: RPE/RIR Input

- Add optional set-level RPE/RIR/failure fields.
- Preserve old data compatibility.

### Phase K: Mobile UX Polish

- Add pinned exercises, search, previous values, and fast set controls.

### Phase L: AI Weekly Summary

- Feed deterministic metrics and metadata into AI summaries.
- Avoid sending auth tokens, account identifiers, or unnecessary private data.
