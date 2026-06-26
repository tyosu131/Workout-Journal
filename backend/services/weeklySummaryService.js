const { verifyToken } = require("../utils/authUtils");
const {
  validateWeeklySummaryRequest,
} = require("../utils/weeklySummaryRequestValidation");
const {
  parseAndValidateWeeklySummaryResponse,
} = require("../utils/weeklySummaryResponseValidation");
const {
  weeklySummaryMockProvider,
} = require("../utils/weeklySummaryMockProvider");

const SUMMARY_SOURCE_AI = "ai";
const SUMMARY_SOURCE_FALLBACK = "rule_based_fallback";

const isFiniteNumber = (value) => (
  typeof value === "number" && Number.isFinite(value)
);

const toCount = (value) => (
  isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0
);

const getDataQualityNotes = (summaryInput) => (
  Array.isArray(summaryInput.dataQualityNotes)
    ? summaryInput.dataQualityNotes.filter((note) => typeof note === "string")
    : []
);

const buildRuleBasedFallbackSummary = ({
  rangeStart,
  rangeEnd,
  summaryInput,
}) => {
  const totalNotes = toCount(summaryInput.totalNotes);
  const totalSets = toCount(summaryInput.totalSets);
  const dataQualityNotes = getDataQualityNotes(summaryInput);

  if (totalSets === 0) {
    return {
      headline: "No training data in this range",
      summary: `No normalized training sets were found from ${rangeStart} to ${rangeEnd}.`,
      highlights: [],
      concerns: dataQualityNotes,
      nextWeekFocus: ["Keep logging workouts to unlock weekly summaries."],
      dataQualityNotes,
    };
  }

  const effort = summaryInput.effort && typeof summaryInput.effort === "object"
    ? summaryInput.effort
    : {};
  const effortLoggedSetCount = toCount(effort.effortLoggedSetCount);
  const totalEffortSetCount = toCount(effort.totalSetCount);
  const failureCount = toCount(effort.failureCount);

  const highlights = [
    `${totalNotes} workout notes produced ${totalSets} normalized sets.`,
  ];

  if (effortLoggedSetCount > 0) {
    highlights.push(
      `Effort coverage: ${effortLoggedSetCount} / ${totalEffortSetCount} sets.`
    );
  }

  return {
    headline: "Weekly training summary",
    summary: `From ${rangeStart} to ${rangeEnd}, ${totalNotes} workout notes produced ${totalSets} normalized sets.`,
    highlights,
    concerns: dataQualityNotes,
    nextWeekFocus: [
      "Review top lifts, muscle group volume, and effort coverage before the next week.",
    ],
    dataQualityNotes: [
      ...dataQualityNotes,
      ...(failureCount > 0 ? [`Failure sets logged: ${failureCount}.`] : []),
    ],
  };
};

const buildWeeklySummaryPromptMessages = ({
  rangeStart,
  rangeEnd,
  summaryInput,
}) => [
  {
    role: "system",
    content: [
      "You summarize workout analytics data.",
      "Use only the provided aggregate data.",
      "Do not provide medical advice or diagnose injuries.",
      "Do not invent exercises, dates, weights, PRs, pain, injuries, or goals.",
      "Return JSON-compatible structured output.",
    ].join(" "),
  },
  {
    role: "user",
    content: [
      "TASK:",
      "Summarize the weekly workout analytics data.",
      "",
      "CONSTRAINTS:",
      "- Missing values are unknown.",
      "- Missing effort values are not low effort.",
      "- Do not prescribe a fixed training program.",
      "- Keep the output concise.",
      "",
      "OUTPUT FORMAT:",
      "- headline: string",
      "- summary: string",
      "- highlights: string[]",
      "- concerns: string[]",
      "- nextWeekFocus: string[]",
      "- dataQualityNotes: string[]",
      "",
      "DATA:",
      JSON.stringify({
        rangeStart,
        rangeEnd,
        summaryInput,
      }, null, 2),
    ].join("\n"),
  },
];

const generateWeeklySummary = async ({
  rangeStart,
  rangeEnd,
  summaryInput,
  provider = weeklySummaryMockProvider,
}) => {
  const fallback = buildRuleBasedFallbackSummary({
    rangeStart,
    rangeEnd,
    summaryInput,
  });
  const promptMessages = buildWeeklySummaryPromptMessages({
    rangeStart,
    rangeEnd,
    summaryInput,
  });

  try {
    const providerResponse = await provider.generateWeeklySummary(promptMessages);
    const validationResult = parseAndValidateWeeklySummaryResponse(
      providerResponse,
      fallback
    );

    if (validationResult.ok) {
      return {
        source: SUMMARY_SOURCE_AI,
        summary: validationResult.value,
        validationErrors: [],
      };
    }

    return {
      source: SUMMARY_SOURCE_FALLBACK,
      summary: validationResult.value,
      validationErrors: validationResult.errors,
    };
  } catch (error) {
    return {
      source: SUMMARY_SOURCE_FALLBACK,
      summary: fallback,
      validationErrors: ["Provider request failed."],
    };
  }
};

const getBearerToken = (req) => req.headers.authorization?.split(" ")[1];

const handleGenerateWeeklySummary = async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const validation = validateWeeklySummaryRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        error: "Invalid weekly summary request",
        details: validation.errors,
      });
    }

    const result = await generateWeeklySummary({
      rangeStart: validation.value.rangeStart,
      rangeEnd: validation.value.rangeEnd,
      summaryInput: validation.value.summaryInput,
      userId: user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Weekly summary endpoint failed:", error.message);
    return res.status(500).json({ error: "Failed to generate weekly summary" });
  }
};

module.exports = {
  SUMMARY_SOURCE_AI,
  SUMMARY_SOURCE_FALLBACK,
  buildRuleBasedFallbackSummary,
  buildWeeklySummaryPromptMessages,
  generateWeeklySummary,
  handleGenerateWeeklySummary,
};
