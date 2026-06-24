import { summarizeSetEffort } from "../effortAnalytics";

describe("effortAnalytics", () => {
  describe("summarizeSetEffort", () => {
    it("returns an empty summary for empty input", () => {
      expect(summarizeSetEffort([])).toEqual({
        totalSetCount: 0,
        effortLoggedSetCount: 0,
        rpeCount: 0,
        averageRpe: null,
        rirCount: 0,
        averageRir: null,
        failureCount: 0,
      });
    });

    it("counts logged effort fields and averages rpe and rir", () => {
      expect(
        summarizeSetEffort([
          { rpe: 8, rir: 2, failure: null },
          { rpe: 9, rir: 1, failure: true },
          { rpe: null, rir: null, failure: null },
        ])
      ).toEqual({
        totalSetCount: 3,
        effortLoggedSetCount: 2,
        rpeCount: 2,
        averageRpe: 8.5,
        rirCount: 2,
        averageRir: 1.5,
        failureCount: 1,
      });
    });

    it("treats missing effort values as unknown rather than zero", () => {
      expect(
        summarizeSetEffort([
          { rpe: null, rir: null, failure: null },
          {},
        ])
      ).toEqual({
        totalSetCount: 2,
        effortLoggedSetCount: 0,
        rpeCount: 0,
        averageRpe: null,
        rirCount: 0,
        averageRir: null,
        failureCount: 0,
      });
    });

    it("counts failure false as logged effort but not as a failure set", () => {
      expect(
        summarizeSetEffort([
          { rpe: null, rir: null, failure: false },
          { rpe: null, rir: null, failure: true },
        ])
      ).toEqual({
        totalSetCount: 2,
        effortLoggedSetCount: 2,
        rpeCount: 0,
        averageRpe: null,
        rirCount: 0,
        averageRir: null,
        failureCount: 1,
      });
    });

    it("ignores non-finite rpe and rir values", () => {
      expect(
        summarizeSetEffort([
          { rpe: Number.NaN, rir: Number.POSITIVE_INFINITY, failure: null },
          { rpe: 7.25, rir: 2.5, failure: null },
        ])
      ).toEqual({
        totalSetCount: 2,
        effortLoggedSetCount: 1,
        rpeCount: 1,
        averageRpe: 7.25,
        rirCount: 1,
        averageRir: 2.5,
        failureCount: 0,
      });
    });

    it("rounds averages to two decimals", () => {
      expect(
        summarizeSetEffort([
          { rpe: 7, rir: 1, failure: null },
          { rpe: 8, rir: 2, failure: null },
          { rpe: 10, rir: 4, failure: null },
        ])
      ).toEqual({
        totalSetCount: 3,
        effortLoggedSetCount: 3,
        rpeCount: 3,
        averageRpe: 8.33,
        rirCount: 3,
        averageRir: 2.33,
        failureCount: 0,
      });
    });
  });
});
