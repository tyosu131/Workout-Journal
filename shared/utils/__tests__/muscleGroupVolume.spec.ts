import { aggregateWeeklyMuscleGroupVolume } from "../muscleGroupVolume";
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

describe("aggregateWeeklyMuscleGroupVolume", () => {
  it("returns an empty array for empty input", () => {
    expect(aggregateWeeklyMuscleGroupVolume([])).toEqual([]);
  });

  it("groups by weekStart and muscle", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ date: "2026-06-23" }),
      createSet({ date: "2026-06-30" }),
    ]);

    expect(rows.filter(({ muscle }) => muscle === "chest")).toEqual([
      {
        weekStart: "2026-06-22",
        muscle: "chest",
        totalSets: 1,
        totalVolumeLoad: 500,
        exercises: ["Bench Press"],
      },
      {
        weekStart: "2026-06-29",
        muscle: "chest",
        totalSets: 1,
        totalVolumeLoad: 500,
        exercises: ["Bench Press"],
      },
    ]);
  });

  it("counts one set for each primary muscle", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([createSet()]);

    expect(rows.map(({ muscle, totalSets }) => ({ muscle, totalSets }))).toEqual([
      { muscle: "chest", totalSets: 1 },
      { muscle: "front_delts", totalSets: 1 },
      { muscle: "triceps", totalSets: 1 },
    ]);
  });

  it("sums positive volume load", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ metrics: { volumeLoad: 500 } }),
      createSet({ setIndex: 1, metrics: { volumeLoad: 612.5 } }),
    ]);
    const chest = rows.find(({ muscle }) => muscle === "chest");

    expect(chest).toMatchObject({
      totalSets: 2,
      totalVolumeLoad: 1112.5,
    });
  });

  it("ignores invalid volume values but still counts their sets", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ metrics: { volumeLoad: null } }),
      createSet({ setIndex: 1, metrics: { volumeLoad: Number.NaN } }),
      createSet({ setIndex: 2, metrics: { volumeLoad: Number.POSITIVE_INFINITY } }),
      createSet({ setIndex: 3, metrics: { volumeLoad: 0 } }),
      createSet({ setIndex: 4, metrics: { volumeLoad: -100 } }),
    ]);
    const chest = rows.find(({ muscle }) => muscle === "chest");

    expect(chest).toMatchObject({
      totalSets: 5,
      totalVolumeLoad: 0,
    });
  });

  it("excludes unmatched exercise names", () => {
    expect(
      aggregateWeeklyMuscleGroupVolume([
        createSet({ exerciseName: "Cable Fly" }),
      ])
    ).toEqual([]);
  });

  it("excludes invalid, null, and empty date rows", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ date: "not-a-date" }),
      createSet({ date: "2026-02-30" }),
      createSet({ date: null }),
      createSet({ date: "" }),
      createSet({ date: "2026-06-23" }),
    ]);

    expect(rows.every(({ totalSets }) => totalSets === 1)).toBe(true);
  });

  it("keeps unique sorted canonical exercise names", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ exerciseName: "Bench Press" }),
      createSet({ exerciseName: "ベンチプレス", setIndex: 1 }),
      createSet({ exerciseName: "Dumbbell Press", setIndex: 2 }),
    ]);
    const chest = rows.find(({ muscle }) => muscle === "chest");

    expect(chest?.exercises).toEqual(["Bench Press", "Dumbbell Press"]);
  });

  it("sorts output by weekStart ascending and then muscle ascending", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ date: "2026-06-30", exerciseName: "Squat" }),
      createSet({ date: "2026-06-23", exerciseName: "Bench Press" }),
    ]);

    expect(rows.map(({ weekStart, muscle }) => ({ weekStart, muscle }))).toEqual([
      { weekStart: "2026-06-22", muscle: "chest" },
      { weekStart: "2026-06-22", muscle: "front_delts" },
      { weekStart: "2026-06-22", muscle: "triceps" },
      { weekStart: "2026-06-29", muscle: "glutes" },
      { weekStart: "2026-06-29", muscle: "quads" },
    ]);
  });

  it("handles Japanese aliases through metadata", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([
      createSet({ exerciseName: "スクワット" }),
    ]);

    expect(rows).toEqual([
      {
        weekStart: "2026-06-22",
        muscle: "glutes",
        totalSets: 1,
        totalVolumeLoad: 500,
        exercises: ["Squat"],
      },
      {
        weekStart: "2026-06-22",
        muscle: "quads",
        totalSets: 1,
        totalVolumeLoad: 500,
        exercises: ["Squat"],
      },
    ]);
  });

  it("does not use secondary muscles", () => {
    const rows = aggregateWeeklyMuscleGroupVolume([createSet()]);

    expect(rows.some(({ muscle }) => muscle === "shoulders")).toBe(false);
  });

  it("does not mutate input", () => {
    const input = [
      createSet({ exerciseName: "ベンチプレス", tags: ["push"] }),
    ];
    const original = JSON.stringify(input);

    aggregateWeeklyMuscleGroupVolume(input);

    expect(JSON.stringify(input)).toBe(original);
  });
});
