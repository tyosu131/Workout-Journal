export type LiftType = "squat" | "bench" | "deadlift" | null;

export type ExerciseMetadata = {
  id: string;
  canonicalName: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  movementPattern?: string;
  exerciseCategory?: string;
  liftType?: LiftType;
};

export const EXERCISE_METADATA: ExerciseMetadata[] = [
  {
    id: "bench_press",
    canonicalName: "Bench Press",
    aliases: [
      "bench press",
      "Bench",
      "Competition Bench",
      "Paused Bench Press",
      "ベンチプレス",
    ],
    primaryMuscles: ["chest", "triceps", "front_delts"],
    secondaryMuscles: ["shoulders"],
    movementPattern: "horizontal_push",
    exerciseCategory: "barbell",
    liftType: "bench",
  },
  {
    id: "squat",
    canonicalName: "Squat",
    aliases: [
      "squat",
      "Back Squat",
      "Barbell Squat",
      "スクワット",
    ],
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "core"],
    movementPattern: "squat",
    exerciseCategory: "barbell",
    liftType: "squat",
  },
  {
    id: "deadlift",
    canonicalName: "Deadlift",
    aliases: [
      "deadlift",
      "Conventional Deadlift",
      "デッドリフト",
    ],
    primaryMuscles: ["hamstrings", "glutes", "back"],
    secondaryMuscles: ["forearms", "core"],
    movementPattern: "hinge",
    exerciseCategory: "barbell",
    liftType: "deadlift",
  },
  {
    id: "overhead_press",
    canonicalName: "Overhead Press",
    aliases: [
      "overhead press",
      "OHP",
      "Military Press",
      "ショルダープレス",
    ],
    primaryMuscles: ["shoulders", "triceps"],
    secondaryMuscles: ["upper_chest", "core"],
    movementPattern: "vertical_push",
    exerciseCategory: "barbell",
    liftType: null,
  },
  {
    id: "barbell_row",
    canonicalName: "Barbell Row",
    aliases: [
      "barbell row",
      "Bent Over Row",
      "ベントオーバーロウ",
    ],
    primaryMuscles: ["back", "lats"],
    secondaryMuscles: ["biceps", "rear_delts"],
    movementPattern: "horizontal_pull",
    exerciseCategory: "barbell",
    liftType: null,
  },
  {
    id: "pull_up",
    canonicalName: "Pull Up",
    aliases: [
      "pull up",
      "Pullup",
      "Chin Up",
      "懸垂",
    ],
    primaryMuscles: ["lats", "back"],
    secondaryMuscles: ["biceps", "forearms"],
    movementPattern: "vertical_pull",
    exerciseCategory: "bodyweight",
    liftType: null,
  },
  {
    id: "lat_pulldown",
    canonicalName: "Lat Pulldown",
    aliases: [
      "lat pulldown",
      "Lat Pull Down",
      "ラットプルダウン",
    ],
    primaryMuscles: ["lats", "back"],
    secondaryMuscles: ["biceps"],
    movementPattern: "vertical_pull",
    exerciseCategory: "machine",
    liftType: null,
  },
  {
    id: "leg_press",
    canonicalName: "Leg Press",
    aliases: [
      "leg press",
      "レッグプレス",
    ],
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings"],
    movementPattern: "squat",
    exerciseCategory: "machine",
    liftType: null,
  },
  {
    id: "romanian_deadlift",
    canonicalName: "Romanian Deadlift",
    aliases: [
      "romanian deadlift",
      "RDL",
      "ルーマニアンデッドリフト",
    ],
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["back"],
    movementPattern: "hinge",
    exerciseCategory: "barbell",
    liftType: null,
  },
  {
    id: "dumbbell_press",
    canonicalName: "Dumbbell Press",
    aliases: [
      "dumbbell press",
      "DB Press",
      "ダンベルプレス",
    ],
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["front_delts"],
    movementPattern: "horizontal_push",
    exerciseCategory: "dumbbell",
    liftType: null,
  },
];
