import {
  EXERCISE_METADATA,
  ExerciseMetadata,
  LiftType,
} from "../constants/exerciseMetadata";

const normalizeForMatch = (value: string): string => value.trim().toLowerCase();

export const findExerciseMetadataByName = (
  rawExerciseName: string | null | undefined
): ExerciseMetadata | null => {
  const trimmed = rawExerciseName?.trim() ?? "";
  if (trimmed === "") {
    return null;
  }

  const canonicalExact = EXERCISE_METADATA.find(
    (metadata) => metadata.canonicalName === trimmed
  );
  if (canonicalExact) {
    return canonicalExact;
  }

  const normalized = normalizeForMatch(trimmed);
  const canonicalCaseInsensitive = EXERCISE_METADATA.find(
    (metadata) => normalizeForMatch(metadata.canonicalName) === normalized
  );
  if (canonicalCaseInsensitive) {
    return canonicalCaseInsensitive;
  }

  const aliasExact = EXERCISE_METADATA.find((metadata) => (
    metadata.aliases.some((alias) => alias === trimmed)
  ));
  if (aliasExact) {
    return aliasExact;
  }

  return EXERCISE_METADATA.find((metadata) => (
    metadata.aliases.some((alias) => normalizeForMatch(alias) === normalized)
  )) ?? null;
};

export const getCanonicalExerciseName = (
  rawExerciseName: string | null | undefined
): string => {
  const trimmed = rawExerciseName?.trim() ?? "";
  if (trimmed === "") {
    return "";
  }

  return findExerciseMetadataByName(trimmed)?.canonicalName ?? trimmed;
};

export const getExerciseLiftType = (
  rawExerciseName: string | null | undefined
): LiftType => findExerciseMetadataByName(rawExerciseName)?.liftType ?? null;
