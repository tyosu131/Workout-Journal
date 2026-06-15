import type { NormalizedWorkoutSetWithMetrics } from "./trainingMetrics";

export type PersonalRecordSet = {
  date: string;
  exerciseName: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  volumeLoad: number | null;
  estimatedOneRepMax: number | null;
};

export type ExercisePersonalRecords = {
  exerciseName: string;
  maxEstimatedOneRepMax: PersonalRecordSet | null;
  maxWeight: PersonalRecordSet | null;
  maxReps: PersonalRecordSet | null;
  maxVolumeLoad: PersonalRecordSet | null;
};

const isPositiveFiniteNumber = (value: number | null | undefined): value is number => (
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

const toPersonalRecordSet = (
  set: NormalizedWorkoutSetWithMetrics,
  date: string
): PersonalRecordSet => ({
  date,
  exerciseName: set.exerciseName,
  setIndex: set.setIndex,
  weight: toPositiveNumberOrNull(set.weight),
  reps: toPositiveNumberOrNull(set.reps),
  volumeLoad: toPositiveNumberOrNull(set.metrics.volumeLoad),
  estimatedOneRepMax: toPositiveNumberOrNull(set.metrics.estimatedOneRepMax),
});

const pickBetterRecord = (
  current: PersonalRecordSet | null,
  candidate: PersonalRecordSet,
  candidateValue: number,
  getCurrentValue: (record: PersonalRecordSet) => number | null
): PersonalRecordSet => {
  if (!current) {
    return candidate;
  }

  const currentValue = getCurrentValue(current);
  if (!isPositiveFiniteNumber(currentValue)) {
    return candidate;
  }

  if (candidateValue > currentValue) {
    return candidate;
  }

  if (candidateValue < currentValue) {
    return current;
  }

  const dateCompare = candidate.date.localeCompare(current.date);
  if (dateCompare < 0) {
    return candidate;
  }

  if (dateCompare > 0) {
    return current;
  }

  return candidate.setIndex < current.setIndex ? candidate : current;
};

export const findExercisePersonalRecords = (
  sets: NormalizedWorkoutSetWithMetrics[]
): ExercisePersonalRecords[] => {
  if (!Array.isArray(sets) || sets.length === 0) {
    return [];
  }

  const groups = new Map<string, ExercisePersonalRecords>();

  sets.forEach((set) => {
    if (set.exerciseName.trim() === "") {
      return;
    }

    const date = getValidDate(set.date);
    if (!date) {
      return;
    }

    const record = toPersonalRecordSet(set, date);
    const group = groups.get(set.exerciseName) ?? {
      exerciseName: set.exerciseName,
      maxEstimatedOneRepMax: null,
      maxWeight: null,
      maxReps: null,
      maxVolumeLoad: null,
    };

    if (isPositiveFiniteNumber(record.estimatedOneRepMax)) {
      group.maxEstimatedOneRepMax = pickBetterRecord(
        group.maxEstimatedOneRepMax,
        record,
        record.estimatedOneRepMax,
        (current) => current.estimatedOneRepMax
      );
    }

    if (isPositiveFiniteNumber(record.weight)) {
      group.maxWeight = pickBetterRecord(
        group.maxWeight,
        record,
        record.weight,
        (current) => current.weight
      );
    }

    if (isPositiveFiniteNumber(record.reps)) {
      group.maxReps = pickBetterRecord(
        group.maxReps,
        record,
        record.reps,
        (current) => current.reps
      );
    }

    if (isPositiveFiniteNumber(record.volumeLoad)) {
      group.maxVolumeLoad = pickBetterRecord(
        group.maxVolumeLoad,
        record,
        record.volumeLoad,
        (current) => current.volumeLoad
      );
    }

    groups.set(set.exerciseName, group);
  });

  return Array.from(groups.values()).sort((a, b) => (
    a.exerciseName.localeCompare(b.exerciseName)
  ));
};
