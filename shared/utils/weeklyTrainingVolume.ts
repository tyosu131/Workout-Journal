import type { NormalizedWorkoutSetWithMetrics } from "./trainingMetrics";

export type WeeklyTrainingVolumeRow = {
  weekStart: string;
  exerciseName: string;
  totalSets: number;
  totalVolumeLoad: number;
  averageRpe: number | null;
  averageRir: number | null;
};

type WeeklyTrainingVolumeAccumulator = {
  weekStart: string;
  exerciseName: string;
  totalSets: number;
  totalVolumeLoad: number;
  rpeTotal: number;
  rpeCount: number;
  rirTotal: number;
  rirCount: number;
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const isFiniteNumber = (value: number | null): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

export const getWeekStart = (date: string | null | undefined): string | null => {
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

  const dayOfWeek = parsed.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  parsed.setUTCDate(parsed.getUTCDate() - daysFromMonday);

  return parsed.toISOString().slice(0, 10);
};

export const aggregateWeeklyTrainingVolume = (
  sets: NormalizedWorkoutSetWithMetrics[]
): WeeklyTrainingVolumeRow[] => {
  if (!Array.isArray(sets) || sets.length === 0) {
    return [];
  }

  const groups = new Map<string, WeeklyTrainingVolumeAccumulator>();

  sets.forEach((set) => {
    const weekStart = getWeekStart(set.date);
    if (!weekStart) {
      return;
    }

    const key = `${weekStart}\u0000${set.exerciseName}`;
    const current = groups.get(key) ?? {
      weekStart,
      exerciseName: set.exerciseName,
      totalSets: 0,
      totalVolumeLoad: 0,
      rpeTotal: 0,
      rpeCount: 0,
      rirTotal: 0,
      rirCount: 0,
    };

    current.totalSets += 1;

    if (isFiniteNumber(set.metrics.volumeLoad)) {
      current.totalVolumeLoad += set.metrics.volumeLoad;
    }

    if (isFiniteNumber(set.rpe)) {
      current.rpeTotal += set.rpe;
      current.rpeCount += 1;
    }

    if (isFiniteNumber(set.rir)) {
      current.rirTotal += set.rir;
      current.rirCount += 1;
    }

    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      weekStart: group.weekStart,
      exerciseName: group.exerciseName,
      totalSets: group.totalSets,
      totalVolumeLoad: roundToTwoDecimals(group.totalVolumeLoad),
      averageRpe: group.rpeCount > 0
        ? roundToTwoDecimals(group.rpeTotal / group.rpeCount)
        : null,
      averageRir: group.rirCount > 0
        ? roundToTwoDecimals(group.rirTotal / group.rirCount)
        : null,
    }))
    .sort((a, b) => {
      const weekCompare = a.weekStart.localeCompare(b.weekStart);
      if (weekCompare !== 0) {
        return weekCompare;
      }
      return a.exerciseName.localeCompare(b.exerciseName);
    });
};
