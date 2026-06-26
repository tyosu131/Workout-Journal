import type {
  Big3LiftType,
  Big3TrendPoint,
  Big3TrendSummary,
} from "../big3Trend";
import type { EffortAnalyticsSummary } from "../effortAnalytics";
import type { WeeklyMuscleGroupVolumeRow } from "../muscleGroupVolume";
import { buildWeeklySummaryInput } from "../weeklySummaryInput";

const makePoint = (
  liftType: Big3LiftType,
  estimatedOneRepMax: number | null,
  date = "2026-06-01"
): Big3TrendPoint => ({
  date,
  liftType,
  exerciseName: liftType === "bench" ? "Bench Press" : liftType,
  setIndex: 0,
  weight: 100,
  reps: 5,
  estimatedOneRepMax,
  volumeLoad: 500,
});

const makeSummary = (
  liftType: Big3LiftType,
  estimatedValues: Array<number | null>
): Big3TrendSummary => {
  const points = estimatedValues.map((value, index) => (
    makePoint(liftType, value, `2026-06-${String(index + 1).padStart(2, "0")}`)
  ));
  const validPoints = points.filter((point) => (
    typeof point.estimatedOneRepMax === "number" &&
    Number.isFinite(point.estimatedOneRepMax) &&
    point.estimatedOneRepMax > 0
  ));

  return {
    liftType,
    points,
    latestTopSet: validPoints.at(-1) ?? null,
    maxEstimatedOneRepMax: validPoints.reduce<Big3TrendPoint | null>((best, point) => {
      if (!best || (point.estimatedOneRepMax ?? 0) > (best.estimatedOneRepMax ?? 0)) {
        return point;
      }
      return best;
    }, null),
  };
};

const effortSummary: EffortAnalyticsSummary = {
  totalSetCount: 10,
  effortLoggedSetCount: 5,
  rpeCount: 4,
  averageRpe: 8.25,
  rirCount: 3,
  averageRir: 1.5,
  failureCount: 2,
};

const buildInput = (overrides: Partial<Parameters<typeof buildWeeklySummaryInput>[0]> = {}) => (
  buildWeeklySummaryInput({
    rangeStart: "2026-06-01",
    rangeEnd: "2026-06-07",
    totalNotes: 3,
    normalizedSets: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    big3Summaries: [
      makeSummary("squat", [150, 155]),
      makeSummary("bench", [100, 102.5]),
      makeSummary("deadlift", [180]),
    ],
    muscleRows: [
      {
        weekStart: "2026-06-01",
        muscle: "chest",
        totalSets: 4,
        totalVolumeLoad: 1200,
        exercises: ["Bench Press"],
      },
      {
        weekStart: "2026-06-01",
        muscle: "back",
        totalSets: 6,
        totalVolumeLoad: 1800,
        exercises: ["Barbell Row"],
      },
      {
        weekStart: "2026-06-08",
        muscle: "chest",
        totalSets: 3,
        totalVolumeLoad: 900,
        exercises: ["Dumbbell Press"],
      },
    ],
    effortSummary,
    ...overrides,
  })
);

