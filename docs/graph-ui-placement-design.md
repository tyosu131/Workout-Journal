# Graph UI Placement Design

## Overview

Workout Journal now has deterministic analytics utilities that can prepare chart-ready training data, but it does not yet have an analytics user interface. Deciding where graphs belong before implementing them helps protect the existing calendar and workout-entry flows from added complexity.

The analysis logic is already separated into shared pure utilities. This document defines the proposed screen placement, navigation, initial graph scope, range filters, mobile behavior, and component boundaries before any UI or chart-library work begins.

This is a design document only. It does not introduce a route, component, API, database change, or dependency.

## Current Analytics Foundation

The following analytics building blocks are available:

- Normalized workout sets converted from the current nested daily note structure.
- Set-level volume load and estimated one-rep max calculations.
- Weekly training volume grouped by exercise.
- Exercise-level personal record detection.
- Exercise metadata and canonicalization for aliases, Japanese names, and lift families.
- BIG3 trend aggregation for squat, bench press, and deadlift.
- Weekly muscle group set and volume-load aggregation.
- Chart series conversion for BIG3, muscle group, and exercise-specific metrics.

These utilities keep calculations outside the future UI and make the graph layer responsible mainly for data loading, filtering, presentation, and empty states.

## Candidate Graph Types

| Graph or summary | User value | Priority | Data readiness |
| --- | --- | --- | --- |
| BIG3 estimated 1RM trend | Shows long-term strength direction for squat, bench press, and deadlift. | High | Ready through BIG3 aggregation and chart series conversion. |
| BIG3 latest top set | Gives a compact view of the most recent strongest set for each BIG3 lift. | High | Ready through `latestTopSet`; a card or table is sufficient initially. |
| Exercise-specific estimated 1RM trend | Shows strength progress for one selected exercise. | Medium | Chart conversion is ready; exercise selection and canonical-name behavior need UI decisions. |
| Exercise-specific weight trend | Shows load progression without relying on an e1RM estimate. | Medium | Chart conversion is ready; the same selector complexity applies. |
| Exercise-specific volume load trend | Shows set workload changes over time. | Medium | Chart conversion is ready, but interpretation should remain exercise-specific. |
| Weekly muscle group set volume | Gives hypertrophy-oriented users a simple view of weekly training exposure. | High | Ready through metadata, weekly muscle aggregation, and chart conversion. |
| Weekly muscle group volume load | Adds load context to muscle group trends. | Medium | Data is ready, but comparing different exercises by volume load can be misleading. |
| PR summary cards | Surfaces best e1RM, weight, reps, and volume-load records. | Medium | PR data is ready; cards can be added after the first trend sections. |

## Placement Options

### A. Dedicated Dashboard / Analytics Page

Add a dedicated route such as `/analytics`.

Advantages:

- Keeps analysis separate from active workout entry.
- Provides enough vertical space for multiple sections and empty states.
- Supports tabs and range filters without crowding the calendar.
- Limits changes to existing pages.
- Makes future graph sections easier to add incrementally.

Disadvantages:

- Requires a new route and a navigation entry.
- Users must intentionally leave the calendar to review progress.
- The page needs its own loading, error, and no-data states.

### B. Calendar or Note Detail Analysis Cards

Add summary cards near the calendar or daily note.

Advantages:

- Keeps progress information close to existing records.
- Can provide useful context while reviewing a date.
- A small summary may require fewer navigation changes.

Disadvantages:

- Graphs would compete with calendar navigation or workout input space.
- Daily note pages are already dense, particularly on mobile.
- Date-specific context does not naturally fit 12-week trends.
- Additional data fetching could affect the active logging experience.

### C. User / Profile Progress Section

Add progress content to the account page.

Advantages:

- Personal progress conceptually belongs to the signed-in user.
- Suitable for a small high-level progress summary.

Disadvantages:

- The current user page is focused on account settings.
- Training analytics and account management have different tasks and information density.
- A full graph experience would make the settings page less focused.

