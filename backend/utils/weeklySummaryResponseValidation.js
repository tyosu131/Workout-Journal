const HEADLINE_MAX_LENGTH = 120;
const SUMMARY_MAX_LENGTH = 1000;
const ARRAY_ITEM_MAX_LENGTH = 300;
const ARRAY_MAX_ITEMS = 8;

const ARRAY_FIELDS = [
  "highlights",
  "concerns",
  "nextWeekFocus",
  "dataQualityNotes",
];

const createEmptyWeeklySummaryResponse = () => ({
  headline: "Weekly summary unavailable",
  summary: "The weekly summary could not be validated.",
  highlights: [],
  concerns: [],
  nextWeekFocus: [],
  dataQualityNotes: ["Weekly summary response validation failed."],
});

const isRecord = (value) => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const truncate = (value, maxLength) => (
  value.length > maxLength ? value.slice(0, maxLength) : value
);

const normalizeStringArray = (value) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }

  return value
    .slice(0, ARRAY_MAX_ITEMS)
    .map((item) => truncate(item, ARRAY_ITEM_MAX_LENGTH));
};

const normalizeFallback = (fallback) => {
  const empty = createEmptyWeeklySummaryResponse();

  if (
    !isRecord(fallback) ||
    typeof fallback.headline !== "string" ||
    typeof fallback.summary !== "string"
  ) {
    return empty;
  }

  const normalizedArrays = {};
  for (const field of ARRAY_FIELDS) {
    const normalized = normalizeStringArray(fallback[field]);
    if (normalized === null) {
      return empty;
    }

    normalizedArrays[field] = normalized;
  }

  return {
    headline: truncate(fallback.headline, HEADLINE_MAX_LENGTH),
    summary: truncate(fallback.summary, SUMMARY_MAX_LENGTH),
    highlights: normalizedArrays.highlights,
    concerns: normalizedArrays.concerns,
    nextWeekFocus: normalizedArrays.nextWeekFocus,
    dataQualityNotes: normalizedArrays.dataQualityNotes,
  };
};

const validateStringField = (response, field, maxLength, errors) => {
  if (!(field in response)) {
    errors.push(`Missing required field: ${field}.`);
    return null;
  }

  const value = response[field];
  if (typeof value !== "string") {
    errors.push(`Invalid field type: ${field} must be a string.`);
    return null;
  }

  if (value.length > maxLength) {
    errors.push(`String too long: ${field} must be at most ${maxLength} characters.`);
    return null;
  }

  return value;
};

const validateArrayField = (response, field, errors) => {
  if (!(field in response)) {
    errors.push(`Missing required field: ${field}.`);
    return null;
  }

  const value = response[field];
  if (!Array.isArray(value)) {
    errors.push(`Invalid field type: ${field} must be a string array.`);
    return null;
  }

  if (value.length > ARRAY_MAX_ITEMS) {
    errors.push(`Too many items: ${field} must contain at most ${ARRAY_MAX_ITEMS} items.`);
    return null;
  }

  const invalidItemIndex = value.findIndex((item) => typeof item !== "string");
  if (invalidItemIndex !== -1) {
    errors.push(`Invalid array item: ${field}[${invalidItemIndex}] must be a string.`);
    return null;
  }

  const tooLongIndex = value.findIndex((item) => item.length > ARRAY_ITEM_MAX_LENGTH);
  if (tooLongIndex !== -1) {
    errors.push(
      `String too long: ${field}[${tooLongIndex}] must be at most ${ARRAY_ITEM_MAX_LENGTH} characters.`
    );
    return null;
  }

  return [...value];
};

const validateWeeklySummaryResponse = (response, fallback) => {
  const fallbackValue = normalizeFallback(fallback);
  const errors = [];

  if (!isRecord(response)) {
    return {
      ok: false,
      value: fallbackValue,
      errors: ["Response must be an object."],
    };
  }

  const headline = validateStringField(response, "headline", HEADLINE_MAX_LENGTH, errors);
  const summary = validateStringField(response, "summary", SUMMARY_MAX_LENGTH, errors);
  const highlights = validateArrayField(response, "highlights", errors);
  const concerns = validateArrayField(response, "concerns", errors);
  const nextWeekFocus = validateArrayField(response, "nextWeekFocus", errors);
  const dataQualityNotes = validateArrayField(response, "dataQualityNotes", errors);

  if (
    errors.length > 0 ||
    headline === null ||
    summary === null ||
    highlights === null ||
    concerns === null ||
    nextWeekFocus === null ||
    dataQualityNotes === null
  ) {
    return {
      ok: false,
      value: fallbackValue,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      headline,
      summary,
      highlights,
      concerns,
      nextWeekFocus,
      dataQualityNotes,
    },
    errors: [],
  };
};

const parseAndValidateWeeklySummaryResponse = (responseText, fallback) => {
  if (typeof responseText !== "string") {
    return {
      ok: false,
      value: normalizeFallback(fallback),
      errors: ["Response text must be a string."],
    };
  }

  try {
    return validateWeeklySummaryResponse(JSON.parse(responseText), fallback);
  } catch (error) {
    return {
      ok: false,
      value: normalizeFallback(fallback),
      errors: ["JSON parse error."],
    };
  }
};

module.exports = {
  createEmptyWeeklySummaryResponse,
  parseAndValidateWeeklySummaryResponse,
  validateWeeklySummaryResponse,
};
