/** @jest-environment node */

const verifyToken = jest.fn();

jest.mock("../../utils/authUtils", () => ({
  verifyToken,
}));

const {
  SUMMARY_SOURCE_AI,
  SUMMARY_SOURCE_FALLBACK,
  buildWeeklySummaryPromptMessages,
  generateWeeklySummary,
  handleGenerateWeeklySummary,
} = require("../weeklySummaryService");

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const createSummaryInput = () => ({
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  totalNotes: 3,
  totalSets: 42,
  big3: [],
  muscleGroups: [],
  effort: {
    totalSetCount: 42,
    effortLoggedSetCount: 12,
    rpeCount: 10,
    averageRpe: 8.1,
    rirCount: 8,
    averageRir: 1.5,
    failureCount: 2,
  },
  dataQualityNotes: [],
});

const createValidProviderResponse = () => JSON.stringify({
  headline: "Provider weekly summary",
  summary: "Provider summary text.",
  highlights: ["42 sets logged."],
  concerns: [],
  nextWeekFocus: ["Keep logging effort."],
  dataQualityNotes: [],
});

describe("weeklySummaryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildWeeklySummaryPromptMessages", () => {
    it("builds provider-neutral system and user messages", () => {
      const messages = buildWeeklySummaryPromptMessages({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
      });

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: "system",
        content: expect.stringContaining("Use only the provided aggregate data."),
      });
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toContain("TASK:");
      expect(messages[1].content).toContain("CONSTRAINTS:");
      expect(messages[1].content).toContain("DATA:");
      expect(messages[1].content).not.toContain("rawNoteText");
      expect(messages[1]).not.toHaveProperty("model");
      expect(messages[1]).not.toHaveProperty("temperature");
    });
  });

  describe("generateWeeklySummary", () => {
    it("uses the default mock provider when provider is omitted", async () => {
      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
      });

      expect(result).toEqual({
        source: SUMMARY_SOURCE_AI,
        summary: {
          headline: "Mock weekly summary",
          summary: "This is a mocked weekly summary response.",
          highlights: [],
          concerns: [],
          nextWeekFocus: [],
          dataQualityNotes: [],
        },
        validationErrors: [],
      });
    });

    it("returns source ai when the mocked provider returns a valid response", async () => {
      const provider = {
        generateWeeklySummary: jest.fn().mockResolvedValue(createValidProviderResponse()),
      };

      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
        provider,
      });

      expect(provider.generateWeeklySummary).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual({
        source: SUMMARY_SOURCE_AI,
        summary: {
          headline: "Provider weekly summary",
          summary: "Provider summary text.",
          highlights: ["42 sets logged."],
          concerns: [],
          nextWeekFocus: ["Keep logging effort."],
          dataQualityNotes: [],
        },
        validationErrors: [],
      });
    });

    it("uses the default mock provider when an injected provider shape is invalid", async () => {
      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
        provider: { model: "not-used" },
      });

      expect(result).toEqual({
        source: SUMMARY_SOURCE_AI,
        summary: {
          headline: "Mock weekly summary",
          summary: "This is a mocked weekly summary response.",
          highlights: [],
          concerns: [],
          nextWeekFocus: [],
          dataQualityNotes: [],
        },
        validationErrors: [],
      });
    });

    it("returns rule_based_fallback when the provider returns invalid JSON", async () => {
      const provider = {
        generateWeeklySummary: jest.fn().mockResolvedValue("{not-json"),
      };

      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
        provider,
      });

      expect(result.source).toBe(SUMMARY_SOURCE_FALLBACK);
      expect(result.summary.headline).toBe("Weekly training summary");
      expect(result.validationErrors).toContain("JSON parse error.");
    });

    it("returns rule_based_fallback when the provider returns an invalid shape", async () => {
      const provider = {
        generateWeeklySummary: jest.fn().mockResolvedValue(JSON.stringify({
          headline: "Missing arrays",
          summary: "Invalid shape.",
        })),
      };

      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
        provider,
      });

      expect(result.source).toBe(SUMMARY_SOURCE_FALLBACK);
      expect(result.validationErrors).toEqual(expect.arrayContaining([
        "Missing required field: highlights.",
        "Missing required field: concerns.",
        "Missing required field: nextWeekFocus.",
        "Missing required field: dataQualityNotes.",
      ]));
    });

    it("returns rule_based_fallback when the provider throws", async () => {
      const provider = {
        generateWeeklySummary: jest.fn().mockRejectedValue(new Error("provider failed")),
      };

      const result = await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput: createSummaryInput(),
        provider,
      });

      expect(result.source).toBe(SUMMARY_SOURCE_FALLBACK);
      expect(result.validationErrors).toEqual(["Provider request failed."]);
    });

    it("does not mutate input", async () => {
      const provider = {
        generateWeeklySummary: jest.fn().mockResolvedValue(createValidProviderResponse()),
      };
      const summaryInput = createSummaryInput();
      const original = JSON.parse(JSON.stringify(summaryInput));

      await generateWeeklySummary({
        rangeStart: "2026-06-01",
        rangeEnd: "2026-06-07",
        summaryInput,
        provider,
      });

      expect(summaryInput).toEqual(original);
    });
  });

  describe("handleGenerateWeeklySummary", () => {
    it("returns 401 when Authorization token is missing", async () => {
      const req = {
        headers: {},
        body: {},
      };
      const res = createResponse();

      await handleGenerateWeeklySummary(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Authorization token missing" });
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it("returns 401 when verifyToken returns null", async () => {
      verifyToken.mockResolvedValue(null);
      const req = {
        headers: { authorization: "Bearer invalid-token" },
        body: {},
      };
      const res = createResponse();

      await handleGenerateWeeklySummary(req, res);

      expect(verifyToken).toHaveBeenCalledWith("invalid-token");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    });

    it("returns 400 for an invalid request", async () => {
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        headers: { authorization: "Bearer valid-token" },
        body: {
          rangeStart: "2026-06-07",
          rangeEnd: "2026-06-01",
          summaryInput: {},
        },
      };
      const res = createResponse();

      await handleGenerateWeeklySummary(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid weekly summary request",
        details: ["rangeEnd must be on or after rangeStart."],
      });
    });

    it("returns a mocked provider summary for a valid authenticated request", async () => {
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        headers: { authorization: "Bearer valid-token" },
        body: {
          rangeStart: "2026-06-01",
          rangeEnd: "2026-06-07",
          summaryInput: createSummaryInput(),
        },
      };
      const res = createResponse();

      await handleGenerateWeeklySummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        source: SUMMARY_SOURCE_AI,
        summary: {
          headline: "Mock weekly summary",
          summary: "This is a mocked weekly summary response.",
          highlights: [],
          concerns: [],
          nextWeekFocus: [],
          dataQualityNotes: [],
        },
        validationErrors: [],
      });
    });
  });
});
