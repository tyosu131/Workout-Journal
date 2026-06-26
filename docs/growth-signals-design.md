# Growth Signals Design

## Overview

Growth Signals are a proposed Analytics feature for showing whether logged training appears to be improving, flat, sparse, or worth watching.

This document is design-only. It does not implement UI, helpers, API changes, database changes, backend service changes, environment variables, dependency changes, or package-lock changes.

Workout-Journal's core product position is a simple note app for recording training, analyzing the record, and carrying useful observations into the next session. Growth Signals should support that loop:

1. Record workouts simply.
2. Convert notes into deterministic analytics.
3. Surface short signals that help the user decide what to review next.

Growth Signals are not an AI feature. They should be deterministic analytics derived from recorded workout data. AI summaries may later use Growth Signals as input, but Growth Signals should remain useful without external AI.

## Product Positioning

The center of the app is simple workout logging. A user should be able to record exercises, sets, weight, reps, rest, and optional effort data without feeling forced into a complex analytics workflow.

Analytics should help users reread their own records. Charts and summaries are support tools, not the product replacing the training log.

Weekly Summary is a natural-language layer over existing analytics. The current implementation includes a deterministic rule-based preview and a mocked backend weekly summary flow. This is useful for reflection, but it is still summary text.

Growth Signals should sit between charts and summaries:

- Charts show raw trends.
- Weekly Summary explains a range in prose.
- Growth Signals give short, structured judgments such as "positive", "watch", or "unknown".

The first version should prioritize deterministic signals from recorded data over external AI. This keeps the feature testable, explainable, low cost, and aligned with the app's training-note identity.

## Current State

Implemented Analytics foundation:

- BIG3 estimated 1RM chart.
- Muscle group volume chart.
- Exercise trend selector.
- Canonical exercise grouping for exercise trends.
- Effort summary from set-level RPE, RIR, and failure values.
- Rule-based weekly summary preview.
- Frontend Generate AI summary button against the mocked backend endpoint.
- Backend mocked weekly summary endpoint.
- Provider adapter boundary.
- Prompt builder, response validation, and fallback behavior.

Current gap:

- There is no Growth Signals card or helper that summarizes growth across strength, volume, consistency, effort, and exercise progress.

## Goals

Growth Signals should:

- Help the user understand training progress quickly.
- Highlight which metric is worth checking next session.
- Make chart-heavy analytics easier to scan.
- Separate strength, volume, consistency, effort, and exercise progress.
- Be deterministic and explainable without AI.
- Provide structured evidence that Weekly Summary or future AI prompts can reuse.
- Treat sparse data cautiously.
- Avoid turning limited data into overconfident coaching advice.

## Non-goals

Growth Signals should not:

- Diagnose injuries or make medical claims.
- Automatically decide a training program.
- Call an external AI API.
- Change database schema.
- Implement UI in this phase.
- Change backend API behavior.
- Create a complex proprietary score in the first version.
- Infer body weight, body fat, sleep, pain, or other unlogged data.
- Infer user goals unless explicitly stored later.
- Replace chart details or user judgment.

## Signal Categories

### A. Strength Signal

Purpose:

- Show whether major lift strength data exists and whether it appears useful.

Existing inputs:

- BIG3 estimated 1RM summaries.
- `latestTopSet`.
- `maxEstimatedOneRepMax`.
- `points.length` / trend point count.

Initial interpretation:

- If no BIG3 trend points exist, status should be `unknown`.
- If current range has useful BIG3 points, show the best available lift signal.
- Later, compare current range against a previous range to mark positive or watch.

Example evidence:

- "Bench Press max estimated 1RM: 102.5."
- "3 BIG3 trend points in this range."

### B. Volume Signal

Purpose:

- Show whether training volume is logged and whether muscle group volume looks balanced enough to review.

Existing inputs:

- Weekly muscle group volume rows.
- `totalSets`.
- `totalVolumeLoad`.
- involved muscles and exercises.

Initial interpretation:

- If no muscle group rows exist, status should be `unknown`.
- Highlight the highest-volume muscle group.
- Mark `watch` when one muscle group dominates the current range by a large margin.
- Later, compare current range volume against the previous range.

