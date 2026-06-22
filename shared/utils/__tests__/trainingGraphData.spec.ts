import type { Big3TrendSummary } from "../big3Trend";
import type { WeeklyMuscleGroupVolumeRow } from "../muscleGroupVolume";
import {
  toBig3EstimatedOneRepMaxSeries,
  toExerciseMetricSeries,
  toMuscleGroupVolumeSeries,
} from "../trainingGraphData";
import type { NormalizedWorkoutSetWithMetrics } from "../trainingMetrics";

type SetOverrides = Partial<Omit<NormalizedWorkoutSetWithMetrics, "metrics">> & {
  metrics?: Partial<NormalizedWorkoutSetWithMetrics["metrics"]>;
};

const createSet = (overrides: SetOverrides = {}): NormalizedWorkoutSetWithMetrics => {
  const { metrics, ...rest } = overrides;

  return {
    date: "2026-06-23",
    userId: "user-1",
    exerciseName: "Bench Press",
    exerciseNote: null,
    setIndex: 0,
    weight: 100,
    reps: 5,
    restSeconds: 180,
    rpe: null,
    rir: null,
    failure: null,
    tags: [],
    metrics: {
      volumeLoad: 500,
      estimatedOneRepMax: 116.67,
      ...metrics,
    },
    ...rest,
  };
};

const createBig3Summaries = (): Big3TrendSummary[] => [
  {
    liftType: "squat",
    points: [],
    maxEstimatedOneRepMax: null,
    latestTopSet: null,
  },
  {
    liftType: "bench",
    points: [
      {
        date: "2026-06-12",
        liftType: "bench",
        exerciseName: "Competition Bench",
        setIndex: 0,
        weight: 105,
        reps: 3,
        estimatedOneRepMax: 115.5,
        volumeLoad: 315,
      },
      {
        date: "2026-06-10",
        liftType: "bench",
        exerciseName: "Bench Press",
        setIndex: 0,
        weight: 100,
        reps: 5,
        estimatedOneRepMax: 116.67,
        volumeLoad: 500,
      },
    ],
    maxEstimatedOneRepMax: null,
    latestTopSet: null,
  },
  {
    liftType: "deadlift",
    points: [],
    maxEstimatedOneRepMax: null,
    latestTopSet: null,
  },
];

describe("toBig3EstimatedOneRepMaxSeries", () => {
  it("returns squat, bench, and deadlift series including empty series", () => {
    const series = toBig3EstimatedOneRepMaxSeries(createBig3Summaries());

    expect(series.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "squat", label: "Squat" },
      { id: "bench", label: "Bench Press" },
      { id: "deadlift", label: "Deadlift" },
    ]);
    expect(series[0].points).toEqual([]);
    expect(series[2].points).toEqual([]);
  });

  it("converts e1RM points and sorts them by x", () => {
    const bench = toBig3EstimatedOneRepMaxSeries(createBig3Summaries())[1];

    expect(bench.points).toEqual([
      { x: "2026-06-10", y: 116.67, label: "Bench Press" },
      { x: "2026-06-12", y: 115.5, label: "Competition Bench" },
    ]);
  });

  it("excludes invalid e1RM values", () => {
    const summaries = createBig3Summaries();
    summaries[1].points.push(
      { ...summaries[1].points[0], estimatedOneRepMax: null },
      { ...summaries[1].points[0], estimatedOneRepMax: 0 },
      { ...summaries[1].points[0], estimatedOneRepMax: Number.NaN },
      { ...summaries[1].points[0], estimatedOneRepMax: Number.POSITIVE_INFINITY }
    );

    expect(toBig3EstimatedOneRepMaxSeries(summaries)[1].points).toHaveLength(2);
  });
});

