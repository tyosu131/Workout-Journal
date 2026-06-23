# Exercise Trend Canonicalization Design

## Overview

The Analytics page now includes an Exercises tab with an exercise-specific trend selector. The current implementation intentionally uses exact raw `exerciseName` matching. That is simple, predictable, and safe, but it also means related names such as `Bench Press`, `bench press`, `ベンチプレス`, `Paused Bench Press`, and `Competition Bench` can appear as separate exercises.

This document defines the canonicalization direction before changing the selector. It is a design note only. It does not introduce code, UI, API, database, or dependency changes.

## Current Behavior

The current Exercises tab behaves as follows:

- Uses raw `exerciseName` values as distinct selector candidates.
- Excludes empty `exerciseName` values.
- Sorts selector candidates by set count descending, then name ascending.
- Uses the selected raw exercise name and selected metric to call `toExerciseMetricSeries`.
- `toExerciseMetricSeries` performs exact raw `exerciseName` matching.
- Displays a Recharts line chart for the selected exercise and metric.
- Keeps an exact-value table fallback for recent chart points.

This behavior is correct for the first implementation because it preserves the original logged names and avoids hidden grouping decisions.

## Problem

Exact raw-name grouping is fragile for analytics.

Main issues:

- Casing differences split groups, such as `Bench Press` and `bench press`.
- Japanese and English entries split groups, such as `ベンチプレス` and `Bench Press`.
- Aliases split groups, such as `Bench`, `Competition Bench`, and `Bench Press`.
- Variations split groups, such as `Paused Bench Press` and `Competition Bench`.
- Typos and abbreviations can create additional one-off groups.
- The UI may eventually need both `canonicalName` and original raw names.
- Combining all bench-like names may improve readability, but over-combining can hide meaningful variation differences.

The variation tradeoff is important. `Paused Bench Press` and `Competition Bench` may be related to bench strength, but they can also represent distinct training variations that a user may want to review separately.

## Goals

Canonicalization should improve analytics without destroying raw training data.

Goals:

- Make the exercise selector easier to scan.
- Merge common aliases into stable canonical groups.
- Merge Japanese and English aliases where metadata supports it.
- Align exercise trends with existing BIG3 and metadata logic.
- Preserve the original raw `exerciseName` values.
- Allow fallback tables or tooltips to show raw names when useful.
- Keep unmatched exercises visible instead of silently dropping them.

## Non-goals

- Do not implement this in this phase.
- Do not run a DB migration.
- Do not change backend APIs.
- Do not create a full custom exercise catalog yet.
- Do not add fuzzy typo correction yet.
- Do not use AI for automatic exercise classification yet.
- Do not overwrite, normalize, or destroy raw `exerciseName` values.

## Canonicalization Options

### A. Keep Raw `exerciseName` Only

Continue using exact raw names.

Pros:

- No behavior change.
- No grouping ambiguity.
- Original user-entered values are fully visible.
- Existing `toExerciseMetricSeries` works as-is.

Cons:

- Splits aliases, casing differences, and Japanese / English names.
- Makes common exercise trends harder to read.
- Does not use the existing metadata and alias work.
- Can clutter the selector with many near-duplicates.

### B. Use `canonicalName` For Exercise Selector Grouping

Use `findExerciseMetadataByName` to match raw names. If metadata exists, group by `canonicalName`; if no metadata exists, keep the trimmed raw name.

Pros:

- Uses existing metadata without DB or API changes.
- Merges common aliases into cleaner selector entries.
- Makes Japanese / English alias handling useful.
- Keeps unmatched raw names visible.
- Improves selector readability quickly.

Cons:

- Some variations may be merged earlier than some users expect.
- Alias coverage quality directly affects grouping quality.
- Existing `toExerciseMetricSeries` cannot directly aggregate multiple raw names into one canonical group.
- The fallback table and tooltip need raw-name visibility to avoid hiding details.

### C. Use `canonicalName` Plus Variation Grouping

Represent both a canonical exercise family and raw or metadata-defined variations.

Example:

- `Bench Press family`
- `Paused Bench Press`
- `Competition Bench`

Pros:

- Preserves meaningful variation analysis.
- Supports both broad trends and variation-specific trends.
- Better long-term fit for serious strength analysis.

Cons:

- Requires more metadata structure than the current `aliases` model.
- Adds selector complexity.
- Requires UI decisions for family / variation switching.
- Harder to explain in the first pass.

### D. Use `liftType` Grouping For BIG3-like Selector

Group exercise trends by `liftType`, such as `bench`, `squat`, and `deadlift`.

Pros:

- Good for BIG3 family-level review.
- Aligns with `aggregateBig3Trend`.
- Handles variations through metadata `liftType`.

Cons:

- Less natural for the general Exercises tab.
- Too broad for non-BIG3 exercise analysis.
- May duplicate the purpose of the BIG3 tab.
- Does not solve general exercise selector clutter.

This is probably better as part of BIG3 analytics than as the primary Exercises tab behavior.

### E. DB-backed Exercise Catalog

