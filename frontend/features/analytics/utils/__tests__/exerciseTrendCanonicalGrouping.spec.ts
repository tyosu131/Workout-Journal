/// <reference types="jest" />

import type { NormalizedWorkoutSetWithMetrics } from "../../../../../shared/utils/trainingMetrics";
import type { ExerciseMetric } from "../../../../../shared/utils/trainingGraphData";
import {
  buildCanonicalExerciseTrendGroups,
  type CanonicalExerciseTrendGroup,
  toCanonicalExerciseMetricSeries,
} from "../exerciseTrendCanonicalGrouping";

const makeSet = (
  overrides: Partial<NormalizedWorkoutSetWithMetrics> = {}
): NormalizedWorkoutSetWithMetrics => ({
  date: "2026-06-01",
  exerciseName: "Bench Press",
  exerciseNote: null,
  failure: null,
  metrics: {
    estimatedOneRepMax: 116.67,
    volumeLoad: 500,
    ...(overrides.metrics ?? {}),
  },
  reps: 5,
  restSeconds: null,
  rir: null,
  rpe: null,
  setIndex: 0,
  tags: [],
  userId: "user-1",
  weight: 100,
  ...overrides,
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("buildCanonicalExerciseTrendGroups", () => {
  it("returns an empty array for empty or non-array input", () => {
    expect(buildCanonicalExerciseTrendGroups([])).toEqual([]);
    expect(
      buildCanonicalExerciseTrendGroups(undefined as unknown as NormalizedWorkoutSetWithMetrics[])
    ).toEqual([]);
  });

  it("excludes empty exercise names", () => {
    const groups = buildCanonicalExerciseTrendGroups([
      makeSet({ exerciseName: "" }),
      makeSet({ exerciseName: "   " }),
    ]);

    expect(groups).toEqual([]);
  });

  it("groups known bench aliases under Bench Press", () => {
    const groups = buildCanonicalExerciseTrendGroups([
      makeSet({ exerciseName: "Bench Press" }),
      makeSet({ exerciseName: "bench press" }),
      makeSet({ exerciseName: "ベンチプレス" }),
      makeSet({ exerciseName: "Paused Bench Press" }),
      makeSet({ exerciseName: "Competition Bench" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      canonicalName: "Bench Press",
      groupName: "Bench Press",
      isMetadataMatched: true,
      rawExerciseNames: [
        "Bench Press",
        "bench press",
        "ベンチプレス",
        "Paused Bench Press",
        "Competition Bench",
      ].sort((a, b) => a.localeCompare(b)),
      setCount: 5,
    });
  });

  it("keeps unmatched exercises as trimmed raw-name groups", () => {
    const groups = buildCanonicalExerciseTrendGroups([
      makeSet({ exerciseName: "  Cable Fly  " }),
    ]);

    expect(groups).toEqual([{
      canonicalName: null,
      groupName: "Cable Fly",
      isMetadataMatched: false,
      rawExerciseNames: ["Cable Fly"],
      setCount: 1,
    }]);
  });

  it("keeps unique sorted raw names and sums set counts by group", () => {
    const groups = buildCanonicalExerciseTrendGroups([
      makeSet({ exerciseName: "Bench Press" }),
      makeSet({ exerciseName: "bench press" }),
      makeSet({ exerciseName: "bench press" }),
      makeSet({ exerciseName: "  Cable Fly  " }),
      makeSet({ exerciseName: "Cable Fly" }),
    ]);

    expect(groups).toEqual([
      {
        canonicalName: "Bench Press",
        groupName: "Bench Press",
        isMetadataMatched: true,
        rawExerciseNames: ["bench press", "Bench Press"].sort((a, b) => a.localeCompare(b)),
        setCount: 3,
      },
      {
        canonicalName: null,
        groupName: "Cable Fly",
        isMetadataMatched: false,
        rawExerciseNames: ["Cable Fly"],
        setCount: 2,
      },
    ]);
  });

  it("sorts output by setCount desc and groupName asc", () => {
    const groups = buildCanonicalExerciseTrendGroups([
      makeSet({ exerciseName: "Z Curl" }),
      makeSet({ exerciseName: "Bench Press" }),
      makeSet({ exerciseName: "A Curl" }),
      makeSet({ exerciseName: "bench press" }),
    ]);

    expect(groups.map((group) => group.groupName)).toEqual([
      "Bench Press",
      "A Curl",
      "Z Curl",
    ]);
  });

  it("does not mutate input", () => {
    const input = [
      makeSet({ exerciseName: "  Cable Fly  " }),
      makeSet({ exerciseName: "Bench Press" }),
    ];
    const original = clone(input);

    buildCanonicalExerciseTrendGroups(input);

    expect(input).toEqual(original);
  });
});

describe("toCanonicalExerciseMetricSeries", () => {
  const benchGroup: CanonicalExerciseTrendGroup = {
    canonicalName: "Bench Press",
    groupName: "Bench Press",
    isMetadataMatched: true,
    rawExerciseNames: ["Bench Press", "bench press", "ベンチプレス"],
    setCount: 3,
  };

  it("combines points from multiple raw names in the selected canonical group", () => {
    const series = toCanonicalExerciseMetricSeries([
      makeSet({
        date: "2026-06-08",
        exerciseName: "bench press",
        metrics: { estimatedOneRepMax: 120, volumeLoad: 520 },
        setIndex: 1,
      }),
      makeSet({
        date: "2026-06-01",
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: 110, volumeLoad: 500 },
        setIndex: 0,
      }),
      makeSet({
        date: "2026-06-08",
        exerciseName: "ベンチプレス",
        metrics: { estimatedOneRepMax: 118, volumeLoad: 510 },
        setIndex: 0,
      }),
      makeSet({
        date: "2026-06-01",
        exerciseName: "Squat",
        metrics: { estimatedOneRepMax: 150, volumeLoad: 600 },
        setIndex: 0,
      }),
    ], benchGroup, "estimatedOneRepMax");

    expect(series).toEqual({
      id: "Bench%20Press:estimatedOneRepMax",
      label: "Bench Press estimatedOneRepMax",
      points: [
        { x: "2026-06-01", y: 110, label: "Bench Press" },
        { x: "2026-06-08", y: 118, label: "ベンチプレス" },
        { x: "2026-06-08", y: 120, label: "bench press" },
      ],
    });
  });

  const metricCases: Array<[ExerciseMetric, number]> = [
    ["estimatedOneRepMax", 116.67],
    ["weight", 100],
    ["volumeLoad", 500],
    ["reps", 5],
  ];

  it.each(metricCases)("supports the %s metric", (metric, expectedValue) => {
    const series = toCanonicalExerciseMetricSeries([
      makeSet({ exerciseName: "Bench Press" }),
    ], benchGroup, metric);

    expect(series.points).toEqual([
      { x: "2026-06-01", y: expectedValue, label: "Bench Press" },
    ]);
  });

  it("excludes invalid dates and non-positive or non-finite metric values", () => {
    const series = toCanonicalExerciseMetricSeries([
      makeSet({ date: "2026-02-30", exerciseName: "Bench Press" }),
      makeSet({ date: "", exerciseName: "Bench Press" }),
      makeSet({
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: null, volumeLoad: 500 },
      }),
      makeSet({
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: 0, volumeLoad: 500 },
      }),
      makeSet({
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: -1, volumeLoad: 500 },
      }),
      makeSet({
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: Number.NaN, volumeLoad: 500 },
      }),
      makeSet({
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: Number.POSITIVE_INFINITY, volumeLoad: 500 },
      }),
      makeSet({
        date: "2026-06-02",
        exerciseName: "Bench Press",
        metrics: { estimatedOneRepMax: 115, volumeLoad: 500 },
      }),
    ], benchGroup, "estimatedOneRepMax");

    expect(series.points).toEqual([
      { x: "2026-06-02", y: 115, label: "Bench Press" },
    ]);
  });

  it("sorts by date asc and setIndex asc", () => {
    const series = toCanonicalExerciseMetricSeries([
      makeSet({ date: "2026-06-03", exerciseName: "Bench Press", setIndex: 0 }),
      makeSet({ date: "2026-06-01", exerciseName: "Bench Press", setIndex: 1 }),
      makeSet({ date: "2026-06-01", exerciseName: "bench press", setIndex: 0 }),
    ], benchGroup, "weight");

    expect(series.points).toEqual([
      { x: "2026-06-01", y: 100, label: "bench press" },
      { x: "2026-06-01", y: 100, label: "Bench Press" },
      { x: "2026-06-03", y: 100, label: "Bench Press" },
    ]);
  });

  it("builds a series for an unmatched raw group", () => {
    const cableFlyGroup: CanonicalExerciseTrendGroup = {
      canonicalName: null,
      groupName: "Cable Fly",
      isMetadataMatched: false,
      rawExerciseNames: ["Cable Fly"],
      setCount: 1,
    };
    const series = toCanonicalExerciseMetricSeries([
      makeSet({
        date: "2026-06-04",
        exerciseName: "  Cable Fly  ",
        metrics: { estimatedOneRepMax: 50, volumeLoad: 200 },
        weight: 20,
      }),
    ], cableFlyGroup, "weight");

    expect(series).toEqual({
      id: "Cable%20Fly:weight",
      label: "Cable Fly weight",
      points: [
        { x: "2026-06-04", y: 20, label: "Cable Fly" },
      ],
    });
  });

  it("returns empty points when there are no matching sets", () => {
    const series = toCanonicalExerciseMetricSeries([
      makeSet({ exerciseName: "Squat" }),
    ], benchGroup, "estimatedOneRepMax");

    expect(series.points).toEqual([]);
  });

  it("does not mutate input", () => {
    const input = [
      makeSet({ exerciseName: "Bench Press" }),
    ];
    const original = clone(input);

    toCanonicalExerciseMetricSeries(input, benchGroup, "estimatedOneRepMax");

    expect(input).toEqual(original);
  });
});
