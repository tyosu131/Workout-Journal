/** @jest-environment node */

const {
  normalizeExercisesPayloadForSave,
} = require("../noteExercisesValidation");

const parseOutput = (input) => JSON.parse(normalizeExercisesPayloadForSave(input));

describe("noteExercisesValidation", () => {
  it("normalizes null and undefined input to an empty JSON array", () => {
    expect(normalizeExercisesPayloadForSave(null)).toBe("[]");
    expect(normalizeExercisesPayloadForSave(undefined)).toBe("[]");
  });

  it("normalizes array input to a JSON string", () => {
    const output = normalizeExercisesPayloadForSave([
      {
        exercise: "Bench Press",
        sets: [{ weight: "100", reps: "5", rest: "120" }],
      },
    ]);

    expect(typeof output).toBe("string");
    expect(JSON.parse(output)).toEqual([
      {
        exercise: "Bench Press",
        sets: [{ weight: "100", reps: "5", rest: "120" }],
      },
    ]);
  });

  it("normalizes valid JSON string input to a sanitized JSON string", () => {
    const input = JSON.stringify([
      {
        exercise: "Squat",
        note: "top set",
        sets: [{ weight: "140", reps: "3", rest: "180", rpe: "8.5" }],
      },
    ]);

    expect(parseOutput(input)).toEqual([
      {
        exercise: "Squat",
        note: "top set",
        sets: [{ weight: "140", reps: "3", rest: "180", rpe: 8.5 }],
      },
    ]);
  });

  it("normalizes invalid JSON string input to an empty JSON array", () => {
    expect(normalizeExercisesPayloadForSave("{not-json")).toBe("[]");
  });

  it("preserves exercise objects and normalizes missing or invalid sets", () => {
    expect(
      parseOutput([
        {
          exercise: "Deadlift",
          note: null,
          sets: [{ weight: "180", reps: "1", rest: "240" }],
        },
        {
          exercise: "Bench Press",
        },
        {
          exercise: "Pull Up",
          sets: "not-an-array",
        },
      ])
    ).toEqual([
      {
        exercise: "Deadlift",
        note: null,
        sets: [{ weight: "180", reps: "1", rest: "240" }],
      },
      {
        exercise: "Bench Press",
        sets: [],
      },
      {
        exercise: "Pull Up",
        sets: [],
      },
    ]);
  });

  it("preserves weight, reps, and rest values without coercing them", () => {
    expect(
      parseOutput([
        {
          exercise: "Row",
          sets: [{ weight: 80, reps: "8", rest: null }],
        },
      ])[0].sets[0]
    ).toEqual({
      weight: 80,
      reps: "8",
      rest: null,
    });
  });

  it("keeps valid rpe and rir values as numbers", () => {
    expect(
      parseOutput([
        {
          exercise: "Bench Press",
          sets: [
            { weight: "100", reps: "5", rpe: "8.5", rir: "1" },
            { weight: "102.5", reps: "3", rpe: 9, rir: 0 },
          ],
        },
      ])[0].sets
    ).toEqual([
      { weight: "100", reps: "5", rpe: 8.5, rir: 1 },
      { weight: "102.5", reps: "3", rpe: 9, rir: 0 },
    ]);
  });

  it("removes invalid or null rpe and rir values", () => {
    expect(
      parseOutput([
        {
          exercise: "Bench Press",
          sets: [
            { weight: "100", reps: "5", rpe: 0, rir: -1 },
            { weight: "100", reps: "5", rpe: 10.5, rir: 10.5 },
            { weight: "100", reps: "5", rpe: null, rir: "" },
            { weight: "100", reps: "5", rpe: Number.NaN, rir: Number.POSITIVE_INFINITY },
          ],
        },
      ])[0].sets
    ).toEqual([
      { weight: "100", reps: "5" },
      { weight: "100", reps: "5" },
      { weight: "100", reps: "5" },
      { weight: "100", reps: "5" },
    ]);
  });

  it("normalizes supported failure values", () => {
    expect(
      parseOutput([
        {
          exercise: "Squat",
          sets: [
            { weight: "120", reps: "5", failure: true },
            { weight: "120", reps: "5", failure: false },
            { weight: "120", reps: "5", failure: "true" },
            { weight: "120", reps: "5", failure: "false" },
          ],
        },
      ])[0].sets
    ).toEqual([
      { weight: "120", reps: "5", failure: true },
      { weight: "120", reps: "5", failure: false },
      { weight: "120", reps: "5", failure: true },
      { weight: "120", reps: "5", failure: false },
    ]);
  });

  it("removes invalid or null failure values", () => {
    expect(
      parseOutput([
        {
          exercise: "Squat",
          sets: [
            { weight: "120", reps: "5", failure: null },
            { weight: "120", reps: "5", failure: "" },
            { weight: "120", reps: "5", failure: "yes" },
          ],
        },
      ])[0].sets
    ).toEqual([
      { weight: "120", reps: "5" },
      { weight: "120", reps: "5" },
      { weight: "120", reps: "5" },
    ]);
  });

  it("does not mutate input objects or arrays", () => {
    const input = [
      {
        exercise: "Bench Press",
        sets: [{ weight: "100", reps: "5", rpe: "8" }],
      },
    ];
    const original = JSON.parse(JSON.stringify(input));

    normalizeExercisesPayloadForSave(input);

    expect(input).toEqual(original);
  });

  it("always returns parseable JSON string output", () => {
    expect(() => JSON.parse(normalizeExercisesPayloadForSave({}))).not.toThrow();
    expect(() => JSON.parse(normalizeExercisesPayloadForSave([]))).not.toThrow();
    expect(() => JSON.parse(normalizeExercisesPayloadForSave("[{}]"))).not.toThrow();
  });
});
