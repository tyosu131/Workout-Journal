export type WorkoutSetInput = {
  weight?: string | number | null;
  reps?: string | number | null;
  rest?: string | number | null;
  rpe?: string | number | null;
  rir?: string | number | null;
  failure?: boolean | null;
};

export type WorkoutExerciseInput = {
  exercise?: string | null;
  note?: string | null;
  sets?: WorkoutSetInput[] | null;
};

export type WorkoutNoteInput = {
  date?: string | null;
  note?: string | null;
  exercises?: WorkoutExerciseInput[] | string | null;
  tags?: string[] | null;
  userid?: string | null;
};

export type NormalizedWorkoutSet = {
  date: string | null;
  userId: string | null;
  exerciseName: string;
  exerciseNote: string | null;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  restSeconds: number | null;
  rpe: number | null;
  rir: number | null;
  failure: boolean | null;
  tags: string[];
};

const safeNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseExercises = (
  exercises: WorkoutNoteInput["exercises"]
): WorkoutExerciseInput[] => {
  if (Array.isArray(exercises)) {
    return exercises;
  }

  if (typeof exercises !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(exercises);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const normalizeWorkoutSets = (
  notes: WorkoutNoteInput[]
): NormalizedWorkoutSet[] => {
  if (!Array.isArray(notes) || notes.length === 0) {
    return [];
  }

  return notes.flatMap((note) => {
    const exercises = parseExercises(note.exercises);
    const tags = Array.isArray(note.tags) ? [...note.tags] : [];

    return exercises.flatMap((exercise) => {
      if (!Array.isArray(exercise.sets)) {
        return [];
      }

      return exercise.sets.map((set, setIndex) => ({
        date: note.date ?? null,
        userId: note.userid ?? null,
        exerciseName: exercise.exercise ?? "",
        exerciseNote: exercise.note ?? null,
        setIndex,
        weight: safeNumber(set.weight),
        reps: safeNumber(set.reps),
        restSeconds: safeNumber(set.rest),
        rpe: safeNumber(set.rpe),
        rir: safeNumber(set.rir),
        failure: typeof set.failure === "boolean" ? set.failure : null,
        tags,
      }));
    });
  });
};