Example evidence:

- "chest: 18 sets."
- "back: 6 sets."
- "Top muscle group volume is 3x another major group."

### C. Consistency Signal

Purpose:

- Show whether the range has enough logged training to make analytics meaningful.

Existing inputs:

- note count.
- total normalized sets.
- date range.
- data quality notes.

Potential future input:

- distinct training days count.

Initial interpretation:

- If notes and sets are both zero, status should be `unknown`.
- If notes or sets are very low for the selected range, status should be `watch`.
- If logged notes and sets are sufficient, status can be `neutral` or `positive`.

Example evidence:

- "3 workout notes."
- "42 normalized sets."
- "No normalized sets found in this range."

### D. Effort Signal

Purpose:

- Show whether effort data exists and whether logged intensity needs attention.

Existing inputs:

- effort coverage.
- average RPE.
- average RIR.
- failure count.

Initial interpretation:

- Missing effort values are unknown, not low effort.
- If effort coverage is zero, status should be `unknown`.
- If effort coverage is low, status should be `watch`.
- If failure sets are frequent relative to total sets, status should be `watch`.
- If effort coverage is healthy and failure count is modest, status can be `neutral`.

Example evidence:

- "Effort coverage: 12 / 42 sets."
- "Average RPE: 8.1."
- "Failure sets: 2."

### E. Exercise Progress Signal

Purpose:

- Show progress opportunities for individual exercise trends beyond BIG3.

Existing inputs:

- exercise trend data.
- canonical exercise grouping.
- raw-name fallback.
- set-level metrics.

Potential future inputs:

- top set extraction.
- best estimated 1RM by exercise.
- PR detection within the selected range.

Initial interpretation:

- If exercise names are missing or unmatched, status can be `unknown`.
- If selected exercise has enough points, signal can mention that trend is available.
- Later, compare latest value to previous value for the selected canonical group.

Example evidence:

- "Bench Press group has 5 sets from 3 raw names."
- "Selected exercise has 4 chart points."

## Proposed Output Shape

Future helper output candidate:

```ts
type GrowthSignalStatus = "positive" | "neutral" | "watch" | "unknown";

type GrowthSignal = {
  id: string;
  label: string;
  status: GrowthSignalStatus;
  headline: string;
  detail: string;
  evidence: string[];
  nextFocus: string | null;
};

type GrowthSignalsSummary = {
  rangeStart: string;
  rangeEnd: string;
  signals: GrowthSignal[];
  dataQualityNotes: string[];
};
```

Status guidance:

- `positive`: recorded data suggests improvement or strong coverage.
- `neutral`: data exists, but no clear positive or warning signal is available.
- `watch`: data exists and suggests something worth reviewing.
- `unknown`: data is missing, sparse, or unsupported for this category.

## Signal Rules

Initial rules should stay conservative:

- If BIG3 trend points are missing, strength status is `unknown`.
- If estimated 1RM improves versus a previous range later, strength can become `positive`.
- If current range has BIG3 data but no previous comparison, strength may be `neutral` with evidence.
- If muscle group volume rows are missing, volume status is `unknown`.
- If one muscle group is extremely dominant, volume status can be `watch`.
- If total notes or total sets are very low for the selected range, consistency status can be `watch`.
- If effort coverage is zero, effort status is `unknown`.
- If effort coverage is below a threshold such as 25%, effort status can be `watch`.
- If failure count is high relative to total sets, effort status can be `watch`.
- Missing RPE/RIR/failure values must be treated as unknown, not low intensity.
- If exercise trend points are missing for the selected or top exercise, exercise progress status is `unknown`.

Thresholds should be explicit constants in a future helper, with tests covering edge cases.

## Data Requirements

Existing data that can support Growth Signals:

- normalized sets from `normalizeWorkoutSets`.
- BIG3 trend summaries from `aggregateBig3Trend`.
- muscle group weekly volume rows from `aggregateWeeklyMuscleGroupVolume`.
- exercise trend rows / chart series.
- effort summary from `summarizeSetEffort`.
- weekly summary input from `buildWeeklySummaryInput`.
- date range.
- note count.