describe("weeklySummaryInput", () => {
  describe("buildWeeklySummaryInput", () => {
    it("builds deterministic aggregate summary input from full data", () => {
      const input = buildInput();

      expect(input).toEqual({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        totalNotes: 3,
        totalSets: 10,
        big3: [
          {
            lift: "squat",
            latestEstimatedOneRepMax: 155,
            maxEstimatedOneRepMax: 155,
            trendPointCount: 2,
          },
          {
            lift: "bench",
            latestEstimatedOneRepMax: 102.5,
            maxEstimatedOneRepMax: 102.5,
            trendPointCount: 2,
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
            totalSets: 7,
            totalVolumeLoad: 2100,
          },
          {
            muscle: "back",
            totalSets: 6,
            totalVolumeLoad: 1800,
          },
        ],
        effort: effortSummary,
        growthSignals: expect.objectContaining({
          rangeStart: "2026-06-01",
          rangeEnd: "2026-06-07",
          signals: expect.any(Array),
          dataQualityNotes: [],
        }),
        dataQualityNotes: [],
      });
    });

    it("includes Growth Signals in fixed order", () => {
      const input = buildInput();

      expect(input.growthSignals.signals).toHaveLength(5);
      expect(input.growthSignals.signals.map((signal) => signal.id)).toEqual([
        "strength",
        "volume",
        "consistency",
        "effort",
        "exercise_progress",
      ]);
    });

    it("includes unknown Growth Signals when no data is available", () => {
      const input = buildInput({
        totalNotes: 0,
        normalizedSets: [],
        big3Summaries: [],
        muscleRows: [],
        effortSummary: {
          totalSetCount: 0,
          effortLoggedSetCount: 0,
          rpeCount: 0,
          averageRpe: null,
          rirCount: 0,
          averageRir: null,
          failureCount: 0,
        },
      });

      expect(input.growthSignals.signals.map((signal) => signal.status)).toEqual([
        "unknown",
        "unknown",
        "unknown",
        "unknown",
        "unknown",
      ]);
      expect(input.growthSignals.dataQualityNotes).toEqual([
        "No workout notes found in this range.",
        "No normalized sets found in this range.",
        "No BIG3 trend data found in this range.",
        "No muscle group volume data found in this range.",
        "No effort data logged in this range.",
      ]);
    });

    it("passes data quality notes into Growth Signals", () => {
      const input = buildInput({
        effortSummary: {
          ...effortSummary,
          totalSetCount: 10,
          effortLoggedSetCount: 2,
        },
      });

      expect(input.dataQualityNotes).toContain("Effort data is sparse in this range.");
      expect(input.growthSignals.dataQualityNotes).toContain(
        "Effort data is sparse in this range."
      );
    });

    it("adds a data quality note when no notes are present", () => {
      expect(buildInput({ totalNotes: 0 }).dataQualityNotes).toContain(
        "No workout notes found in this range."
      );
    });

    it("adds a data quality note when no normalized sets are present", () => {
      expect(buildInput({ normalizedSets: [] }).dataQualityNotes).toContain(
        "No normalized sets found in this range."
      );
    });

    it("adds a data quality note when no BIG3 trend points are present", () => {
      expect(
        buildInput({
          big3Summaries: [
            makeSummary("squat", []),
            makeSummary("bench", []),
            makeSummary("deadlift", []),
          ],
        }).dataQualityNotes
      ).toContain("No BIG3 trend data found in this range.");
    });

    it("adds a data quality note when no muscle group rows are present", () => {
      expect(buildInput({ muscleRows: [] }).dataQualityNotes).toContain(
        "No muscle group volume data found in this range."
      );
    });

    it("adds a data quality note when no effort data is logged", () => {
      expect(
        buildInput({
          effortSummary: {
            totalSetCount: 10,
            effortLoggedSetCount: 0,
            rpeCount: 0,
            averageRpe: null,
            rirCount: 0,
            averageRir: null,
            failureCount: 0,
          },
        }).dataQualityNotes
      ).toContain("No effort data logged in this range.");
    });

    it("adds a data quality note when effort data is sparse", () => {
      expect(
        buildInput({
          effortSummary: {
            ...effortSummary,
            totalSetCount: 10,
            effortLoggedSetCount: 2,
          },
        }).dataQualityNotes
      ).toContain("Effort data is sparse in this range.");
    });

    it("does not surface invalid numeric values as finite numbers", () => {
      const input = buildInput({
        totalNotes: Number.NaN,
        big3Summaries: [
          {
            liftType: "bench",
            points: [
              makePoint("bench", Number.NaN),
              makePoint("bench", Number.POSITIVE_INFINITY),
              makePoint("bench", -100),
            ],
            latestTopSet: makePoint("bench", Number.NaN),
            maxEstimatedOneRepMax: makePoint("bench", Number.POSITIVE_INFINITY),
          },
        ],
        muscleRows: [
          {
            weekStart: "2026-06-01",
            muscle: "chest",
            totalSets: Number.NaN,
            totalVolumeLoad: Number.POSITIVE_INFINITY,
            exercises: [],
          },
        ],
        effortSummary: {
          totalSetCount: Number.NaN,
          effortLoggedSetCount: Number.POSITIVE_INFINITY,
          rpeCount: -1,
          averageRpe: Number.NaN,
          rirCount: 1,
          averageRir: Number.POSITIVE_INFINITY,
          failureCount: -1,
        },
      });

      expect(input.totalNotes).toBe(0);
      expect(input.big3).toEqual([
        {
          lift: "bench",
          latestEstimatedOneRepMax: null,
          maxEstimatedOneRepMax: null,
          trendPointCount: 0,
        },
      ]);
      expect(input.muscleGroups).toEqual([]);
      expect(input.effort).toEqual({
        totalSetCount: 0,
        effortLoggedSetCount: 0,
        rpeCount: 0,
        averageRpe: null,
        rirCount: 1,
        averageRir: null,
        failureCount: 0,
      });
    });

    it("does not mutate input data", () => {
      const args = {
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        totalNotes: 1,
        normalizedSets: [{ id: "set-1" }],
        big3Summaries: [makeSummary("bench", [100])],
        muscleRows: [
          {
            weekStart: "2026-06-01",
            muscle: "chest",
            totalSets: 3,
            totalVolumeLoad: 900,
            exercises: ["Bench Press"],
          },
        ],
        effortSummary,
      };
      const original = JSON.parse(JSON.stringify(args));

      buildWeeklySummaryInput(args);

      expect(args).toEqual(original);
    });

    it("sorts muscle groups by total sets desc and muscle asc", () => {
      const input = buildInput({
        muscleRows: [
          {
            weekStart: "2026-06-01",
            muscle: "chest",
            totalSets: 5,
            totalVolumeLoad: 1000,
            exercises: [],
          },
          {
            weekStart: "2026-06-01",
            muscle: "back",
            totalSets: 5,
            totalVolumeLoad: 1100,
            exercises: [],
          },
          {
            weekStart: "2026-06-01",
            muscle: "quads",
            totalSets: 8,
            totalVolumeLoad: 1500,
            exercises: [],
          },
        ],
      });

      expect(input.muscleGroups.map((row) => row.muscle)).toEqual([
        "quads",
        "back",
        "chest",
      ]);
    });
  });
});
