import {
  normalizeFailure,
  normalizeRir,
  normalizeRpe,
  normalizeSetIntensity,
} from "../setIntensityValidation";

describe("setIntensityValidation", () => {
  describe("normalizeRpe", () => {
    it("normalizes empty values to null", () => {
      expect(normalizeRpe(null)).toBeNull();
      expect(normalizeRpe(undefined)).toBeNull();
      expect(normalizeRpe("")).toBeNull();
      expect(normalizeRpe("  ")).toBeNull();
    });

    it("keeps valid numeric values", () => {
      expect(normalizeRpe(1)).toBe(1);
      expect(normalizeRpe(7.5)).toBe(7.5);
      expect(normalizeRpe(10)).toBe(10);
      expect(normalizeRpe("8.5")).toBe(8.5);
    });

    it("normalizes out-of-range and invalid values to null", () => {
      expect(normalizeRpe(0)).toBeNull();
      expect(normalizeRpe(10.5)).toBeNull();
      expect(normalizeRpe(-1)).toBeNull();
      expect(normalizeRpe(Number.NaN)).toBeNull();
      expect(normalizeRpe(Number.POSITIVE_INFINITY)).toBeNull();
      expect(normalizeRpe(Number.NEGATIVE_INFINITY)).toBeNull();
      expect(normalizeRpe("abc")).toBeNull();
    });
  });

  describe("normalizeRir", () => {
    it("normalizes empty values to null", () => {
      expect(normalizeRir(null)).toBeNull();
      expect(normalizeRir(undefined)).toBeNull();
      expect(normalizeRir("")).toBeNull();
      expect(normalizeRir("  ")).toBeNull();
    });

    it("keeps valid numeric values", () => {
      expect(normalizeRir(0)).toBe(0);
      expect(normalizeRir(2)).toBe(2);
      expect(normalizeRir(10)).toBe(10);
      expect(normalizeRir("1")).toBe(1);
    });

    it("normalizes out-of-range and invalid values to null", () => {
      expect(normalizeRir(-1)).toBeNull();
      expect(normalizeRir(10.5)).toBeNull();
      expect(normalizeRir(Number.NaN)).toBeNull();
      expect(normalizeRir(Number.POSITIVE_INFINITY)).toBeNull();
      expect(normalizeRir(Number.NEGATIVE_INFINITY)).toBeNull();
      expect(normalizeRir("abc")).toBeNull();
    });
  });

  describe("normalizeFailure", () => {
    it("keeps boolean values", () => {
      expect(normalizeFailure(true)).toBe(true);
      expect(normalizeFailure(false)).toBe(false);
    });

    it("parses supported string values", () => {
      expect(normalizeFailure("true")).toBe(true);
      expect(normalizeFailure("false")).toBe(false);
    });

    it("normalizes empty and invalid values to null", () => {
      expect(normalizeFailure(null)).toBeNull();
      expect(normalizeFailure(undefined)).toBeNull();
      expect(normalizeFailure("")).toBeNull();
      expect(normalizeFailure("  ")).toBeNull();
      expect(normalizeFailure("yes")).toBeNull();
      expect(normalizeFailure(1)).toBeNull();
    });
  });

  describe("normalizeSetIntensity", () => {
    it("normalizes all valid fields", () => {
      expect(
        normalizeSetIntensity({
          rpe: "8.5",
          rir: 1,
          failure: "false",
        })
      ).toEqual({
        rpe: 8.5,
        rir: 1,
        failure: false,
      });
    });

    it("returns null fields for missing values", () => {
      expect(normalizeSetIntensity({})).toEqual({
        rpe: null,
        rir: null,
        failure: null,
      });
    });

    it("handles null, undefined, and non-object input", () => {
      const expected = {
        rpe: null,
        rir: null,
        failure: null,
      };

      expect(normalizeSetIntensity(null)).toEqual(expected);
      expect(normalizeSetIntensity(undefined)).toEqual(expected);
      expect(normalizeSetIntensity("not-an-object")).toEqual(expected);
      expect(normalizeSetIntensity(123)).toEqual(expected);
    });

    it("normalizes invalid values to null", () => {
      expect(
        normalizeSetIntensity({
          rpe: 11,
          rir: -1,
          failure: "no",
        })
      ).toEqual({
        rpe: null,
        rir: null,
        failure: null,
      });
    });

    it("does not mutate input", () => {
      const input = {
        rpe: "9",
        rir: "0",
        failure: true,
      };
      const original = { ...input };

      normalizeSetIntensity(input);

      expect(input).toEqual(original);
    });
  });
});