Data that may be needed later:

- previous range comparison.
- distinct training days count.
- top set extraction by exercise and by lift.
- PR detection within the selected range.
- custom exercise catalog.
- explicit user goal.
- selected exercise group context.

## UI Placement Proposal

Initial placement on the Analytics page:

- Near Weekly Summary.
- Below the range filter.
- Before the BIG3 / Muscle Groups / Exercises tabs.
- A compact card or small grid.
- Mobile layout should stack vertically.
- Details can be collapsible if evidence lists become long.

Suggested display labels:

- Growth Signals.
- Strength.
- Volume.
- Consistency.
- Effort.
- Watch Next.

Each signal card should show:

- status badge.
- short headline.
- one detail sentence.
- 1 to 3 evidence items.
- optional next focus.

The first UI should avoid large charts. Growth Signals should guide the user toward existing charts rather than duplicate them.

## Relationship With Weekly Summary

Growth Signals and Weekly Summary should have different responsibilities:

- Growth Signals are structured, deterministic, and scannable.
- Weekly Summary is prose that explains the selected range.
- Growth Signals should work even when AI is unavailable.
- Rule-based Weekly Summary can use Growth Signals later to improve its highlights and concerns.
- Future AI prompt input can include Growth Signals as structured evidence.
- AI should not invent signals that deterministic helpers did not produce.

This keeps AI as a layer over analytics rather than a replacement for analytics.

## Testing Strategy

Future implementation should prioritize pure helper tests:

- no data.
- sparse data.
- positive strength trend when previous range comparison is available.
- BIG3 missing data produces unknown strength.
- volume imbalance produces watch.
- no muscle group data produces unknown volume.
- low effort coverage produces watch.
- high failure count produces watch.
- missing effort values remain unknown.
- consistency watch for very low note/set count.
- deterministic output ordering.
- input mutation is avoided.
- no AI call.

UI tests can come later if component testing infrastructure is available. The first important step is deterministic signal logic.

## Implementation Plan

Suggested phases:

- **Phase GS1: Growth Signals design docs** - Define categories, output shape, and rules.
- **Phase GS2: Growth Signals pure helper + tests** - Build deterministic helper without UI.
- **Phase GS3: Analytics Growth Signals card** - Add compact UI on Analytics page.
- **Phase GS4: Weekly Summary input integration review** - Decide whether `WeeklySummaryInput` should include Growth Signals.
- **Phase GS5: AI prompt input integration review** - Decide whether future AI prompts should include Growth Signals.

## Recommended Initial Implementation

Recommended next PR:

- Add a shared pure helper and tests for current-range Growth Signals.
- Do this before external AI integration.
- Do not change DB schema.
- Do not add backend API.
- Do not implement UI until helper behavior is stable.
- Start without previous range comparison.
- Build signals from the current selected range only.

Initial helper inputs can mirror existing Analytics page state:

- range start and end.
- note count.
- normalized sets or total set count.
- BIG3 summaries.
- muscle group rows.
- effort summary.
- optional selected exercise trend context later.

## Risks / Open Questions

Risks:

- Growth judgment can become too confident.
- Sparse data can look like lack of progress.
- Volume interpretation can be misleading without user goals.
- Failure count can be hard to interpret without exercise context.
- Exercise name variation can still affect exercise progress signals.
- More cards can make Analytics feel crowded.
- Weekly Summary and Growth Signals can duplicate each other if boundaries are unclear.

Open questions:

- Should previous range comparison be required before any `positive` status?
- What thresholds are appropriate for volume imbalance?
- Should training days count be derived from normalized sets or note dates?
- How should custom exercises without metadata affect volume and exercise signals?
- Should users eventually set a goal such as hypertrophy, strength, or general fitness?
- Should Growth Signals be included in the mocked weekly summary endpoint payload later?

## Verification Notes

This phase is docs-only. It should not change code, UI, API, database schema, backend services, environment variables, dependencies, or package-lock files.
