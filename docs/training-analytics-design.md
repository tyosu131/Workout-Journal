# Training Analytics Design

## Overview

Workout Journal will evolve from a simple workout log into a training analytics foundation for hypertrophy, strength progress, exercise-specific trends, and mobile-friendly gym usage.

The first priority is to improve the structure of logged training data and build reliable analysis utilities. AI summaries should sit on top of calculated metrics, not replace them. The intended flow is:

1. Record consistent training data.
2. Calculate deterministic metrics such as volume, estimated 1RM, PRs, and RPE/RIR trends.
3. Use AI to summarize those metrics in plain language and suggest cautious next-step options.

This document is a design note only. It does not define an immediate database, API, or UI change.

## Target Use Cases

### Hypertrophy

- Track weekly sets and volume by muscle group.
- Review whether target muscles receive enough effective work.
- Observe RPE/RIR trends to avoid training too far from or too close to failure.
- Detect exercise imbalance, such as too much pressing and too little pulling.

### BIG3 Strength

- Track squat, bench press, and deadlift progress.
- Estimate 1RM trends from top sets.
- Identify PR history and intensity distribution.
- Suggest next-session weight candidates based on recent performance.

### General Training Log

- Keep daily records of exercises, weight, reps, sets, rest, and notes.
- Compare current performance with previous sessions.
- Support both structured programs and flexible ad hoc training.

### Mobile Gym Input

- Make logging fast enough to use between sets.
- Reduce typing with previous values, copy actions, pinned exercises, and large touch targets.
- Keep the core workflow usable with one hand.

## Data Fields

Potential future workout log fields:

| Field | Purpose |
| --- | --- |
| `exerciseName` | Human-readable exercise name. |
| `date` | Training date. |
| `weight` | Load used for the set or exercise entry. |
| `reps` | Repetitions performed. |
| `sets` | Number of sets, or a grouped set count depending on the log model. |
| `rpe` | Rating of perceived exertion, commonly 1-10. |
| `rir` | Reps in reserve. |
| `failure` | Whether the set reached failure. |
| `memo` | User note, cue, pain note, or context. |
| `restSeconds` | Rest time between sets. |
| `bodyWeight` | Body weight for bodyweight or strength-relative analysis. |
| `exerciseCategory` | Category such as compound, isolation, machine, free weight, or bodyweight. |
| `primaryMuscles` | Main target muscles for hypertrophy analysis. |
| `movementPattern` | Pattern such as squat, hinge, push, pull, carry, or core. |

Additional fields may be needed later for set-level logging, program blocks, exercise aliases, units, and equipment.

## Analytics Metrics

### Estimated 1RM

- Estimate one-rep max from weight and reps.
- Use only appropriate rep ranges for better reliability.
- Track trends rather than treating a single estimate as exact.

### Volume Load

- Calculate `weight * reps * sets`.
- Useful for exercise-level and session-level workload trends.
- Should be interpreted alongside RPE/RIR and exercise type.

### Weekly Volume

- Aggregate set count and volume load by week.
- Support trend comparison across training blocks.

### Muscle Group Volume

- Map exercises to primary muscles.
- Aggregate weekly sets and volume by muscle group.
- Useful for hypertrophy balance and undertrained area detection.

### PR Tracking

- Track best estimated 1RM.
- Track best weight for a rep count.
- Track volume PRs where useful, but avoid overemphasizing noisy metrics.

### BIG3 Trend

- Track squat, bench press, and deadlift separately.
- Show top set, estimated 1RM, and PR history over time.

### RPE / RIR Trend

- Track effort level by exercise and muscle group.
- Detect patterns such as consistently high fatigue or consistently low effort.

### Fatigue / Stagnation Indicators

- Flag repeated performance drops at similar RPE/RIR.
- Flag rising RPE with flat or falling load/reps.
- Flag sudden volume spikes that may increase fatigue risk.

## Hypertrophy Analysis

Hypertrophy-focused analysis should prioritize consistent weekly training volume and effort distribution.

- Muscle group set counts:
  - Weekly direct sets per target muscle.
  - Comparison against recent averages.

