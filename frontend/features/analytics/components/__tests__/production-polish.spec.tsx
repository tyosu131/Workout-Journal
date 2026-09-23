/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GrowthSignalsSummary } from "../../../../../shared/utils/growthSignals";
import type { RuleBasedWeeklySummary } from "../../../../../shared/utils/ruleBasedWeeklySummary";
import { DETAILED_TREND_EMPTY_HEADING } from "../../analyticsCopy";

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  const element = (tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children);
  return {
    Badge: element("span"), Box: element("div"), Flex: element("div"), Heading: element("h2"),
    List: element("ul"), ListItem: element("li"), SimpleGrid: element("div"), Stack: element("div"),
    Text: element("p"),
  };
});

const WeeklySummaryPreviewSection = require("../WeeklySummaryPreviewSection").default;
const GrowthSignalsSection = require("../GrowthSignalsSection").default;

describe("Analytics production surfaces", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps the rule-based weekly summary and removes mock generation UI", async () => {
    const summary: RuleBasedWeeklySummary = {
      headline: "Your training week",
      summary: "A deterministic summary.",
      highlights: ["Logged work"], concerns: [], nextWeekFocus: [], dataQualityNotes: [],
    };
    await act(async () => root.render(React.createElement(WeeklySummaryPreviewSection, {
      summary, rangeStart: "2026-09-01", rangeEnd: "2026-09-07",
    })));

    expect(container.textContent).toContain("A deterministic summary.");
    expect(container.textContent).toContain("Rule-based");
    expect(container.textContent).not.toContain("Generate AI summary");
    expect(container.textContent).not.toContain("mocked backend endpoint");
    expect(container.textContent).not.toContain("Generated endpoint response");
  });

  it("describes missing detailed trends without denying all analytics", () => {
    expect(DETAILED_TREND_EMPTY_HEADING).toBe("No detailed trend data yet");
    expect(DETAILED_TREND_EMPTY_HEADING).not.toBe("No analytics data yet");
  });

  it("hides exercise progress while preserving implemented Growth Signals", async () => {
    const signal = (id: string, label: string) => ({
      id, label, status: "neutral" as const, headline: `${label} data`, detail: `${label} detail`,
      evidence: [`${label} evidence`], nextFocus: null,
    });
    const summary: GrowthSignalsSummary = {
      rangeStart: "2026-09-01", rangeEnd: "2026-09-07", dataQualityNotes: [],
      signals: [signal("strength", "Strength"), signal("volume", "Volume"),
        signal("consistency", "Consistency"), signal("effort", "Effort"),
        signal("exercise_progress", "Exercise Progress")],
    };
    await act(async () => root.render(React.createElement(GrowthSignalsSection, { summary })));

    expect(container.textContent).toContain("Strength");
    expect(container.textContent).toContain("Volume");
    expect(container.textContent).toContain("Consistency");
    expect(container.textContent).toContain("Effort");
    expect(container.textContent).not.toContain("Exercise Progress");
  });
});
