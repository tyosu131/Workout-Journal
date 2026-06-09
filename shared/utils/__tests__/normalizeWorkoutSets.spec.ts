import { normalizeWorkoutSets, WorkoutNoteInput } from "../normalizeWorkoutSets";

describe("normalizeWorkoutSets", () => {
  it("returns an empty array for empty notes", () => {
    expect(normalizeWorkoutSets([])).toEqual([]);
  });

  it("normalizes array exercises with multiple sets", () => {
    const notes: WorkoutNoteInput[] = [
      {
        date: "2026-06-10",
        userid: "user-1",
        tags: ["push", "bench"],
        exercises: [
          {
            exercise: "Bench Press",
            note: "Paused reps",
            sets: [
              { weight: "100", reps: "5", rest: "180" },
              { weight: 102.5, reps: 3, rest: null },
            ],
          },
        ],
      },
    ];

    expect(normalizeWorkoutSets(notes)).toEqual([
      {
        date: "2026-06-10",
        userId: "user-1",
        exerciseName: "Bench Press",
        exerciseNote: "Paused reps",
        setIndex: 0,
        weight: 100,
        reps: 5,
        restSeconds: 180,
        rpe: null,
        rir: null,
        failure: null,
        tags: ["push", "bench"],
      },
      {
        date: "2026-06-10",
        userId: "user-1",
        exerciseName: "Bench Press",
        exerciseNote: "Paused reps",
        setIndex: 1,
        weight: 102.5,
        reps: 3,
        restSeconds: null,
        rpe: null,
        rir: null,
        failure: null,
        tags: ["push", "bench"],
      },
    ]);
  });

  it("parses exercises from a JSON string", () => {
    const notes: WorkoutNoteInput[] = [
      {
        date: "2026-06-11",
        exercises: JSON.stringify([
          {
            exercise: "Squat",
            sets: [{ weight: "140", reps: "3", rest: "240" }],
          },
        ]),
      },
    ];

    expect(normalizeWorkoutSets(notes)).toEqual([
      {
        date: "2026-06-11",
        userId: null,
        exerciseName: "Squat",
        exerciseNote: null,
        setIndex: 0,
        weight: 140,
        reps: 3,
        restSeconds: 240,
        rpe: null,
        rir: null,
        failure: null,
        tags: [],
      },
    ]);
  });

  it("ignores invalid exercises JSON", () => {
    expect(
      normalizeWorkoutSets([
        {
          date: "2026-06-12",
          exercises: "{invalid-json",
        },
      ])
    ).toEqual([]);
  });

  it("converts invalid numeric values to null", () => {
    const rows = normalizeWorkoutSets([
      {
        exercises: [
          {
            exercise: "Deadlift",
            sets: [{ weight: "", reps: "abc", rest: undefined, rpe: null, rir: " " }],
          },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({
      weight: null,
      reps: null,
      restSeconds: null,
      rpe: null,
      rir: null,
    });
  });

  it("skips exercises without set arrays", () => {
    expect(
      normalizeWorkoutSets([
        {
          exercises: [
            { exercise: "Bench Press", sets: null },
            { exercise: "Squat" },
          ],
        },
      ])
    ).toEqual([]);
  });

  it("preserves date, userId, exerciseName, exerciseNote, setIndex, and tags", () => {
    const rows = normalizeWorkoutSets([
      {
        date: "2026-06-13",
        userid: "user-2",
        tags: ["legs"],
        exercises: [
          {
            exercise: "Leg Press",
            note: "Deep range",
            sets: [
              { weight: "200", reps: "10" },
              { weight: "210", reps: "8" },
            ],
          },
        ],
      },
    ]);

    expect(rows.map(({ date, userId, exerciseName, exerciseNote, setIndex, tags }) => ({
      date,
      userId,
      exerciseName,
      exerciseNote,
      setIndex,
      tags,
    }))).toEqual([
      {
        date: "2026-06-13",
        userId: "user-2",
        exerciseName: "Leg Press",
        exerciseNote: "Deep range",
        setIndex: 0,
        tags: ["legs"],
      },
      {
        date: "2026-06-13",
        userId: "user-2",
        exerciseName: "Leg Press",
        exerciseNote: "Deep range",
        setIndex: 1,
        tags: ["legs"],
      },
    ]);
  });

  it("does not mutate original input", () => {
    const notes: WorkoutNoteInput[] = [
      {
        date: "2026-06-14",
        tags: ["pull"],
        exercises: [
          {
            exercise: "Row",
            sets: [{ weight: "80", reps: "10", rest: "90" }],
          },
        ],
      },
    ];
    const original = JSON.stringify(notes);

    normalizeWorkoutSets(notes);

    expect(JSON.stringify(notes)).toBe(original);
  });

  it("normalizes optional rpe, rir, and failure values", () => {
    expect(
      normalizeWorkoutSets([
        {
          exercises: [
            {
              exercise: "",
              note: null,
              sets: [
                { weight: "50", reps: "12", rpe: "8.5", rir: 1, failure: false },
                { weight: "50", reps: "10", rpe: "abc", rir: "", failure: true },
              ],
            },
          ],
        },
      ])
    ).toEqual([
      {
        date: null,
        userId: null,
        exerciseName: "",
        exerciseNote: null,
        setIndex: 0,
        weight: 50,
        reps: 12,
        restSeconds: null,
        rpe: 8.5,
        rir: 1,
        failure: false,
        tags: [],
      },
      {
        date: null,
        userId: null,
        exerciseName: "",
        exerciseNote: null,
        setIndex: 1,
        weight: 50,
        reps: 10,
        restSeconds: null,
        rpe: null,
        rir: null,
        failure: true,
        tags: [],
      },
    ]);
  });
});