### D. Hybrid

Start with a dedicated analytics page, then add compact links or summary cards to the calendar, note detail, or user page later.

Advantages:

- Preserves a focused home for detailed analysis.
- Allows high-value summaries to be reused after their behavior is proven.
- Supports gradual integration without committing every existing page to graph logic.

Disadvantages:

- Eventually requires consistency across multiple placements.
- Reused cards need clear date-range and metric context.

## Recommended Placement

The initial implementation should use a dedicated Analytics page at `/analytics`, following the existing Next.js Pages Router structure.

Reasons:

- It minimizes risk to the existing note input UI.
- It gives mobile layouts enough vertical space.
- BIG3, muscle group, and later exercise trends can be separated with tabs.
- Existing calendar, note, and account responsibilities remain focused.
- Summary cards can be extracted into the calendar or other pages later.

The long-term direction can be hybrid, but the dedicated page should remain the primary detailed analytics destination.

## Initial Graph Scope

The first UI should be deliberately narrow:

1. BIG3 estimated 1RM trend.
2. Weekly muscle group set volume.

The BIG3 trend provides immediate value for strength-focused users and already has stable lift classification and chart-series data. Weekly muscle group set volume provides a useful hypertrophy view and is easier to explain than cross-exercise volume load.

Exercise-specific weight and e1RM trends should follow later. They require an exercise selector, decisions about raw versus canonical names, search behavior, and clear empty-state handling, which would add avoidable complexity to the first page.

BIG3 latest top sets may appear as compact summary cards above the BIG3 trend because the data is already available, but they should not expand the initial chart scope.

## Mobile UX Strategy

- Use a single-column, vertically stacked layout on small screens.
- Separate `BIG3`, `Muscle Groups`, and future `Exercises` views with tabs.
- Keep analytics separate from the gym-time note input screen.
- Start each section with a compact summary card followed by one simple chart.
- Keep touch targets large enough for reliable one-handed use.
- Simplify legends and axis labels on small screens while preserving metric units and date context.
- Prefer a shorter selected period over forcing a dense graph into the viewport.
- Avoid horizontal scrolling by default, but allow it selectively if a graph cannot remain readable after period filtering and label reduction.
- Provide clear loading, error, and insufficient-data states without rendering empty chart frames.

## Filter Strategy

Candidate periods:

- 4 weeks
- 8 weeks
- 12 weeks
- 6 months
- All

The default should be **12 weeks**.

Twelve weeks is long enough to reveal meaningful training changes, limited enough to avoid excessive point density, and readable on mobile. Four- and eight-week ranges support recent-block review, while six months and all-time views support longer-term inspection.

The selected range should apply consistently across visible analytics sections. Range filtering should happen before aggregation where week boundaries or latest values depend on the selected data, and the UI should state the active range clearly.

## Chart Library Strategy

### A. Dependency-Free HTML / CSS

Advantages:

- No new package or bundle cost.
- Useful for validating data flow, cards, tables, and empty states.
- Keeps the first scaffold low risk.

Disadvantages:

- Accessible axes, tooltips, responsive lines, and multiple series are expensive to implement well.
- A home-grown chart can become harder to maintain than the analytics logic itself.

### B. Chart Library Such as Recharts

Advantages:

- Provides responsive chart primitives, legends, axes, tooltips, and multiple series.
- Speeds up production-quality graph implementation.
- Better suited to BIG3 and weekly trend views than custom CSS.

Disadvantages:

- Adds dependency and bundle size.
- Requires checks for current Next.js compatibility, mobile rendering, accessibility, and build behavior.
- May introduce new warnings or styling constraints.

### C. Delay Selection Until UI Implementation

Advantages:

- The current chart data utilities remain library-neutral.
- Page layout and data behavior can be validated before committing to a rendering library.
- Bundle impact and frontend compatibility can be evaluated with a concrete graph requirement.

Disadvantages:

