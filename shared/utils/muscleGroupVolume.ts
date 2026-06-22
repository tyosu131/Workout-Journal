import { findExerciseMetadataByName } from "./exerciseCanonicalization";
import type { NormalizedWorkoutSetWithMetrics } from "./trainingMetrics";
import { getWeekStart } from "./weeklyTrainingVolume";

export type WeeklyMuscleGroupVolumeRow = {
  weekStart: string;
  muscle: string;
  totalSets: number;
  totalVolumeLoad: number;
  exercises: string[];
};

type WeeklyMuscleGroupVolumeAccumulator = {
  weekStart: string;
  muscle: string;
  totalSets: number;
  totalVolumeLoad: number;
  exercises: Set<string>;
};

const isPositiveFiniteNumber = (
  value: number | null | undefined
): value is number => (
  typeof value === "number" && Number.isFinite(value) && value > 0
);

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

export const aggregateWeeklyMuscleGroupVolume = (
  sets: NormalizedWorkoutSetWithMetrics[]
): WeeklyMuscleGroupVolumeRow[] => {
  if (!Array.isArray(sets) || sets.length === 0) {
    return [];
  }

  const groups = new Map<string, WeeklyMuscleGroupVolumeAccumulator>();

  sets.forEach((set) => {
    const weekStart = getWeekStart(set.date);
    const metadata = findExerciseMetadataByName(set.exerciseName);
    if (!weekStart || !metadata) {
      return;
    }

    const volumeLoad = set.metrics.volumeLoad;
    const primaryMuscles = new Set(metadata.primaryMuscles);

    primaryMuscles.forEach((muscle) => {
      const key = `${weekStart}\u0000${muscle}`;
      const group = groups.get(key) ?? {
        weekStart,
        muscle,
        totalSets: 0,
        totalVolumeLoad: 0,
        exercises: new Set<string>(),
      };

      group.totalSets += 1;
      if (isPositiveFiniteNumber(volumeLoad)) {
        group.totalVolumeLoad += volumeLoad;
      }
      group.exercises.add(metadata.canonicalName);

      groups.set(key, group);
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      weekStart: group.weekStart,
      muscle: group.muscle,
      totalSets: group.totalSets,
      totalVolumeLoad: roundToTwoDecimals(group.totalVolumeLoad),
      exercises: Array.from(group.exercises).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const weekCompare = a.weekStart.localeCompare(b.weekStart);
      return weekCompare !== 0 ? weekCompare : a.muscle.localeCompare(b.muscle);
    });
};