Store exercise metadata and custom mappings in Supabase.

Pros:

- Can support user-specific custom exercises.
- Metadata can evolve without redeploying frontend code.
- Better long-term path for search, pinning, and custom aliases.

Cons:

- Requires DB migration and API decisions.
- Adds loading, caching, and conflict behavior.
- Too heavy before the frontend grouping behavior is proven.

This should remain a future option, not the first step.

## Recommended Initial Approach

The first implementation should use canonical-name grouping in the Exercises selector.

Recommended behavior:

- Match each raw exercise name with `findExerciseMetadataByName`.
- If metadata matches, use `metadata.canonicalName` as the group name.
- If metadata does not match, use the trimmed raw name as the group name.
- Display the chart by canonical group.
- Keep raw exercise names inside the group for fallback tables and tooltip context.
- Preserve unmatched exercises as raw-name groups.
- Defer advanced variation behavior until the metadata model is stronger.

Reasons:

- High UI value with limited implementation risk.
- Reuses existing `exerciseMetadata` and `exerciseCanonicalization` utilities.
- Requires no DB or API change.
- Makes the selector cleaner than exact raw matching.
- Keeps unmatched fallback behavior safe.
- Does not mutate or overwrite stored data.

## Data Shape Proposal

Future UI code may need intermediate types like these:

```ts
type CanonicalExerciseTrendGroup = {
  groupName: string;
  canonicalName: string | null;
  rawExerciseNames: string[];
  setCount: number;
  isMetadataMatched: boolean;
};

type CanonicalizedExerciseTrendPoint = {
  date: string;
  rawExerciseName: string;
  canonicalName: string | null;
  value: number;
};
```

Notes:

- `groupName` is the selector display key.
- `canonicalName` is present only when metadata matched.
- `rawExerciseNames` preserves the original logged names included in the group.
- `isMetadataMatched` can support UI hints such as matched vs custom exercise.
- `CanonicalizedExerciseTrendPoint` keeps raw context for tables and tooltips.

These are proposal shapes only and should be refined when implementation begins.

## Matching Rules

Recommended matching order:

1. Trim the raw exercise name.
2. Exclude empty names.
3. Call `findExerciseMetadataByName(rawName)`.
4. If metadata matches, use `metadata.canonicalName` as the group key.
5. If metadata does not match, use the trimmed raw name as the group key.
6. Do not use fuzzy matching.
7. Do not use AI classification.

This keeps the behavior deterministic and testable.

## Variation Handling

Initial behavior:

- Names included in metadata aliases should group under the matching `canonicalName`.
- Raw names should still be retained in `rawExerciseNames`.
- The fallback table should be able to show the raw exercise name for each point.

Example:

- `Bench Press`
- `bench press`
- `ベンチプレス`
- `Paused Bench Press`
- `Competition Bench`

With the current metadata, these can initially group under `Bench Press`.

Important caution:

- Fully merging `Paused Bench Press` into `Bench Press` can hide variation-specific progress.
- The first UI may benefit from a clean group, but later users may want a `canonical group / raw variation` toggle.
- Variation behavior should be refined after real usage, not over-modeled before the first implementation.

## UI Proposal

Future Exercises tab behavior could look like this:

- Selector displays canonical group names.
- Unmatched exercises display their trimmed raw names.
- Selector labels include raw-name count and set count.
- Example: `Bench Press (3 names, 42 sets)`.
- Fallback table includes a `Raw exercise name` column.
- Chart tooltip can show raw exercise name when a point comes from a specific raw variation.
- Metadata-matched groups may optionally show a small matched/custom indicator later.

The UI should stay compact. The first implementation should not add advanced filters, multiple exercise comparison, or a custom catalog editor.

## Implementation Plan

Suggested small PR scope for Phase Q:

- Add a canonical exercise grouping helper near the analytics UI.
- Keep shared utilities unchanged unless a pure helper naturally belongs in `shared`.
- Build selector options from canonical groups instead of raw names.
- Use raw exercise names inside each group to build a combined chart series.
- Add `Raw exercise name` to the fallback table.
- Keep exact raw-name behavior available as a fallback if grouping has edge cases.
- Add unit tests for any pure grouping helper if it is extracted.

The first implementation should avoid DB, API, dependency, and broad UI changes.

## Risks / Notes

- Incomplete aliases can partially group data and leave near-duplicates.
- Over-grouping variations can hide meaningful exercise differences.
- Unmatched exercises must remain visible and useful.
- Raw data must never be overwritten.
- Metadata update rules will become important as the exercise list grows.
- A DB-backed catalog is a later task, not an initial requirement.
- Current `toExerciseMetricSeries` uses exact raw-name matching, so it may not directly support canonical group aggregation.
- Canonical group aggregation may need a new UI-side helper or a future shared utility that accepts multiple raw names.

## Suggested Next Phases

- Phase Q: Exercise trend canonical grouping helper
- Phase R: Exercise trend canonical selector UI
- Phase S: Raw variation display / fallback table polish
- Phase T: RPE/RIR input
- Phase U: AI weekly summary