- Volume trends:
  - Exercise volume load over time.
  - Muscle group volume over time.
  - Sudden increases or decreases.

- RPE/RIR trends:
  - Whether working sets are usually close enough to failure.
  - Whether too many sets are pushed to very high RPE.

- Exercise balance:
  - Push/pull balance.
  - Quad/hamstring/glute balance.
  - Compound/isolation distribution.
  - Repeated neglect of a target muscle group.

## Strength / BIG3 Analysis

Strength-focused analysis should emphasize top-set performance, estimated 1RM trends, intensity, and PR history.

- Squat, bench press, and deadlift estimated 1RM:
  - Track each lift independently.
  - Prefer stable trends over single-session spikes.

- Top set trends:
  - Best set of the session by estimated 1RM or load.
  - Compare top sets at similar reps and RPE.

- PR history:
  - All-time PRs.
  - Recent training block PRs.
  - Rep PRs such as best 5RM or 8RM.

- Intensity:
  - Percentage of estimated 1RM.
  - Heavy exposure frequency.
  - High-intensity fatigue accumulation.

- Next weight candidates:
  - Suggest conservative increases when recent performance is stable.
  - Suggest repeating or reducing load when RPE is high or performance drops.
  - Treat suggestions as options, not commands.

## AI Summary Layer

AI should summarize computed training metrics rather than directly invent conclusions from raw logs.

Recommended input to AI:

- Weekly volume by muscle group.
- Exercise-level performance trends.
- BIG3 estimated 1RM trends.
- Recent PRs.
- RPE/RIR averages and outliers.
- Stagnation or fatigue flags from deterministic logic.
- User memo highlights.

Possible AI outputs:

- Weekly training summary.
- Progress highlights.
- Potential stagnation trends.
- Next-session focus.
- Caution notes, such as unusually high fatigue or sudden volume increases.

Expression guidelines:

- Avoid medical or professional coaching claims.
- Avoid overconfident statements from limited data.
- Prefer wording such as "may indicate", "consider", and "one option is".
- Show the metrics behind the summary when possible.
- Make it clear that users should adjust based on their condition and goals.

## Mobile UX

Gym usage requires quick, low-friction input.

- Show previous values for the selected exercise.
- Allow set copy and quick increment/decrement.
- Use large buttons and touch targets.
- Support fast exercise search.
- Allow frequently used exercises to be pinned.
- Keep key actions reachable for one-handed use.
- Minimize required fields during the workout.
- Allow optional detail entry after the session.
- Avoid dense charts or long AI text inside the active logging flow.

## Implementation Phases

### Phase A: Data Model Review

- Review current workout log structure.
- Decide whether analytics require set-level records.
- Define exercise metadata such as muscles, category, and movement pattern.
- Plan migrations separately before making DB changes.

### Phase B: RPE/RIR Input

- Add optional RPE/RIR/failure fields.
- Keep input lightweight and non-blocking.
- Preserve existing logging flow.

### Phase C: Analytics Utilities

- Add pure utility functions for estimated 1RM, volume load, weekly volume, PR detection, and trends.
- Unit test calculation logic before wiring UI.

### Phase D: Graphs

- Add exercise-level trend charts.
- Add muscle group volume charts.
- Add BIG3-focused trend views.
- Keep charts readable on mobile.

### Phase E: AI Summary

- Feed calculated metrics into an AI summary layer.
- Start with weekly summaries and cautious next-step suggestions.
- Keep deterministic metrics visible as the source of the summary.

### Phase F: Mobile UX Polish

- Improve gym-time input speed.
- Add pinned exercises, set copy, previous-value shortcuts, and one-handed controls.
- Refine the active workout flow based on real usage.

## Risks / Notes

- RPE and RIR are subjective and cannot be perfectly inferred.
- Estimated 1RM is an estimate, especially unreliable at high rep counts or inconsistent effort.
- AI should not present medical, injury, or professional coaching advice as certainty.
- Early users with limited data will receive lower-confidence trends.
- Too many fields can make logging feel heavy, especially during workouts.
- Analytics should support the user, not pressure them into chasing every metric.
- UI complexity should be added gradually and tested against the core logging flow.
