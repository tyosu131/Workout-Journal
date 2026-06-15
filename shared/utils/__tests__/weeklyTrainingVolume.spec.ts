import {
  aggregateWeeklyTrainingVolume,
  getWeekStart,
} from "../weeklyTrainingVolume";
import type { NormalizedWorkoutSetWithMetrics } from "../trainingMetrics";

const createSet = (
  overrides: Partial<NormalizedWorkoutSetWithMetrics>
): NormalizedWorkoutSetWithMetrics => ({
  date: "2026-06-08",
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
  },
  ...overrides,
});

describe("getWeekStart", () => {
  it("returns Monday itself", () => {
    expect(getWeekStart("2026-06-08")).toBe("2026-06-08");
  });

  it("returns the same Monday for Tuesday", () => {
    expect(getWeekStart("2026-06-09")).toBe("2026-06-08");
  });

  it("returns the same Monday for Sunday", () => {
    expect(getWeekStart("2026-06-14")).toBe("2026-06-08");
  });

  it("returns next Monday itself", () => {
    expect(getWeekStart("2026-06-15")).toBe("2026-06-15");
  });

  it("returns null for invalid, null, or empty dates", () => {
    expect(getWeekStart("not-a-date")).toBeNull();
    expect(getWeekStart("2026-02-30")).toBeNull();
    expect(getWeekStart(null)).toBeNull();
    expect(getWeekStart("")).toBeNull();
    expect(getWeekStart("   ")).toBeNull();
  });
});

describe("aggregateWeeklyTrainingVolume", () => {
  it("groups by weekStart and exerciseName, sums volume, and counts sets", () => {
    expect(
      aggregateWeeklyTrainingVolume([
        createSet({ date: "2026-06-09", exerciseName: "Bench Press", metrics: { volumeLoad: 500, estimatedOneRepMax: 116.67 } }),
        createSet({ date: "2026-06-10", exerciseName: "Bench Press", metrics: { volumeLoad: 450, estimatedOneRepMax: 110 } }),
        createSet({ date: "2026-06-10", exerciseName: "Squat", metrics: { volumeLoad: 900, estimatedOneRepMax: 150 } }),
      ])
    ).toEqual([
      {
        weekStart: "2026-06-08",
        exerciseName: "Bench Press",
        totalSets: 2,
        totalVolumeLoad: 950,
        averageRpe: null,
        averageRir: null,
      },
      {
        weekStart: "2026-06-08",
        exerciseName: "Squat",
        totalSets: 1,
        totalVolumeLoad: 900,
        averageRpe: null,
        averageRir: null,
      },
    ]);
  });

  it("averages rpe and rir while ignoring null values", () => {
    expect(
      aggregateWeeklyTrainingVolume([
        createSet({ rpe: 8, rir: 2 }),
        createSet({ rpe: null, rir: 1 }),
        createSet({ rpe: 9, rir: null }),
      ])
    ).toEqual([
      {
        weekStart: "2026-06-08",
        exerciseName: "Bench Press",
        totalSets: 3,
        totalVolumeLoad: 1500,
        averageRpe: 8.5,
        averageRir: 1.5,
      },
    ]);
  });

  it("returns null averages when no rpe or rir values exist", () => {
    const rows = aggregateWeeklyTrainingVolume([
      createSet({ rpe: null, rir: null }),
      createSet({ rpe: null, rir: null }),
    ]);

    expect(rows[0]).toMatchObject({
      averageRpe: null,
      averageRir: null,
    });
  });

  it("excludes rows with invalid dates", () => {
    expect(
      aggregateWeeklyTrainingVolume([
        createSet({ date: "invalid-date" }),
        createSet({ date: null }),
        createSet({ date: "2026-06-08", exerciseName: "Deadlift" }),
      ])
    ).toEqual([
      {
        weekStart: "2026-06-08",
        exerciseName: "Deadlift",
        totalSets: 1,
        totalVolumeLoad: 500,
        averageRpe: null,
        averageRir: null,
      },
    ]);
  });

  it("sorts by weekStart ascending and then exerciseName ascending", () => {
    expect(
      aggregateWeeklyTrainingVolume([
        createSet({ date: "2026-06-15", exerciseName: "Squat" }),
        createSet({ date: "2026-06-08", exerciseName: "Deadlift" }),
        createSet({ date: "2026-06-08", exerciseName: "Bench Press" }),
      ]).map(({ weekStart, exerciseName }) => ({ weekStart, exerciseName }))
    ).toEqual([
      { weekStart: "2026-06-08", exerciseName: "Bench Press" },
      { weekStart: "2026-06-08", exerciseName: "Deadlift" },
      { weekStart: "2026-06-15", exerciseName: "Squat" },
    ]);
  });

  it("does not mutate input", () => {
    const input = [
      createSet({ date: "2026-06-08", exerciseName: "Bench Press", tags: ["push"] }),
    ];
    const original = JSON.stringify(input);

    aggregateWeeklyTrainingVolume(input);

    expect(JSON.stringify(input)).toBe(original);
  });
});
