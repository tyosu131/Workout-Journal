const EMPTY_EXERCISES = "[]";

const hasOwn = (input, key) => Object.prototype.hasOwnProperty.call(input, key);

const isRecord = (input) => (
  typeof input === "object" && input !== null && !Array.isArray(input)
);

const toFiniteNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBoundedNumber = (value, min, max) => {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

const normalizeRpe = (value) => normalizeBoundedNumber(value, 1, 10);

const normalizeRir = (value) => normalizeBoundedNumber(value, 0, 10);

const normalizeFailure = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
};

const sanitizeSet = (set) => {
  if (!isRecord(set)) {
    return {};
  }

  const sanitized = { ...set };
  const rpe = normalizeRpe(set.rpe);
  const rir = normalizeRir(set.rir);
  const failure = normalizeFailure(set.failure);

  delete sanitized.rpe;
  delete sanitized.rir;
  delete sanitized.failure;

  if (rpe !== null) {
    sanitized.rpe = rpe;
  }

  if (rir !== null) {
    sanitized.rir = rir;
  }

  if (failure !== null) {
    sanitized.failure = failure;
  }

  return sanitized;
};

const sanitizeExercise = (exercise) => {
  if (!isRecord(exercise)) {
    return {
      exercise: "",
      sets: [],
    };
  }

  const sanitized = { ...exercise };
  const exerciseName = hasOwn(exercise, "exercise") ? exercise.exercise : "";

  sanitized.exercise = exerciseName === null || exerciseName === undefined
    ? ""
    : String(exerciseName);

  if (hasOwn(exercise, "note")) {
    if (exercise.note === undefined) {
      delete sanitized.note;
    } else if (exercise.note !== null && typeof exercise.note !== "string") {
      sanitized.note = String(exercise.note);
    }
  }

  sanitized.sets = Array.isArray(exercise.sets)
    ? exercise.sets.map(sanitizeSet)
    : [];

  return sanitized;
};

const parseExercisesInput = (exercises) => {
  if (Array.isArray(exercises)) {
    return exercises;
  }

  if (typeof exercises !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(exercises);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeExercisesPayloadForSave = (exercises) => {
  const parsedExercises = parseExercisesInput(exercises);
  if (parsedExercises.length === 0) {
    return EMPTY_EXERCISES;
  }

  return JSON.stringify(parsedExercises.map(sanitizeExercise));
};

module.exports = {
  normalizeExercisesPayloadForSave,
};
