import type {
  Big3LiftType,
  Big3TrendSummary,
} from "./big3Trend";
import type { WeeklyMuscleGroupVolumeRow } from "./muscleGroupVolume";
import type { NormalizedWorkoutSetWithMetrics } from "./trainingMetrics";

export type ChartDataPoint = {
  x: string;
  y: number;
  label?: string;
};

export type ChartSeries = {
  id: string;
  label: string;
  points: ChartDataPoint[];
};

export type MuscleGroupVolumeMetric = "totalSets" | "totalVolumeLoad";

export type ExerciseMetric =
  | "estimatedOneRepMax"
  | "volumeLoad"
  | "weight"
  | "reps";

const BIG3_LABELS: Record<Big3LiftType, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
};

const isPositiveFiniteNumber = (
  value: number | null | undefined
): value is number => (
  typeof value === "number" && Number.isFinite(value) && value > 0
);

const isNonNegativeFiniteNumber = (
  value: number | null | undefined
): value is number => (
  typeof value === "number" && Number.isFinite(value) && value >= 0
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

const getExerciseMetricValue = (
  set: NormalizedWorkoutSetWithMetrics,
  metric: ExerciseMetric
): number | null => {
  switch (metric) {
    case "estimatedOneRepMax":
      return set.metrics.estimatedOneRepMax;
    case "volumeLoad":
      return set.metrics.volumeLoad;
    case "weight":
      return set.weight;
    case "reps":
      return set.reps;
  }
};

export const toBig3EstimatedOneRepMaxSeries = (
  summaries: Big3TrendSummary[]
): ChartSeries[] => {
  if (!Array.isArray(summaries)) {
    return [];
  }

  return summaries.map((summary) => ({
    id: summary.liftType,
    label: BIG3_LABELS[summary.liftType],
    points: summary.points
      .filter((point) => isPositiveFiniteNumber(point.estimatedOneRepMax))
      .map((point) => ({
        x: point.date,
        y: point.estimatedOneRepMax as number,
        label: point.exerciseName,
      }))
      .sort((a, b) => a.x.localeCompare(b.x)),
  }));
};

export const toMuscleGroupVolumeSeries = (
  rows: WeeklyMuscleGroupVolumeRow[],
  metric: MuscleGroupVolumeMetric = "totalSets"
): ChartSeries[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const pointsByMuscle = new Map<string, ChartDataPoint[]>();

  rows.forEach((row) => {
    const points = pointsByMuscle.get(row.muscle) ?? [];
    const value = row[metric];

    if (isNonNegativeFiniteNumber(value)) {
      points.push({
        x: row.weekStart,
        y: value,
      });
    }

    pointsByMuscle.set(row.muscle, points);
  });

  return Array.from(pointsByMuscle.entries())
    .map(([muscle, points]) => ({
      id: muscle,
      label: muscle,
      points: [...points].sort((a, b) => a.x.localeCompare(b.x)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const toExerciseMetricSeries = (
  sets: NormalizedWorkoutSetWithMetrics[],
  exerciseName: string,
  metric: ExerciseMetric
): ChartSeries => {
  const points = Array.isArray(sets)
    ? sets
      .filter((set) => set.exerciseName === exerciseName)
      .flatMap((set) => {
        const date = getValidDate(set.date);
        const value = getExerciseMetricValue(set, metric);
        if (!date || !isPositiveFiniteNumber(value)) {
          return [];
        }

        return [{
          point: {
            x: date,
            y: value,
          },
          setIndex: set.setIndex,
        }];
      })
      .sort((a, b) => {
        const dateCompare = a.point.x.localeCompare(b.point.x);
        return dateCompare !== 0 ? dateCompare : a.setIndex - b.setIndex;
      })
      .map(({ point }) => point)
    : [];

  return {
    id: `${encodeURIComponent(exerciseName)}:${metric}`,
    label: `${exerciseName} ${metric}`,
    points,
  };
};
