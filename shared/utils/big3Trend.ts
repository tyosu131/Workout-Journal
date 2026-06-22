import type { LiftType } from "../constants/exerciseMetadata";
import { getExerciseLiftType } from "./exerciseCanonicalization";
import type { NormalizedWorkoutSetWithMetrics } from "./trainingMetrics";

export type Big3LiftType = Exclude<LiftType, null>;

export type Big3TrendPoint = {
  date: string;
  liftType: Big3LiftType;
  exerciseName: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  estimatedOneRepMax: number | null;
  volumeLoad: number | null;
};

export type Big3TrendSummary = {
  liftType: Big3LiftType;
  points: Big3TrendPoint[];
  maxEstimatedOneRepMax: Big3TrendPoint | null;
  latestTopSet: Big3TrendPoint | null;
};

const BIG3_LIFT_TYPES: Big3LiftType[] = ["squat", "bench", "deadlift"];

const isPositiveFiniteNumber = (
  value: number | null | undefined
): value is number => (
  typeof value === "number" && Number.isFinite(value) && value > 0
);

const getValidDate = (date: string | null | undefined): string | null => {
  if (!date || date.trim() === "") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayOfMonth = Number(match[3]);
  const parsed = new Date(Date.UTC(year, monthIndex, dayOfMonth));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== dayOfMonth
  ) {
    return null;
  }

  return date;
};

const toPositiveNumberOrNull = (value: number | null): number | null => (
  isPositiveFiniteNumber(value) ? value : null
);

const compareTrendPoints = (a: Big3TrendPoint, b: Big3TrendPoint): number => {
  const dateCompare = a.date.localeCompare(b.date);
  return dateCompare !== 0 ? dateCompare : a.setIndex - b.setIndex;
};

const findMaxEstimatedOneRepMax = (
  points: Big3TrendPoint[]
): Big3TrendPoint | null => points.reduce<Big3TrendPoint | null>((best, point) => {
  if (!best) {
    return point;
  }

  const pointValue = point.estimatedOneRepMax as number;
  const bestValue = best.estimatedOneRepMax as number;

  if (pointValue > bestValue) {
    return point;
  }

  if (pointValue < bestValue) {
    return best;
  }

  return compareTrendPoints(point, best) < 0 ? point : best;
}, null);

const findLatestTopSet = (
  points: Big3TrendPoint[]
): Big3TrendPoint | null => {
  if (points.length === 0) {
    return null;
  }

  const latestDate = points[points.length - 1].date;
  return points
    .filter((point) => point.date === latestDate)
    .reduce<Big3TrendPoint | null>((best, point) => {
      if (!best) {
        return point;
      }

      const pointValue = point.estimatedOneRepMax as number;
      const bestValue = best.estimatedOneRepMax as number;

      if (pointValue > bestValue) {
        return point;
      }

      if (pointValue < bestValue) {
        return best;
      }

      return point.setIndex < best.setIndex ? point : best;
    }, null);
};

export const aggregateBig3Trend = (
  sets: NormalizedWorkoutSetWithMetrics[]
): Big3TrendSummary[] => {
  const pointsByLift: Record<Big3LiftType, Big3TrendPoint[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };

  if (Array.isArray(sets)) {
    sets.forEach((set) => {
      const liftType = getExerciseLiftType(set.exerciseName);
      if (!liftType) {
        return;
      }

      const date = getValidDate(set.date);
      const estimatedOneRepMax = set.metrics.estimatedOneRepMax;
      if (!date || !isPositiveFiniteNumber(estimatedOneRepMax)) {
        return;
      }

      pointsByLift[liftType].push({
        date,
        liftType,
        exerciseName: set.exerciseName,
        setIndex: set.setIndex,
        weight: toPositiveNumberOrNull(set.weight),
        reps: toPositiveNumberOrNull(set.reps),
        estimatedOneRepMax,
        volumeLoad: toPositiveNumberOrNull(set.metrics.volumeLoad),
      });
    });
  }

  return BIG3_LIFT_TYPES.map((liftType) => {
    const points = [...pointsByLift[liftType]].sort(compareTrendPoints);

    return {
      liftType,
      points,
      maxEstimatedOneRepMax: findMaxEstimatedOneRepMax(points),
      latestTopSet: findLatestTopSet(points),
    };
  });
};