describe("toMuscleGroupVolumeSeries", () => {
  const rows: WeeklyMuscleGroupVolumeRow[] = [
    {
      weekStart: "2026-06-29",
      muscle: "chest",
      totalSets: 4,
      totalVolumeLoad: 2000,
      exercises: ["Bench Press"],
    },
    {
      weekStart: "2026-06-22",
      muscle: "chest",
      totalSets: 3,
      totalVolumeLoad: 1500,
      exercises: ["Bench Press"],
    },
    {
      weekStart: "2026-06-22",
      muscle: "back",
      totalSets: 5,
      totalVolumeLoad: 2400,
      exercises: ["Barbell Row"],
    },
  ];

  it("groups by muscle, uses totalSets by default, and sorts series and points", () => {
    expect(toMuscleGroupVolumeSeries(rows)).toEqual([
      {
        id: "back",
        label: "back",
        points: [{ x: "2026-06-22", y: 5 }],
      },
      {
        id: "chest",
        label: "chest",
        points: [
          { x: "2026-06-22", y: 3 },
          { x: "2026-06-29", y: 4 },
        ],
      },
    ]);
  });

  it("supports totalVolumeLoad", () => {
    const chest = toMuscleGroupVolumeSeries(rows, "totalVolumeLoad")
      .find(({ id }) => id === "chest");

    expect(chest?.points).toEqual([
      { x: "2026-06-22", y: 1500 },
      { x: "2026-06-29", y: 2000 },
    ]);
  });

  it("allows zero and excludes invalid numeric values", () => {
    const invalidRows: WeeklyMuscleGroupVolumeRow[] = [
      { ...rows[0], weekStart: "2026-06-01", totalSets: 0 },
      { ...rows[0], weekStart: "2026-06-08", totalSets: -1 },
      { ...rows[0], weekStart: "2026-06-15", totalSets: Number.NaN },
      { ...rows[0], weekStart: "2026-06-22", totalSets: Number.POSITIVE_INFINITY },
    ];

    expect(toMuscleGroupVolumeSeries(invalidRows)[0].points).toEqual([
      { x: "2026-06-01", y: 0 },
    ]);
  });
});

describe("toExerciseMetricSeries", () => {
  it("filters by exact exerciseName", () => {
    const series = toExerciseMetricSeries([
      createSet({ exerciseName: "Bench Press" }),
      createSet({ exerciseName: "bench press", metrics: { estimatedOneRepMax: 120 } }),
      createSet({ exerciseName: "Squat", metrics: { estimatedOneRepMax: 150 } }),
    ], "Bench Press", "estimatedOneRepMax");

    expect(series.points).toEqual([{ x: "2026-06-23", y: 116.67 }]);
  });

  it.each([
    ["estimatedOneRepMax", 116.67],
    ["volumeLoad", 500],
    ["weight", 100],
    ["reps", 5],
  ] as const)("supports the %s metric", (metric, expected) => {
    const series = toExerciseMetricSeries([createSet()], "Bench Press", metric);

    expect(series.points).toEqual([{ x: "2026-06-23", y: expected }]);
  });

  it("excludes invalid dates", () => {
    const series = toExerciseMetricSeries([
      createSet({ date: "not-a-date" }),
      createSet({ date: "2026-02-30" }),
      createSet({ date: null }),
      createSet({ date: "" }),
      createSet({ date: "2026-06-23" }),
    ], "Bench Press", "weight");

    expect(series.points).toHaveLength(1);
  });

  it("excludes invalid numeric values", () => {
    const series = toExerciseMetricSeries([
      createSet({ weight: null }),
      createSet({ weight: 0 }),
      createSet({ weight: -1 }),
      createSet({ weight: Number.NaN }),
      createSet({ weight: Number.POSITIVE_INFINITY }),
      createSet({ weight: 100 }),
    ], "Bench Press", "weight");

    expect(series.points).toEqual([{ x: "2026-06-23", y: 100 }]);
  });

  it("sorts by date and then setIndex", () => {
    const series = toExerciseMetricSeries([
      createSet({ date: "2026-06-25", setIndex: 0, weight: 105 }),
      createSet({ date: "2026-06-23", setIndex: 2, weight: 102.5 }),
      createSet({ date: "2026-06-23", setIndex: 1, weight: 100 }),
    ], "Bench Press", "weight");

    expect(series.points).toEqual([
      { x: "2026-06-23", y: 100 },
      { x: "2026-06-23", y: 102.5 },
      { x: "2026-06-25", y: 105 },
    ]);
  });

  it("returns empty points when no exercise matches", () => {
    expect(
      toExerciseMetricSeries([createSet()], "Squat", "weight")
    ).toEqual({
      id: "Squat:weight",
      label: "Squat weight",
      points: [],
    });
  });

  it("creates a safely encoded series id", () => {
    expect(
      toExerciseMetricSeries([], "Bench Press", "weight").id
    ).toBe("Bench%20Press:weight");
  });

  it("does not mutate input", () => {
    const input = [createSet({ tags: ["push"] })];
    const original = JSON.stringify(input);

    toExerciseMetricSeries(input, "Bench Press", "estimatedOneRepMax");

    expect(JSON.stringify(input)).toBe(original);
  });
});
