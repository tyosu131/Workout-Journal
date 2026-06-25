import {
  buildRuleBasedWeeklySummary,
  type RuleBasedWeeklySummary,
} from "../ruleBasedWeeklySummary";
import type { WeeklySummaryInput } from "../weeklySummaryInput";

const buildInput = (overrides: Partial<WeeklySummaryInput> = {}): WeeklySummaryInput => ({
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  totalNotes: 3,
  totalSets: 12,
  big3: [
    {
      lift: "squat",
      latestEstimatedOneRepMax: 152.5,
      maxEstimatedOneRepMax: 155,
      trendPointCount: 2,
    },
    {
      lift: "bench",
      latestEstimatedOneRepMax: 122.5,
      maxEstimatedOneRepMax: 125,
      trendPointCount: 3,
    },
    {
      lift: "deadlift",
      latestEstimatedOneRepMax: 180,
      maxEstimatedOneRepMax: 180,
      trendPointCount: 1,
    },
  ],
  muscleGroups: [
    {
      muscle: "chest",
      totalSets: 10,
      totalVolumeLoad: 2400,
    },
    {
      muscle: "back",
      totalSets: 8,
      totalVolumeLoad: 2100,
    },
  ],
  effort: {
    totalSetCount: 12,
    effortLoggedSetCount: 8,
    rpeCount: 6,
    averageRpe: 8.25,
    rirCount: 4,
    averageRir: 1.5,
    failureCount: 2,
  },
  dataQualityNotes: [],
  ...overrides,
});

const expectNoUnsafeNumbers = (summary: RuleBasedWeeklySummary) => {
  const serialized = JSON.stringify(summary);

  expect(serialized).not.toContain("NaN");
  expect(serialized).not.toContain("Infinity");
};

