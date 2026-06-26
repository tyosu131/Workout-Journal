const {
  createMockWeeklySummaryProvider,
} = require("./weeklySummaryProviderAdapter");

const weeklySummaryMockProvider = createMockWeeklySummaryProvider();

module.exports = {
  createMockWeeklySummaryProvider,
  weeklySummaryMockProvider,
};
