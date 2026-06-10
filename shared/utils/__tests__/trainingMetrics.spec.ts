import {
  addTrainingMetricsToSet,
  calculateEstimatedOneRepMax,
  calculateVolumeLoad,
} from "../trainingMetrics";
import type { NormalizedWorkoutSet } from "../normalizeWorkoutSets";

const baseSet: NormalizedWorkoutSet = {
  date: "2026-06-11",
  userId: "user-1",
  exerciseName: "Bench Press",
  exerciseNote: "Paused reps",
  setIndex: 0,
  weight: 100,
  reps: 5,
  restSeconds: 180,
  rpe: null,
  rir: null,
  failure: null,
  tags: ["push"],
};

describe("calculateVolumeLoad", () => {
  it("calculates volume load for valid weight and reps", () => {
    expect(calculateVolumeLoad(100, 5)).toBe(500);
  });

  it("allows decimal weight", () => {
    expect(calculateVolumeLoad(102.5, 3)).toBe(307.5);
  });

  it("returns null for null weight or reps", () => {
    expect(calculateVolumeLoad(null, 5)).toBeNull();
    expect(calculateVolumeLoad(100, null)).toBeNull();
  });

  it("returns null for zero or negative values", () => {
    expect(calculateVolumeLoad(100, 0)).toBeNull();
    expect(calculateVolumeLoad(-100, 5)).toBeNull();
    expect(calculateVolumeLoad(100, -5)).toBeNull();
  });
});

describe("calculateEstimatedOneRepMax", () => {
  it("returns weight for 1 rep", () => {
    expect(calculateEstimatedOneRepMax(100, 1)).toBe(100);
  });

  it("calculates e1RM for 5 reps using the Epley formula", () => {
    expect(calculateEstimatedOneRepMax(100, 5)).toBe(116.67);
  });

  it("calculates e1RM for 10 reps using the Epley formula", () => {
    expect(calculateEstimatedOneRepMax(80, 10)).toBe(106.67);
  });

  it("returns null for reps greater than 12", () => {
    expect(calculateEstimatedOneRepMax(60, 15)).toBeNull();
  });

  it("returns null for null, zero, or negative values", () => {
    expect(calculateEstimatedOneRepMax(null, 5)).toBeNull();
    expect(calculateEstimatedOneRepMax(100, null)).toBeNull();
    expect(calculateEstimatedOneRepMax(100, 0)).toBeNull();
    expect(calculateEstimatedOneRepMax(-100, 5)).toBeNull();
    expect(calculateEstimatedOneRepMax(100, -5)).toBeNull();
  });
});

describe("addTrainingMetricsToSet", () => {
  it("adds metrics to a normalized workout set", () => {
    expect(addTrainingMetricsToSet(baseSet)).toEqual({
      ...baseSet,
      tags: ["push"],
      metrics: {
        volumeLoad: 500,
        estimatedOneRepMax: 116.67,
      },
    });
  });

  it("does not mutate the input set", () => {
    const input = { ...baseSet, tags: [...baseSet.tags] };
    const original = JSON.stringify(input);

    const result = addTrainingMetricsToSet(input);
    result.tags.push("mutated-result");

    expect(JSON.stringify(input)).toBe(original);
  });

  it("returns null metrics when weight or reps is null", () => {
    expect(addTrainingMetricsToSet({ ...baseSet, weight: null }).metrics).toEqual({
      volumeLoad: null,
      estimatedOneRepMax: null,
    });
    expect(addTrainingMetricsToSet({ ...baseSet, reps: null }).metrics).toEqual({
      volumeLoad: null,
      estimatedOneRepMax: null,
    });
  });
});