- Detailed chart component design remains provisional.
- A temporary table or card view may later be replaced.

The recommended approach is C. Consider a chart library for the first full graph UI, but do not add one until the existing frontend stack, bundle impact, mobile behavior, accessibility, and build output have been evaluated. The initial page scaffold can use cards or tables without a graph dependency.

## Data Flow Proposal

1. Fetch notes for the selected date range with the existing authenticated notes API.
2. Convert notes with `normalizeWorkoutSets`.
3. Map the normalized sets through `addTrainingMetricsToSet`.
4. Produce domain summaries with `aggregateBig3Trend` and `aggregateWeeklyMuscleGroupVolume`.
5. Convert summaries with the `trainingGraphData` utilities.
6. Render the resulting chart series in analytics UI components.

This flow keeps API data, deterministic calculations, chart formatting, and rendering as separate responsibilities. The initial implementation should reuse the existing range endpoint rather than introduce an analytics API.

## Component Proposal

Potential future files:

- `frontend/features/analytics/pages/AnalyticsPage.tsx`
- `frontend/features/analytics/components/Big3TrendSection.tsx`
- `frontend/features/analytics/components/MuscleGroupVolumeSection.tsx`
- `frontend/features/analytics/components/ExerciseTrendSection.tsx`
- `frontend/features/analytics/components/AnalyticsRangeFilter.tsx`

Additional hooks may later isolate note loading and analytics preparation, but they should only be introduced when the page implementation demonstrates a real need. Shared calculations should remain in `shared/utils` rather than moving into React components.

## Routing Proposal

The current frontend uses the Next.js Pages Router and thin page entry files that delegate to feature components. The matching route proposal is:

- `frontend/pages/analytics.tsx` as the route entry.
- `frontend/features/analytics/pages/AnalyticsPage.tsx` as the screen implementation.

A future navigation entry can be added to the existing top-page menu. The route should use the same authentication behavior as other signed-in pages and return users to the existing `/top` calendar without changing note routes.

## First UI Implementation Candidate

The next implementation should begin with an Analytics page scaffold:

1. Add the `/analytics` page and feature-level page component.
2. Reuse the existing authenticated range notes API.
3. Add the 12-week default range and loading, error, and no-data states.
4. Wire the normalization, metrics, BIG3 aggregation, and chart-series pipeline.
5. Render BIG3 latest values and trend data first as simple cards or a table.
6. Evaluate a chart library only after the page data flow and mobile layout are stable.

This sequence validates the application integration without coupling the first step to a new dependency.

## Risks / Notes

- Building chart UI too early can delay higher-value workout input improvements.
- Responsive charts can break or become unreadable on small screens without deliberate label and range control.
- Some free-text exercises will not match canonical metadata and therefore will not appear in BIG3 or muscle group analytics.
- Users with little or no matching data need useful empty and insufficient-data states.
- A chart library may increase bundle size or introduce additional build warnings.
- RPE/RIR input is not implemented, so effort-based trends are not yet available.
- Muscle group set counts are an initial primary-muscle model, not strict direct-versus-indirect volume.
- Estimated 1RM is an estimate and should be labeled accordingly.
- The existing Google Fonts download warning is a separate build-environment issue and should not be mixed into graph UI work.

## Suggested Next Phases

- **Phase K: Analytics page scaffold** - Add the route, data flow, range selection, and states without requiring a chart library.
- **Phase L: BIG3 trend UI** - Add the first complete strength trend visualization and latest top-set summary.
- **Phase M: Muscle group volume UI** - Add weekly primary-muscle set volume and optional volume-load views.
- **Phase N: Exercise trend selector UI** - Add exercise search/selection and weight, e1RM, and volume trends.
- **Phase O: RPE/RIR input** - Add optional set-level effort input before effort analytics.
- **Phase P: Mobile input UX polish** - Improve the active gym logging workflow independently from analytics.
- **Phase Q: AI weekly summary** - Summarize deterministic metrics after the underlying views and data quality are established.
