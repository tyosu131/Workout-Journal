import { findExerciseMetadataByName } from "../../../../shared/utils/exerciseCanonicalization";
import type { NormalizedWorkoutSetWithMetrics } from "../../../../shared/utils/trainingMetrics";
import type {
  ChartSeries,
  ExerciseMetric,
} from "../../../../shared/utils/trainingGraphData";

export type CanonicalExerciseTrendGroup = {
  groupName: string;
  canonicalName: string | null;
  rawExerciseNames: string[];
  setCount: number;
  isMetadataMatched: boolean;
};

export type CanonicalizedExerciseTrendPoint = {
  date: string;
  rawExerciseName: string;
  canonicalName: string | null;
  value: number;
};

type MutableCanonicalExerciseTrendGroup = {
  canonicalName: string | null;
  groupName: string;
  isMetadataMatched: boolean;
  rawExerciseNames: Set<string>;
  setCount: number;
};

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

const getMetricValue = (
  set: NormalizedWorkoutSetWithMetrics,
  metric: ExerciseMetric
): number | null => {
  switch (metric) {
    case "estimatedOneRepMax":
      return set.metrics.estimatedOneRepMax;
    case "weight":
      return set.weight;
    case "volumeLoad":
      return set.metrics.volumeLoad;
    case "reps":
      return set.reps;
  }
};

const isPositiveFiniteNumber = (
  value: number | null | undefined
): value is number => (
  typeof value === "number" && Number.isFinite(value) && value > 0
);

export const buildCanonicalExerciseTrendGroups = (
  sets: NormalizedWorkoutSetWithMetrics[]
): CanonicalExerciseTrendGroup[] => {
  if (!Array.isArray(sets) || sets.length === 0) {
    return [];
  }

  const groupsByName = new Map<string, MutableCanonicalExerciseTrendGroup>();

  sets.forEach((set) => {
    const rawExerciseName = set.exerciseName.trim();
    if (rawExerciseName === "") {
      return;
    }

    const metadata = findExerciseMetadataByName(rawExerciseName);
    const groupName = metadata?.canonicalName ?? rawExerciseName;
    const existingGroup = groupsByName.get(groupName);
    const group = existingGroup ?? {
      canonicalName: metadata?.canonicalName ?? null,
      groupName,
      isMetadataMatched: Boolean(metadata),
      rawExerciseNames: new Set<string>(),
      setCount: 0,
    };

    group.rawExerciseNames.add(rawExerciseName);
    group.setCount += 1;

    if (metadata) {
      group.canonicalName = metadata.canonicalName;
      group.isMetadataMatched = true;
    }

    groupsByName.set(groupName, group);
  });

  return Array.from(groupsByName.values())
    .map((group) => ({
      canonicalName: group.canonicalName,
      groupName: group.groupName,
      isMetadataMatched: group.isMetadataMatched,
      rawExerciseNames: Array.from(group.rawExerciseNames).sort((a, b) => a.localeCompare(b)),
      setCount: group.setCount,
    }))
    .sort((a, b) => {
      const countCompare = b.setCount - a.setCount;
      return countCompare !== 0 ? countCompare : a.groupName.localeCompare(b.groupName);
    });
};

export const toCanonicalExerciseMetricSeries = (
  sets: NormalizedWorkoutSetWithMetrics[],
  group: CanonicalExerciseTrendGroup,
  metric: ExerciseMetric
): ChartSeries => {
  const rawExerciseNames = new Set(group.rawExerciseNames.map((name) => name.trim()));
  const points = Array.isArray(sets)
    ? sets
      .flatMap((set) => {
        const rawExerciseName = set.exerciseName.trim();
        if (!rawExerciseNames.has(rawExerciseName)) {
          return [];
        }

        const date = getValidDate(set.date);
        const value = getMetricValue(set, metric);
        if (!date || !isPositiveFiniteNumber(value)) {
          return [];
        }

        return [{
          point: {
            x: date,
            y: value,
            label: rawExerciseName,
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
    id: `${encodeURIComponent(group.groupName)}:${metric}`,
    label: `${group.groupName} ${metric}`,
    points,
  };
};
