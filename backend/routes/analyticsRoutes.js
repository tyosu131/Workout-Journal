const express = require("express");
const {
  handleGenerateWeeklySummary,
} = require("../services/weeklySummaryService");

const router = express.Router();

router.post("/weekly-summary", handleGenerateWeeklySummary);

module.exports = router;
