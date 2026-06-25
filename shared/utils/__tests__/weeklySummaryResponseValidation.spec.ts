import {
  createEmptyWeeklySummaryResponse,
  parseAndValidateWeeklySummaryResponse,
  validateWeeklySummaryResponse,
  type WeeklySummaryValidatedResponse,
} from "../weeklySummaryResponseValidation";

const validResponse: WeeklySummaryValidatedResponse = {
  headline: "Solid training week",
  summary: "You logged a consistent week with useful effort data.",
  highlights: ["Bench Press max estimated 1RM: 100."],
  concerns: ["Effort coverage is partial."],
  nextWeekFocus: ["Keep logging RPE/RIR."],
  dataQualityNotes: [],
};

const fallback: WeeklySummaryValidatedResponse = {
  headline: "Fallback summary",
  summary: "Using fallback weekly summary.",
  highlights: ["Fallback highlight."],
  concerns: ["Fallback concern."],
  nextWeekFocus: ["Fallback focus."],
  dataQualityNotes: ["Fallback data quality note."],
};

const longString = (length: number): string => "x".repeat(length);

describe("weeklySummaryResponseValidation", () => {
  describe("createEmptyWeeklySummaryResponse", () => {
    it("creates a safe default fallback response", () => {
      expect(createEmptyWeeklySummaryResponse()).toEqual({
        headline: "Weekly summary unavailable",
        summary: "The weekly summary could not be validated.",
        highlights: [],
        concerns: [],
        nextWeekFocus: [],
        dataQualityNotes: ["Weekly summary response validation failed."],
      });
    });
  });

  describe("validateWeeklySummaryResponse", () => {
    it("accepts a valid structured response", () => {
      expect(validateWeeklySummaryResponse(validResponse, fallback)).toEqual({
        ok: true,
        value: validResponse,
        errors: [],
      });
    });

    it("accepts empty arrays as valid", () => {
      const response: WeeklySummaryValidatedResponse = {
        headline: "Empty sections",
        summary: "All list sections are empty.",
        highlights: [],
        concerns: [],
        nextWeekFocus: [],
        dataQualityNotes: [],
      };

      expect(validateWeeklySummaryResponse(response, fallback)).toEqual({
        ok: true,
        value: response,
        errors: [],
      });
    });

    it("ignores extra fields on a valid response", () => {
      const response = {
        ...validResponse,
        extra: "ignored",
      };
      const result = validateWeeklySummaryResponse(response, fallback);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(validResponse);
      expect("extra" in result.value).toBe(false);
    });

    it("rejects a response with a missing required field and returns fallback", () => {
      const { summary, ...response } = validResponse;
      const result = validateWeeklySummaryResponse(response, fallback);

      expect(result).toEqual({
        ok: false,
        value: fallback,
        errors: ["Missing required field: summary."],
      });
    });

    it("rejects wrong field types and returns fallback", () => {
      const result = validateWeeklySummaryResponse({
        ...validResponse,
        headline: 123,
      }, fallback);

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(fallback);
      expect(result.errors).toContain("Invalid field type: headline must be a string.");
    });

    it("rejects non-string array items and returns fallback", () => {
      const result = validateWeeklySummaryResponse({
        ...validResponse,
        highlights: ["ok", 123],
      }, fallback);

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(fallback);
      expect(result.errors).toContain("Invalid array item: highlights[1] must be a string.");
    });

    it("rejects arrays with too many items and returns fallback", () => {
      const result = validateWeeklySummaryResponse({
        ...validResponse,
        concerns: Array.from({ length: 9 }, (_, index) => `concern-${index}`),
      }, fallback);

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(fallback);
      expect(result.errors).toContain("Too many items: concerns must contain at most 8 items.");
    });

    it("rejects overly long response strings and returns fallback", () => {
      const result = validateWeeklySummaryResponse({
        ...validResponse,
        headline: longString(121),
        summary: longString(1001),
        nextWeekFocus: [longString(301)],
      }, fallback);

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(fallback);
      expect(result.errors).toEqual(expect.arrayContaining([
        "String too long: headline must be at most 120 characters.",
        "String too long: summary must be at most 1000 characters.",
        "String too long: nextWeekFocus[0] must be at most 300 characters.",
      ]));
    });

    it("normalizes overly long fallback content deterministically", () => {
      const longFallback: WeeklySummaryValidatedResponse = {
        headline: longString(121),
        summary: longString(1001),
        highlights: Array.from({ length: 9 }, () => longString(301)),
        concerns: [],
        nextWeekFocus: [],
        dataQualityNotes: [],
      };
      const result = validateWeeklySummaryResponse({ headline: 123 }, longFallback);

      expect(result.ok).toBe(false);
      expect(result.value.headline).toHaveLength(120);
      expect(result.value.summary).toHaveLength(1000);
      expect(result.value.highlights).toHaveLength(8);
      expect(result.value.highlights[0]).toHaveLength(300);
    });

    it("uses the safe default when fallback is invalid", () => {
      const result = validateWeeklySummaryResponse(
        { headline: 123 },
        {
          ...fallback,
          highlights: ["ok", 123],
        } as unknown as WeeklySummaryValidatedResponse
      );

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(createEmptyWeeklySummaryResponse());
    });

    it("does not mutate response or fallback input", () => {
      const response = { ...validResponse };
      const fallbackInput = { ...fallback };
      const originalResponse = JSON.parse(JSON.stringify(response));
      const originalFallback = JSON.parse(JSON.stringify(fallbackInput));

      validateWeeklySummaryResponse(response, fallbackInput);

      expect(response).toEqual(originalResponse);
      expect(fallbackInput).toEqual(originalFallback);
    });

    it("returns deterministic output", () => {
      expect(validateWeeklySummaryResponse(validResponse, fallback)).toEqual(
        validateWeeklySummaryResponse(validResponse, fallback)
      );
    });
  });

  describe("parseAndValidateWeeklySummaryResponse", () => {
    it("accepts a valid JSON string response", () => {
      expect(
        parseAndValidateWeeklySummaryResponse(JSON.stringify(validResponse), fallback)
      ).toEqual({
        ok: true,
        value: validResponse,
        errors: [],
      });
    });

    it("returns fallback on invalid JSON", () => {
      const result = parseAndValidateWeeklySummaryResponse("{invalid", fallback);

      expect(result).toEqual({
        ok: false,
        value: fallback,
        errors: ["JSON parse error."],
      });
    });

    it("rejects JSON array, number, and string roots", () => {
      expect(parseAndValidateWeeklySummaryResponse("[]", fallback)).toMatchObject({
        ok: false,
        value: fallback,
        errors: ["Response must be an object."],
      });
      expect(parseAndValidateWeeklySummaryResponse("1", fallback)).toMatchObject({
        ok: false,
        value: fallback,
        errors: ["Response must be an object."],
      });
      expect(parseAndValidateWeeklySummaryResponse("\"text\"", fallback)).toMatchObject({
        ok: false,
        value: fallback,
        errors: ["Response must be an object."],
      });
    });

    it("returns fallback when JSON object has an invalid shape", () => {
      const result = parseAndValidateWeeklySummaryResponse(
        JSON.stringify({ ...validResponse, highlights: [1] }),
        fallback
      );

      expect(result.ok).toBe(false);
      expect(result.value).toEqual(fallback);
      expect(result.errors).toContain("Invalid array item: highlights[0] must be a string.");
    });
  });
});