describe("ruleBasedWeeklySummary", () => {
  describe("buildRuleBasedWeeklySummary", () => {
    it("builds deterministic summary content from full weekly summary input", () => {
      const summary = buildRuleBasedWeeklySummary(buildInput());

      expect(summary.headline).toBe("Weekly training summary");
      expect(summary.summary).toContain("3 workout notes produced 12 normalized sets");
      expect(summary.summary).toContain("Deadlift at 180 estimated 1RM");
      expect(summary.summary).toContain("effort was logged for 8 / 12 sets");
      expect(summary.summary).toContain("average RPE 8.25");
      expect(summary.summary).toContain("average RIR 1.5");
      expect(summary.highlights).toEqual([
        "Deadlift max estimated 1RM: 180.",
        "chest had the highest logged muscle volume: 10 sets, 2,400 volume load.",
        "Effort coverage: 8 / 12 sets logged RPE, RIR, or failure.",
      ]);
      expect(summary.concerns).toEqual([]);
      expect(summary.nextWeekFocus).toEqual([
        "Keep logging RPE/RIR for better effort tracking.",
        "Watch whether top lifts trend up or down next week.",
        "Review muscle group volume balance across the week.",
      ]);
      expect(summary.dataQualityNotes).toEqual([]);
    });

    it("returns a cautious no-data summary when no sets are available", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          totalNotes: 0,
          totalSets: 0,
          big3: [],
          muscleGroups: [],
          effort: {
            totalSetCount: 0,
            effortLoggedSetCount: 0,
            rpeCount: 0,
            averageRpe: null,
            rirCount: 0,
            averageRir: null,
            failureCount: 0,
          },
          dataQualityNotes: [
            "No workout notes found in this range.",
            "No normalized sets found in this range.",
            "No BIG3 trend data found in this range.",
            "No muscle group volume data found in this range.",
            "No effort data logged in this range.",
          ],
        })
      );

      expect(summary.headline).toBe("No training data in this range");
      expect(summary.summary).toContain("No normalized training sets were found");
      expect(summary.highlights).toEqual([]);
      expect(summary.concerns).toEqual([
        "No BIG3 trend data was available for this range.",
        "No muscle group volume data was available for this range.",
        "No effort data was logged, so intensity trends are unknown.",
      ]);
      expect(summary.nextWeekFocus).toEqual([
        "Log workouts consistently to unlock weekly summaries.",
      ]);
    });

    it("surfaces missing BIG3, muscle group, and effort data as concerns", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          big3: [
            {
              lift: "bench",
              latestEstimatedOneRepMax: null,
              maxEstimatedOneRepMax: null,
              trendPointCount: 0,
            },
          ],
          muscleGroups: [],
          effort: {
            totalSetCount: 12,
            effortLoggedSetCount: 0,
            rpeCount: 0,
            averageRpe: null,
            rirCount: 0,
            averageRir: null,
            failureCount: 0,
          },
          dataQualityNotes: [
            "No BIG3 trend data found in this range.",
            "No muscle group volume data found in this range.",
            "No effort data logged in this range.",
          ],
        })
      );

      expect(summary.concerns).toEqual([
        "No BIG3 trend data was available for this range.",
        "No muscle group volume data was available for this range.",
        "No effort data was logged, so intensity trends are unknown.",
      ]);
      expect(summary.summary).toContain("effort trends are unknown");
    });

    it("flags sparse effort data without treating missing values as low effort", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          effort: {
            totalSetCount: 12,
            effortLoggedSetCount: 2,
            rpeCount: 1,
            averageRpe: 9,
            rirCount: 1,
            averageRir: 1,
            failureCount: 1,
          },
          dataQualityNotes: ["Effort data is sparse in this range."],
        })
      );

      expect(summary.concerns).toContain(
        "Effort data is sparse, so intensity trends may be less reliable."
      );
      expect(summary.summary).toContain("effort was logged for 2 / 12 sets");
    });

    it("flags relatively frequent failure sets", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          effort: {
            totalSetCount: 12,
            effortLoggedSetCount: 10,
            rpeCount: 8,
            averageRpe: 9,
            rirCount: 5,
            averageRir: 0.5,
            failureCount: 4,
          },
        })
      );

      expect(summary.concerns).toContain(
        "Failure sets were relatively frequent: 4 / 12 sets were marked as failure."
      );
    });

    it("does not surface invalid numeric values", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          totalNotes: Number.NaN,
          totalSets: Number.POSITIVE_INFINITY,
          big3: [
            {
              lift: "bench",
              latestEstimatedOneRepMax: Number.NaN,
              maxEstimatedOneRepMax: Number.POSITIVE_INFINITY,
              trendPointCount: Number.NaN,
            },
          ],
          muscleGroups: [
            {
              muscle: "chest",
              totalSets: Number.POSITIVE_INFINITY,
              totalVolumeLoad: Number.NaN,
            },
          ],
          effort: {
            totalSetCount: Number.NaN,
            effortLoggedSetCount: Number.POSITIVE_INFINITY,
            rpeCount: Number.NaN,
            averageRpe: Number.NaN,
            rirCount: Number.POSITIVE_INFINITY,
            averageRir: Number.POSITIVE_INFINITY,
            failureCount: Number.NaN,
          },
        })
      );

      expect(summary.headline).toBe("No training data in this range");
      expectNoUnsafeNumbers(summary);
    });

    it("does not mutate input data", () => {
      const input = buildInput();
      const original = JSON.parse(JSON.stringify(input));

      buildRuleBasedWeeklySummary(input);

      expect(input).toEqual(original);
    });

    it("uses deterministic tie-breaks for top BIG3 and muscle highlights", () => {
      const summary = buildRuleBasedWeeklySummary(
        buildInput({
          big3: [
            {
              lift: "deadlift",
              latestEstimatedOneRepMax: 200,
              maxEstimatedOneRepMax: 200,
              trendPointCount: 2,
            },
            {
              lift: "bench",
              latestEstimatedOneRepMax: 200,
              maxEstimatedOneRepMax: 200,
              trendPointCount: 2,
            },
          ],
          muscleGroups: [
            {
              muscle: "chest",
              totalSets: 10,
              totalVolumeLoad: 2000,
            },
            {
              muscle: "back",
              totalSets: 10,
              totalVolumeLoad: 2100,
            },
          ],
        })
      );

      expect(summary.highlights[0]).toBe("Bench Press max estimated 1RM: 200.");
      expect(summary.highlights[1]).toBe(
        "back had the highest logged muscle volume: 10 sets, 2,100 volume load."
      );
    });
  });
});
