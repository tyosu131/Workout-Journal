import { aggregateBig3Trend } from "../big3Trend";
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

describe("aggregateBig3Trend", () => {
  it("returns summaries for squat, bench, and deadlift", () => {
    expect(aggregateBig3Trend([]).map(({ liftType }) => liftType)).toEqual([
      "squat",
      "bench",
      "deadlift",
    ]);
  });

  it("maps Bench Press, Japanese, and Competition Bench names to bench", () => {
    const summaries = aggregateBig3Trend([
      createSet({ exerciseName: "Bench Press", date: "2026-06-10" }),
      createSet({ exerciseName: "ベンチプレス", date: "2026-06-11" }),
      createSet({ exerciseName: "Competition Bench", date: "2026-06-12" }),
    ]);
    const bench = summaries.find(({ liftType }) => liftType === "bench");

    expect(bench?.points.map(({ exerciseName }) => exerciseName)).toEqual([
      "Bench Press",
      "ベンチプレス",
      "Competition Bench",
    ]);
  });

  it("maps Squat and Japanese names to squat", () => {
    const squat = aggregateBig3Trend([
      createSet({ exerciseName: "Squat", date: "2026-06-10" }),
      createSet({ exerciseName: "スクワット", date: "2026-06-11" }),
    ]).find(({ liftType }) => liftType === "squat");

    expect(squat?.points).toHaveLength(2);
  });

  it("maps Deadlift and Japanese names to deadlift", () => {
    const deadlift = aggregateBig3Trend([
      createSet({ exerciseName: "Deadlift", date: "2026-06-10" }),
      createSet({ exerciseName: "デッドリフト", date: "2026-06-11" }),
    ]).find(({ liftType }) => liftType === "deadlift");

    expect(deadlift?.points).toHaveLength(2);
  });

  it("excludes non-BIG3 exercises", () => {
    const summaries = aggregateBig3Trend([
      createSet({ exerciseName: "Overhead Press" }),
      createSet({ exerciseName: "Romanian Deadlift" }),
    ]);

    expect(summaries.every(({ points }) => points.length === 0)).toBe(true);
  });

  it("excludes invalid, null, and empty date rows", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "not-a-date" }),
      createSet({ date: "2026-02-30" }),
      createSet({ date: null }),
      createSet({ date: "" }),
      createSet({ date: "2026-06-10" }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.points).toHaveLength(1);
  });

  it("excludes rows without positive finite estimated 1RM", () => {
    const bench = aggregateBig3Trend([
      createSet({ metrics: { estimatedOneRepMax: null } }),
      createSet({ metrics: { estimatedOneRepMax: 0 } }),
      createSet({ metrics: { estimatedOneRepMax: -1 } }),
      createSet({ metrics: { estimatedOneRepMax: Number.NaN } }),
      createSet({ metrics: { estimatedOneRepMax: Number.POSITIVE_INFINITY } }),
      createSet({ metrics: { estimatedOneRepMax: 120 } }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.points).toHaveLength(1);
    expect(bench?.points[0].estimatedOneRepMax).toBe(120);
  });

  it("keeps positive values and nulls invalid weight, reps, and volume", () => {
    const bench = aggregateBig3Trend([
      createSet({
        date: "2026-06-10",
        weight: 100,
        reps: 5,
        metrics: { estimatedOneRepMax: 116.67, volumeLoad: 500 },
      }),
      createSet({
        date: "2026-06-11",
        weight: -1,
        reps: Number.POSITIVE_INFINITY,
        metrics: { estimatedOneRepMax: 120, volumeLoad: 0 },
      }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.points[0]).toMatchObject({
      weight: 100,
      reps: 5,
      volumeLoad: 500,
    });
    expect(bench?.points[1]).toMatchObject({
      weight: null,
      reps: null,
      volumeLoad: null,
    });
  });

  it("sorts points by date ascending and then setIndex ascending", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "2026-06-12", setIndex: 2 }),
      createSet({ date: "2026-06-10", setIndex: 3 }),
      createSet({ date: "2026-06-10", setIndex: 1 }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.points.map(({ date, setIndex }) => ({ date, setIndex }))).toEqual([
      { date: "2026-06-10", setIndex: 1 },
      { date: "2026-06-10", setIndex: 3 },
      { date: "2026-06-12", setIndex: 2 },
    ]);
  });

  it("detects max estimated 1RM", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "2026-06-10", metrics: { estimatedOneRepMax: 120 } }),
      createSet({ date: "2026-06-12", metrics: { estimatedOneRepMax: 130 } }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.maxEstimatedOneRepMax).toMatchObject({
      date: "2026-06-12",
      estimatedOneRepMax: 130,
    });
  });

  it("tie breaks max estimated 1RM by earliest date then smaller setIndex", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "2026-06-12", setIndex: 0, metrics: { estimatedOneRepMax: 130 } }),
      createSet({ date: "2026-06-10", setIndex: 2, metrics: { estimatedOneRepMax: 130 } }),
      createSet({ date: "2026-06-10", setIndex: 1, metrics: { estimatedOneRepMax: 130 } }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.maxEstimatedOneRepMax).toMatchObject({
      date: "2026-06-10",
      setIndex: 1,
      estimatedOneRepMax: 130,
    });
  });

  it("detects latest top set from the most recent date", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "2026-06-10", metrics: { estimatedOneRepMax: 140 } }),
      createSet({ date: "2026-06-12", setIndex: 0, metrics: { estimatedOneRepMax: 120 } }),
      createSet({ date: "2026-06-12", setIndex: 1, metrics: { estimatedOneRepMax: 130 } }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.latestTopSet).toMatchObject({
      date: "2026-06-12",
      setIndex: 1,
      estimatedOneRepMax: 130,
    });
  });

  it("tie breaks latest top set by smaller setIndex", () => {
    const bench = aggregateBig3Trend([
      createSet({ date: "2026-06-12", setIndex: 2, metrics: { estimatedOneRepMax: 130 } }),
      createSet({ date: "2026-06-12", setIndex: 1, metrics: { estimatedOneRepMax: 130 } }),
    ]).find(({ liftType }) => liftType === "bench");

    expect(bench?.latestTopSet?.setIndex).toBe(1);
  });

  it("returns empty summaries for lifts with no data", () => {
    const summaries = aggregateBig3Trend([
      createSet({ exerciseName: "Bench Press" }),
    ]);
    const squat = summaries.find(({ liftType }) => liftType === "squat");
    const deadlift = summaries.find(({ liftType }) => liftType === "deadlift");

    expect(squat).toEqual({
      liftType: "squat",
      points: [],
      maxEstimatedOneRepMax: null,
      latestTopSet: null,
    });
    expect(deadlift).toEqual({
      liftType: "deadlift",
      points: [],
      maxEstimatedOneRepMax: null,
      latestTopSet: null,
    });
  });

  it("does not mutate input", () => {
    const input = [
      createSet({ exerciseName: "ベンチプレス", tags: ["push"] }),
    ];
    const original = JSON.stringify(input);

    aggregateBig3Trend(input);

    expect(JSON.stringify(input)).toBe(original);
  });
});
