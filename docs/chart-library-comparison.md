# Chart Library Comparison

## Overview

Workout Journal now has an `/analytics` page scaffold and deterministic utilities that produce chart-ready series. The current interface deliberately uses cards and tables so that data loading, filtering, empty states, and mobile layout can be validated before adding visualization dependencies.

A chart library comparison is necessary because the first charts must work with the existing Next.js Pages Router, React, TypeScript, and Chakra UI stack without creating disproportionate bundle, maintenance, accessibility, or build risk.

This document records an implementation decision only. It does not install a package, modify the Analytics UI, or change any lockfile.

## Current UI State

- The frontend exposes an authenticated `/analytics` route.
- The default analytics range is 12 weeks, with 4-week, 8-week, 6-month, and all-time alternatives.
- BIG3 latest top sets and estimated 1RM records are displayed as cards.
- Weekly muscle group sets and volume load are displayed in a responsive table container.
- Loading, error, retry, and no-data states are already present.
- `shared/utils/trainingGraphData.ts` converts analytics results into library-neutral `ChartSeries` and `ChartDataPoint` values.
- No chart library is currently listed in `frontend/package.json`.

## Requirements

The first chart implementation should be evaluated against these requirements:

| Requirement | Why it matters |
| --- | --- |
| Next.js Pages Router support | The current frontend is not using the App Router and should not be migrated for chart work. |
| React and TypeScript fit | Charts should compose naturally with existing typed React components. |
| Mobile responsiveness | The Analytics page is designed for narrow screens and a 12-week default range. |
| Line charts | BIG3 estimated 1RM is the first proposed graph. |
| Multiple series | Squat, bench press, and deadlift may share one trend view. |
| Tooltips | Users need the date, lift, exercise, and estimated value at a point. |
| Legends | BIG3 series must remain distinguishable without relying only on color. |
| Axis formatting | Dates and estimated 1RM values need compact, readable formatting. |
| Bundle impact | Analytics should not add a large cost to unrelated pages without clear value. |
| Accessibility | Keyboard, screen-reader, reduced-motion, contrast, and textual alternatives must be considered. |
| Chakra UI coexistence | Chart containers, colors, spacing, and tooltips should fit the existing theme without replacing it. |
| Build stability | The dependency should not introduce avoidable SSR, hydration, or build warnings. |
| Maintenance and ecosystem | Documentation, release activity, examples, and React compatibility affect long-term cost. |

Bundle impact should be measured with the actual production build rather than estimated from package names alone. Tree shaking, imported chart modules, transitive dependencies, and Next.js chunking all affect the final result.

## Candidate A: Recharts

Recharts provides declarative React components built around SVG charts. Its API includes line charts, responsive sizing, axes, tooltips, legends, and composable chart elements.

Official references:

