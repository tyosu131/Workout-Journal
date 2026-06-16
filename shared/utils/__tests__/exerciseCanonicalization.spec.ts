import { EXERCISE_METADATA } from "../../constants/exerciseMetadata";
import {
  findExerciseMetadataByName,
  getCanonicalExerciseName,
  getExerciseLiftType,
} from "../exerciseCanonicalization";

describe("exercise canonicalization", () => {
  it("matches canonicalName exactly", () => {
    expect(findExerciseMetadataByName("Bench Press")?.canonicalName).toBe("Bench Press");
    expect(getCanonicalExerciseName("Bench Press")).toBe("Bench Press");
  });

  it("matches canonicalName case-insensitively", () => {
    expect(findExerciseMetadataByName("bench press")?.canonicalName).toBe("Bench Press");
    expect(getCanonicalExerciseName("bench press")).toBe("Bench Press");
  });

  it("matches aliases exactly", () => {
    expect(findExerciseMetadataByName("Competition Bench")?.canonicalName).toBe("Bench Press");
    expect(getCanonicalExerciseName("Competition Bench")).toBe("Bench Press");
  });

  it("matches aliases case-insensitively", () => {
    expect(findExerciseMetadataByName("competition bench")?.canonicalName).toBe("Bench Press");
    expect(getCanonicalExerciseName("competition bench")).toBe("Bench Press");
  });

  it("matches Japanese aliases", () => {
    expect(getCanonicalExerciseName("ベンチプレス")).toBe("Bench Press");
    expect(getCanonicalExerciseName("懸垂")).toBe("Pull Up");
  });

  it("trims input before matching", () => {
    expect(getCanonicalExerciseName("  Squat  ")).toBe("Squat");
    expect(getExerciseLiftType("  Squat  ")).toBe("squat");
  });

  it("returns the original trimmed name for unmatched input", () => {
    expect(findExerciseMetadataByName("Cable Fly")).toBeNull();
    expect(getCanonicalExerciseName("  Cable Fly  ")).toBe("Cable Fly");
    expect(getExerciseLiftType("Cable Fly")).toBeNull();
  });

  it("handles null, undefined, and empty input", () => {
    expect(findExerciseMetadataByName(null)).toBeNull();
    expect(findExerciseMetadataByName(undefined)).toBeNull();
    expect(findExerciseMetadataByName("")).toBeNull();
    expect(getCanonicalExerciseName(null)).toBe("");
    expect(getCanonicalExerciseName(undefined)).toBe("");
    expect(getCanonicalExerciseName("   ")).toBe("");
    expect(getExerciseLiftType(null)).toBeNull();
    expect(getExerciseLiftType(undefined)).toBeNull();
    expect(getExerciseLiftType("")).toBeNull();
  });

  it("returns bench, squat, and deadlift lift types", () => {
    expect(getExerciseLiftType("Bench Press")).toBe("bench");
    expect(getExerciseLiftType("スクワット")).toBe("squat");
    expect(getExerciseLiftType("デッドリフト")).toBe("deadlift");
  });

  it("returns null liftType for non-BIG3 exercises", () => {
    expect(getExerciseLiftType("Overhead Press")).toBeNull();
    expect(getExerciseLiftType("Lat Pulldown")).toBeNull();
  });

  it("includes the initial 10 metadata entries", () => {
    const canonicalNames = EXERCISE_METADATA.map((metadata) => metadata.canonicalName);

    expect(canonicalNames).toEqual([
      "Bench Press",
      "Squat",
      "Deadlift",
      "Overhead Press",
      "Barbell Row",
      "Pull Up",
      "Lat Pulldown",
      "Leg Press",
      "Romanian Deadlift",
      "Dumbbell Press",
    ]);
  });

  it("does not mutate input", () => {
    const input = "  bench press  ";

    getCanonicalExerciseName(input);
    getExerciseLiftType(input);

    expect(input).toBe("  bench press  ");
  });
});
