const weeklySummaryMockProvider = {
  async generateWeeklySummary() {
    return JSON.stringify({
      headline: "Mock weekly summary",
      summary: "This is a mocked weekly summary response.",
      highlights: [],
      concerns: [],
      nextWeekFocus: [],
      dataQualityNotes: [],
    });
  },
};

module.exports = {
  weeklySummaryMockProvider,
};
