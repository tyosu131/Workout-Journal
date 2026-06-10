import type { NormalizedWorkoutSet } from "./normalizeWorkoutSets";

export type TrainingMetrics = {
  volumeLoad: number | null;
  estimatedOneRepMax: number | null;
};

export type NormalizedWorkoutSetWithMetrics = NormalizedWorkoutSet & {
  metrics: TrainingMetrics;
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const isPositiveNumber = (value: number | null): value is number => (
  typeof value === "number" && value > 0
);

export const calculateVolumeLoad = (
  weight: number | null,
  reps: number | null
): number | null => {
  if (!isPositiveNumber(weight) || !isPositiveNumber(reps)) {
    return null;
  }

  return roundToTwoDecimals(weight * reps);
};

export const calculateEstimatedOneRepMax = (
  weight: number | null,
  reps: number | null
): number | null => {
  if (!isPositiveNumber(weight) || !isPositiveNumber(reps)) {
    return null;
  }

  if (reps > 12) {
    return null;
  }

  if (reps === 1) {
    return weight;
  }

  return roundToTwoDecimals(weight * (1 + reps / 30));
};

export const addTrainingMetricsToSet = (
  set: NormalizedWorkoutSet
): NormalizedWorkoutSetWithMetrics => ({
  ...set,
  tags: [...set.tags],
  metrics: {
    volumeLoad: calculateVolumeLoad(set.weight, set.reps),
    estimatedOneRepMax: calculateEstimatedOneRepMax(set.weight, set.reps),
  },
});
