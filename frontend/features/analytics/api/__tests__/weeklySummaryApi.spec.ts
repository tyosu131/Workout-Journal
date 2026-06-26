/// <reference types="jest" />

const apiRequestWithAuth = jest.fn();

jest.mock("../../../../lib/apiClient", () => ({
  apiRequestWithAuth,
}));

const { generateWeeklySummaryAPI } = require("../weeklySummaryApi") as typeof import("../weeklySummaryApi");

const createRequest = () => ({
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  summaryInput: {
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
    growthSignals: {
      rangeStart: "2026-06-01",
      rangeEnd: "2026-06-07",
      signals: [
        {
          id: "effort",
          label: "Effort",
          status: "neutral" as const,
          headline: "Effort data is available",
          detail: "Logged effort data is available.",
          evidence: ["Effort coverage: 12 / 42 sets."],
          nextFocus: "Review effort alongside volume and top sets.",
        },
      ],
      dataQualityNotes: [],
    },
    dataQualityNotes: [],
  },
});

describe("weeklySummaryApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts the weekly summary request to the mocked backend endpoint", async () => {
    const request = createRequest();
    const response = {
      source: "ai",
      summary: {
        headline: "Mock weekly summary",
        summary: "This is a mocked weekly summary response.",
        highlights: [],
        concerns: [],
        nextWeekFocus: [],
        dataQualityNotes: [],
      },
      validationErrors: [],
    };
    apiRequestWithAuth.mockResolvedValue(response);

    await expect(generateWeeklySummaryAPI(request)).resolves.toEqual(response);

    expect(apiRequestWithAuth).toHaveBeenCalledWith(
      "/analytics/weekly-summary",
      "post",
      request
    );
  });

  it("rejects when the authenticated request fails", async () => {
    const error = new Error("Request failed");
    apiRequestWithAuth.mockRejectedValue(error);

    await expect(generateWeeklySummaryAPI(createRequest())).rejects.toBe(error);
  });
});
