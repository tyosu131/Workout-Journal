/** @jest-environment node */

const {
  createMockWeeklySummaryProvider,
  getDefaultWeeklySummaryProvider,
  isWeeklySummaryProvider,
} = require("../weeklySummaryProviderAdapter");

describe("weeklySummaryProviderAdapter", () => {
  it("default mock provider returns a valid JSON string", async () => {
    const provider = getDefaultWeeklySummaryProvider();
    const responseText = await provider.generateWeeklySummary([]);

    expect(typeof responseText).toBe("string");
    expect(JSON.parse(responseText)).toEqual({
      headline: "Mock weekly summary",
      summary: "This is a mocked weekly summary response.",
      highlights: [],
      concerns: [],
      nextWeekFocus: [],
      dataQualityNotes: [],
    });
  });

  it("mock provider can return custom responseText", async () => {
    const responseText = JSON.stringify({
      headline: "Custom",
      summary: "Custom response.",
      highlights: ["A"],
      concerns: [],
      nextWeekFocus: [],
      dataQualityNotes: [],
    });
    const provider = createMockWeeklySummaryProvider({ responseText });

    await expect(provider.generateWeeklySummary([])).resolves.toBe(responseText);
  });

  it("mock provider can throw when configured", async () => {
    const provider = createMockWeeklySummaryProvider({ shouldThrow: true });

    await expect(provider.generateWeeklySummary([])).rejects.toThrow(
      "Mock weekly summary provider failed."
    );
  });

  it("identifies valid weekly summary providers", () => {
    expect(isWeeklySummaryProvider({
      generateWeeklySummary: async () => "{}",
    })).toBe(true);
  });

  it("rejects invalid provider shapes", () => {
    expect(isWeeklySummaryProvider(null)).toBe(false);
    expect(isWeeklySummaryProvider(undefined)).toBe(false);
    expect(isWeeklySummaryProvider({})).toBe(false);
    expect(isWeeklySummaryProvider({ generateWeeklySummary: "not-a-function" })).toBe(false);
  });

  it("does not require provider-specific fields", () => {
    const provider = createMockWeeklySummaryProvider();

    expect(provider).toHaveProperty("generateWeeklySummary");
    expect(provider).not.toHaveProperty("model");
    expect(provider).not.toHaveProperty("temperature");
    expect(provider).not.toHaveProperty("apiKey");
  });

  it("does not mutate promptMessages", async () => {
    const provider = createMockWeeklySummaryProvider();
    const promptMessages = [
      {
        role: "system",
        content: "Use only aggregate data.",
      },
      {
        role: "user",
        content: "DATA: {}",
      },
    ];
    const original = JSON.parse(JSON.stringify(promptMessages));

    await provider.generateWeeklySummary(promptMessages);

    expect(promptMessages).toEqual(original);
  });
});
