import { findExercisePersonalRecords } from "../trainingPersonalRecords";
import type { NormalizedWorkoutSetWithMetrics } from "../trainingMetrics";

type SetOverrides = Partial<Omit<NormalizedWorkoutSetWithMetrics, "metrics">> & {
  metrics?: Partial<NormalizedWorkoutSetWithMetrics["metrics"]>;
};

const createSet = (overrides: SetOverrides = {}): NormalizedWorkoutSetWithMetrics => {
  const { metrics, ...rest } = overrides;

  return {
    date: "2026-06-10",
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

describe("findExercisePersonalRecords", () => {
  it("returns an empty array for empty input", () => {
    expect(findExercisePersonalRecords([])).toEqual([]);
  });

  it("groups by exerciseName", () => {
    expect(
      findExercisePersonalRecords([
        createSet({ exerciseName: "Squat", weight: 140, reps: 3, metrics: { volumeLoad: 420, estimatedOneRepMax: 154 } }),
        createSet({ exerciseName: "Bench Press", weight: 100, reps: 5 }),
      ]).map(({ exerciseName }) => exerciseName)
    ).toEqual(["Bench Press", "Squat"]);
  });

  it("detects max estimated 1RM", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-10", metrics: { estimatedOneRepMax: 116.67 } }),
      createSet({ date: "2026-06-12", metrics: { estimatedOneRepMax: 125 } }),
    ]);

    expect(records.maxEstimatedOneRepMax).toMatchObject({
      date: "2026-06-12",
      estimatedOneRepMax: 125,
    });
  });

  it("detects max weight", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-10", weight: 100 }),
      createSet({ date: "2026-06-12", weight: 102.5 }),
    ]);

    expect(records.maxWeight).toMatchObject({
      date: "2026-06-12",
      weight: 102.5,
    });
  });

  it("detects max reps", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-10", reps: 5 }),
      createSet({ date: "2026-06-12", reps: 8 }),
    ]);

    expect(records.maxReps).toMatchObject({
      date: "2026-06-12",
      reps: 8,
    });
  });

  it("detects max volume load", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-10", metrics: { volumeLoad: 500 } }),
      createSet({ date: "2026-06-12", metrics: { volumeLoad: 650 } }),
    ]);

    expect(records.maxVolumeLoad).toMatchObject({
      date: "2026-06-12",
      volumeLoad: 650,
    });
  });

  it("ignores empty exerciseName", () => {
    expect(
      findExercisePersonalRecords([
        createSet({ exerciseName: "" }),
        createSet({ exerciseName: "   " }),
      ])
    ).toEqual([]);
  });

  it("ignores invalid, null, or empty dates", () => {
    expect(
      findExercisePersonalRecords([
        createSet({ date: "not-a-date" }),
        createSet({ date: "2026-02-30" }),
        createSet({ date: null }),
        createSet({ date: "" }),
        createSet({ date: "2026-06-10", exerciseName: "Deadlift" }),
      ])
    ).toHaveLength(1);
    expect(
      findExercisePersonalRecords([
        createSet({ date: "not-a-date" }),
        createSet({ date: "2026-02-30" }),
        createSet({ date: null }),
        createSet({ date: "" }),
        createSet({ date: "2026-06-10", exerciseName: "Deadlift" }),
      ])[0].exerciseName
    ).toBe("Deadlift");
  });

  it("ignores null, non-finite, zero, and negative metric values", () => {
    const [records] = findExercisePersonalRecords([
      createSet({
        weight: 0,
        reps: -1,
        metrics: {
          volumeLoad: Number.NaN,
          estimatedOneRepMax: Number.POSITIVE_INFINITY,
        },
      }),
      createSet({
        date: "2026-06-12",
        weight: 110,
        reps: 4,
        metrics: {
          volumeLoad: 440,
          estimatedOneRepMax: 124.67,
        },
      }),
    ]);

    expect(records).toMatchObject({
      maxEstimatedOneRepMax: { date: "2026-06-12", estimatedOneRepMax: 124.67 },
      maxWeight: { date: "2026-06-12", weight: 110 },
      maxReps: { date: "2026-06-12", reps: 4 },
      maxVolumeLoad: { date: "2026-06-12", volumeLoad: 440 },
    });
  });

  it("tie breaks by earliest date", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-12", weight: 100 }),
      createSet({ date: "2026-06-10", weight: 100 }),
    ]);

    expect(records.maxWeight).toMatchObject({
      date: "2026-06-10",
      weight: 100,
    });
  });

  it("tie breaks by smaller setIndex when date is the same", () => {
    const [records] = findExercisePersonalRecords([
      createSet({ date: "2026-06-10", setIndex: 2, reps: 8 }),
      createSet({ date: "2026-06-10", setIndex: 1, reps: 8 }),
    ]);

    expect(records.maxReps).toMatchObject({
      date: "2026-06-10",
      setIndex: 1,
      reps: 8,
    });
  });

  it("sorts output by exerciseName ascending", () => {
    expect(
      findExercisePersonalRecords([
        createSet({ exerciseName: "Squat" }),
        createSet({ exerciseName: "Deadlift" }),
        createSet({ exerciseName: "Bench Press" }),
      ]).map(({ exerciseName }) => exerciseName)
    ).toEqual(["Bench Press", "Deadlift", "Squat"]);
  });

  it("does not mutate input", () => {
    const input = [
      createSet({ exerciseName: "Bench Press", tags: ["push"] }),
    ];
    const original = JSON.stringify(input);

    findExercisePersonalRecords(input);

    expect(JSON.stringify(input)).toBe(original);
  });
});
