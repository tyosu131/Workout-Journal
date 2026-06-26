/** @jest-environment node */

const {
  MAX_RANGE_DAYS,
  validateWeeklySummaryRequest,
} = require("../weeklySummaryRequestValidation");

const validBody = {
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  summaryInput: {
    totalNotes: 3,
    totalSets: 42,
    dataQualityNotes: [],
  },
};

describe("weeklySummaryRequestValidation", () => {
  it("accepts a valid request", () => {
    expect(validateWeeklySummaryRequest(validBody)).toEqual({
      ok: true,
      value: validBody,
      errors: [],
    });
  });

  it("rejects an invalid rangeStart", () => {
    const result = validateWeeklySummaryRequest({
      ...validBody,
      rangeStart: "2026-02-30",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("rangeStart must be a valid YYYY-MM-DD date.");
  });

  it("rejects an invalid rangeEnd", () => {
    const result = validateWeeklySummaryRequest({
      ...validBody,
      rangeEnd: "2026/06/07",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("rangeEnd must be a valid YYYY-MM-DD date.");
  });

  it("rejects a rangeEnd before rangeStart", () => {
    const result = validateWeeklySummaryRequest({
      ...validBody,
      rangeStart: "2026-06-08",
      rangeEnd: "2026-06-07",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("rangeEnd must be on or after rangeStart.");
  });

  it("rejects a range longer than the configured maximum", () => {
    const result = validateWeeklySummaryRequest({
      ...validBody,
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`Date range must be ${MAX_RANGE_DAYS} days or less.`);
  });

  it("rejects a missing summaryInput", () => {
    const result = validateWeeklySummaryRequest({
      rangeStart: "2026-06-01",
      rangeEnd: "2026-06-07",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("summaryInput must be an object.");
  });

  it("rejects a non-object summaryInput", () => {
    const cases = [null, [], "summary"];

    cases.forEach((summaryInput) => {
      const result = validateWeeklySummaryRequest({
        ...validBody,
        summaryInput,
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain("summaryInput must be an object.");
    });
  });

  it("rejects raw note content fields", () => {
    const result = validateWeeklySummaryRequest({
      ...validBody,
      summaryInput: {
        totalNotes: 1,
        nested: {
          noteText: "private workout note",
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Raw note content field is not allowed: noteText.");
  });

  it("rejects a non-object request body", () => {
    const result = validateWeeklySummaryRequest(null);

    expect(result).toEqual({
      ok: false,
      value: null,
      errors: ["Request body must be an object."],
    });
  });
});
