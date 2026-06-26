const DEFAULT_MOCK_WEEKLY_SUMMARY_RESPONSE = {
  headline: "Mock weekly summary",
  summary: "This is a mocked weekly summary response.",
  highlights: [],
  concerns: [],
  nextWeekFocus: [],
  dataQualityNotes: [],
};

const createMockWeeklySummaryProvider = ({
  responseText,
  shouldThrow = false,
} = {}) => ({
  async generateWeeklySummary() {
    if (shouldThrow) {
      throw new Error("Mock weekly summary provider failed.");
    }

    return responseText ?? JSON.stringify(DEFAULT_MOCK_WEEKLY_SUMMARY_RESPONSE);
  },
});

const isWeeklySummaryProvider = (provider) => (
  Boolean(provider) && typeof provider.generateWeeklySummary === "function"
);

const getDefaultWeeklySummaryProvider = () => createMockWeeklySummaryProvider();

module.exports = {
  createMockWeeklySummaryProvider,
  getDefaultWeeklySummaryProvider,
  isWeeklySummaryProvider,
};