- [Recharts project and installation](https://github.com/recharts/recharts)
- [ResponsiveContainer](https://recharts.github.io/en-US/api/ResponsiveContainer/)
- [Tooltip](https://recharts.github.io/en-US/api/Tooltip/)
- [Legend](https://recharts.github.io/en-US/api/Legend/)
- [Recharts accessibility guidance](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)

### Good Points

- The React component model matches the existing component-oriented frontend.
- `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, and `Legend` cover the first BIG3 use case directly.
- Responsive chart support fits the existing vertically stacked mobile page.
- SVG elements and HTML tooltip/legend content are straightforward to style alongside Chakra UI containers.
- Multiple lines can be composed in one chart without building a custom rendering layer.
- Current documentation includes an accessibility layer for keyboard and screen-reader support and reduced-motion-aware animation behavior.
- The existing `ChartSeries` data can be adapted without changing analytics calculations.

### Concerns

- It adds runtime dependencies and measurable frontend bundle cost.
- The current installation guidance also calls for `react-is`, whose version must match the installed React version.
- Responsive SVG charts still need a stable parent height and mobile label strategy.
- Default chart accessibility should be verified with keyboard and screen-reader checks rather than assumed sufficient.
- A production build is required to confirm Pages Router, SSR/hydration, and tree-shaking behavior with the chosen version.

### Fit for Workout Journal

Recharts is a strong match for the current scaffold because chart rendering can remain inside a focused analytics component while Chakra UI continues to own layout, tabs, states, cards, and fallback tables.

### Fit for BIG3 Trend

High. Three estimated 1RM series, date axes, point tooltips, and a legend map directly to the existing `ChartSeries[]` output.

### Fit for Muscle Group Volume

High. Weekly set totals could use a line or bar chart. The number of muscle series may need filtering or selection to keep the view readable.

### Mobile Fit

Good when placed in a responsive container with explicit height, reduced axis ticks, a compact legend, and the existing range filter. Dense all-time data still needs point reduction or a shorter selected period.

## Candidate B: Chart.js + react-chartjs-2

Chart.js is a canvas-based chart engine. `react-chartjs-2` provides React components around it, including a `Line` component.

Official references:

- [react-chartjs-2 quickstart](https://react-chartjs-2.js.org/)
- [react-chartjs-2 Line component](https://react-chartjs-2.js.org/components/line/)
- [Chart.js responsive charts](https://www.chartjs.org/docs/latest/configuration/responsive.html)
- [Chart.js accessibility](https://www.chartjs.org/docs/latest/general/accessibility.html)
- [Chart.js bundler integration](https://www.chartjs.org/docs/latest/getting-started/integration.html)

### Good Points

- Mature line, bar, tooltip, legend, interaction, and axis configuration.
- Canvas rendering is effective for larger point counts.
- Responsive behavior is supported when the chart has an appropriately configured parent container.
- Chart.js supports tree shaking when required controllers, scales, elements, and plugins are registered explicitly.
- The React wrapper keeps most lifecycle integration out of application code.

### Concerns

- Requires both `chart.js` and `react-chartjs-2`.
- Required element and plugin registration adds setup and makes configuration errors easier to introduce.
- Canvas content is not inherently available to screen readers. Accessible names and equivalent fallback content must be supplied explicitly.
- Chakra UI styling does not directly style canvas internals; colors, fonts, tooltips, and legends are primarily configured through Chart.js options.
- Responsive canvas sizing requires a dedicated, correctly positioned parent container.

### Fit for Workout Journal

Good technically, but less natural than Recharts for a small React-first dashboard where existing cards and tables should remain accessible fallbacks.

### Fit for BIG3 Trend

High. Multi-dataset line charts, legends, and tooltips are mature, but adapting the series and registering the required Chart.js modules adds setup.

### Fit for Muscle Group Volume

High. Bar and line charts are well supported, including larger datasets.

### Mobile Fit

Good with deliberate container sizing and `maintainAspectRatio` configuration. Tooltip interaction and label density still need touch-device testing.

## Candidate C: Nivo

Nivo provides React data-visualization components built on D3, with SVG and Canvas implementations, responsive components, theming, legends, interactions, and extensive customization.

Official references:

- [Nivo overview](https://nivo.rocks/about/)
- [Nivo Line](https://nivo.rocks/line/)
- [Nivo theming](https://nivo.rocks/guides/theming/)

### Good Points

- Rich responsive line-chart functionality with axes, legends, tooltips, motion, and customization.
- Its line data shape is close to the existing `{ id, points: [{ x, y }] }` chart series.
- SVG and Canvas variants provide rendering choices.
- Theme configuration can align chart colors and typography with the application.
- Suitable for a broader analytics product with more complex chart requirements.

### Concerns

- Its feature surface and configuration model are broader than the initial BIG3 requirement.
- The dependency and transitive dependency impact should be expected to exceed a minimal handoff layer and must be measured locally.
- Theme integration is separate from Chakra UI and requires explicit mapping.
- Motion, tooltip, legend, and responsive behavior create more configuration choices to review.
- Package compatibility, SSR behavior, accessibility output, and mobile rendering must be verified with the exact selected Nivo package and version.

### Fit for Workout Journal

Capable but likely more than the first chart needs. It becomes more attractive if Analytics grows into a chart-heavy dashboard with multiple visualization types and deeper customization.

### Fit for BIG3 Trend

High. The line-series input model is a close conceptual match, but implementation and dependency cost are higher than necessary for one initial chart.

### Fit for Muscle Group Volume

High. Nivo supports appropriate line and bar visualizations with rich legends and theming.

### Mobile Fit

Good in responsive components, provided dimensions, legends, motion, and touch interactions are simplified for small screens.

## Candidate D: Dependency-Free Cards and Tables

Continue using the current BIG3 cards and muscle group table without adding a chart.

### Good Points

- No dependency, lockfile, bundle, SSR, or hydration risk.
- Current output is easy to read, test, and preserve as an accessible textual representation.
- Works reliably across mobile widths.
- Keeps implementation and maintenance cost low.

### Concerns

- Trends are slower to understand than in a line chart.
- Comparing squat, bench press, and deadlift over time requires scanning values instead of seeing shape and direction.
- The visual value of the existing `ChartSeries` preparation remains unrealized.

### Fit for Workout Journal

Excellent as a fallback and baseline, but insufficient as the only long-term analytics presentation.

### Fit for BIG3 Trend

Low for trend recognition, although strong for exact latest and personal-best values.

### Fit for Muscle Group Volume

Medium. Tables preserve exact weekly values but make pattern comparison harder.

### Mobile Fit

High. The existing layout already supports vertical cards and a horizontally scrollable table.

## Candidate E: Lightweight Custom SVG

Implement a focused React SVG line chart without adding a library.

### Good Points

- No third-party runtime dependency.
- Full control over markup, sizing, colors, and interaction.
- Could remain small if permanently limited to one simple line chart.
- SVG can coexist naturally with React and Chakra UI containers.

### Concerns

- Scales, axes, ticks, legends, tooltips, responsive sizing, touch targets, animation, and empty states become application-owned chart infrastructure.
- Keyboard behavior, screen-reader semantics, color-independent series identification, and reduced motion require deliberate implementation.
- Date formatting and collision handling become increasingly complex on mobile.
- Maintenance cost rises quickly when muscle group charts or exercise selectors are added.

### Fit for Workout Journal

Reasonable only for a deliberately tiny, static sparkline or prototype. It should not be the default choice for the first production multi-series chart.

### Fit for BIG3 Trend

Medium. Drawing three lines is straightforward; delivering a robust interactive chart is not.

### Fit for Muscle Group Volume

Low to medium because a growing number of muscle series introduces label, color, and interaction complexity.

### Mobile Fit

Potentially good, but all responsive and interaction behavior must be designed and tested locally.

## Comparison Table

| Candidate | Strength | Weakness | Fit for BIG3 line chart | Fit for muscle group volume | Mobile fit | Implementation cost | Dependency risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recharts | Declarative React/SVG components with responsive charts, tooltip, legend, axes, and accessibility support. | Adds dependencies and requires bundle, sizing, and compatibility checks. | High | High | Good | Low to medium | Medium | First candidate |
| Chart.js + react-chartjs-2 | Mature canvas engine, strong interactions, broad chart support, tree-shakeable modules. | Two packages, module registration, canvas accessibility work, option-driven styling. | High | High | Good | Medium | Medium | Strong alternative |
| Nivo | Rich D3-based components, responsive variants, theming, extensive chart features. | Broader feature and dependency surface than the first chart requires. | High | High | Good | Medium to high | Medium to high | Reconsider for a chart-heavy roadmap |
| Cards/tables only | No dependency risk, exact values, accessible baseline, already implemented. | Does not communicate trend shape efficiently. | Low | Medium | High | Low | Low | Keep as fallback |
| Custom SVG | Complete control and no package dependency. | Application owns chart math, interaction, accessibility, and maintenance. | Medium | Low to medium | Medium | High | Low package risk, high maintenance risk | Limit to small prototypes |

## Recommendation

Use **Recharts as the first candidate** for the initial production graph UI.

Reasons:

- Its declarative React components fit the current frontend architecture.
- Line charts, responsive sizing, tooltips, legends, and axes are available without creating a custom rendering system.
- Multiple BIG3 estimated 1RM series are a direct match for its composition model.
- Implementation cost is comparatively low for the required chart behavior.
- It can be introduced inside the existing `Big3SummarySection` or a focused sibling component while retaining current cards and tables.
- The current library-neutral `ChartSeries[]` can be adapted at the component boundary.

This is a provisional recommendation, not installation approval. Before adding Recharts, the implementation PR should verify:

1. Peer and runtime compatibility with the exact React, Next.js, and TypeScript versions in `frontend/package.json`.
2. The required `react-is` version and whether any additional package is necessary.
3. Production bundle impact using the frontend build output before and after installation.
4. Production build, SSR/hydration behavior, and Pages Router compatibility.
5. Responsive rendering at representative mobile and desktop widths.
6. Keyboard navigation, screen-reader naming, text alternatives, color contrast, and reduced motion.
7. Tooltip and legend behavior on touch devices.
8. Chakra UI theme coexistence without coupling analytics data to presentation colors.

The existing Google Fonts download warning is a separate build-environment concern. It should not be attributed to or bundled with the chart-library decision.

## Non-Goals

- Do not run `npm install` in this phase.
- Do not add Recharts or any other dependency in this phase.
- Do not implement or modify Analytics UI in this phase.
- Do not create a chart component in this phase.
- Do not change `package.json` or any `package-lock.json` in this phase.
- Do not change API, database, authentication, or backend behavior in this phase.

## Suggested Next Phase

### Phase M: BIG3 Chart UI Prototype

Recommended scope:

- Add Recharts in a small, isolated PR only after checking current peer dependencies.
- Implement only the BIG3 estimated 1RM line chart.
- Keep existing BIG3 cards as exact-value and accessibility fallback content.
- Keep the muscle group table unchanged until a later PR.
- Adapt `ChartSeries[]` at the chart component boundary rather than changing analytics utilities for Recharts.
- Test the 12-week default on narrow mobile and desktop viewports.
- Run frontend lint, frontend build, backend syntax check, and root tests.
- Record `package.json`, package-lock, and build-size differences explicitly in the completion report.
