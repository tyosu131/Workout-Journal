export type WeeklySummaryValidatedResponse = {
  headline: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  nextWeekFocus: string[];
  dataQualityNotes: string[];
};

export type WeeklySummaryResponseValidationResult =
  | {
      ok: true;
      value: WeeklySummaryValidatedResponse;
      errors: [];
    }
  | {
      ok: false;
      value: WeeklySummaryValidatedResponse;
      errors: string[];
    };

type StringField = "headline" | "summary";
type ArrayField = "highlights" | "concerns" | "nextWeekFocus" | "dataQualityNotes";

const HEADLINE_MAX_LENGTH = 120;
const SUMMARY_MAX_LENGTH = 1000;
const ARRAY_ITEM_MAX_LENGTH = 300;
const ARRAY_MAX_ITEMS = 8;

const STRING_FIELD_LIMITS: Record<StringField, number> = {
  headline: HEADLINE_MAX_LENGTH,
  summary: SUMMARY_MAX_LENGTH,
};

const ARRAY_FIELDS: ArrayField[] = [
  "highlights",
  "concerns",
  "nextWeekFocus",
  "dataQualityNotes",
];

export const createEmptyWeeklySummaryResponse = (): WeeklySummaryValidatedResponse => ({
  headline: "Weekly summary unavailable",
  summary: "The weekly summary could not be validated.",
  highlights: [],
  concerns: [],
  nextWeekFocus: [],
  dataQualityNotes: ["Weekly summary response validation failed."],
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const truncate = (value: string, maxLength: number): string => (
  value.length > maxLength ? value.slice(0, maxLength) : value
);

const normalizeFallbackArray = (
  value: unknown
): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.some((item) => typeof item !== "string")) {
    return null;
  }

  return value
    .slice(0, ARRAY_MAX_ITEMS)
    .map((item) => truncate(item, ARRAY_ITEM_MAX_LENGTH));
};

const normalizeFallback = (fallback: unknown): WeeklySummaryValidatedResponse => {
  const empty = createEmptyWeeklySummaryResponse();

  if (!isRecord(fallback)) {
    return empty;
  }

  if (
    typeof fallback.headline !== "string" ||
    typeof fallback.summary !== "string"
  ) {
    return empty;
  }

  const normalizedArrays = ARRAY_FIELDS.reduce<Partial<Record<ArrayField, string[]>>>(
    (result, field) => {
      const normalized = normalizeFallbackArray(fallback[field]);
      if (normalized === null) {
        return result;
      }

      return {
        ...result,
        [field]: normalized,
      };
    },
    {}
  );

  if (ARRAY_FIELDS.some((field) => normalizedArrays[field] === undefined)) {
    return empty;
  }

  return {
    headline: truncate(fallback.headline, HEADLINE_MAX_LENGTH),
    summary: truncate(fallback.summary, SUMMARY_MAX_LENGTH),
    highlights: normalizedArrays.highlights ?? [],
    concerns: normalizedArrays.concerns ?? [],
    nextWeekFocus: normalizedArrays.nextWeekFocus ?? [],
    dataQualityNotes: normalizedArrays.dataQualityNotes ?? [],
  };
};

const validateStringField = (
  response: Record<string, unknown>,
  field: StringField,
  errors: string[]
): string | null => {
  if (!(field in response)) {
    errors.push(`Missing required field: ${field}.`);
    return null;
  }

  const value = response[field];
  if (typeof value !== "string") {
    errors.push(`Invalid field type: ${field} must be a string.`);
    return null;
  }

  const limit = STRING_FIELD_LIMITS[field];
  if (value.length > limit) {
    errors.push(`String too long: ${field} must be at most ${limit} characters.`);
    return null;
  }

  return value;
};

const validateArrayField = (
  response: Record<string, unknown>,
  field: ArrayField,
  errors: string[]
): string[] | null => {
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

const validateResponseShape = (
  response: unknown
): { value: WeeklySummaryValidatedResponse | null; errors: string[] } => {
  const errors: string[] = [];

  if (!isRecord(response)) {
    return {
      value: null,
      errors: ["Response must be an object."],
    };
  }

  const headline = validateStringField(response, "headline", errors);
  const summary = validateStringField(response, "summary", errors);
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
      value: null,
      errors,
    };
  }

  return {
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

export const validateWeeklySummaryResponse = (
  response: unknown,
  fallback: WeeklySummaryValidatedResponse
): WeeklySummaryResponseValidationResult => {
  const fallbackValue = normalizeFallback(fallback);
  const result = validateResponseShape(response);

  if (result.value !== null) {
    return {
      ok: true,
      value: result.value,
      errors: [],
    };
  }

  return {
    ok: false,
    value: fallbackValue,
    errors: result.errors.length > 0
      ? result.errors
      : ["Weekly summary response validation failed."],
  };
};

export const parseAndValidateWeeklySummaryResponse = (
  responseText: string,
  fallback: WeeklySummaryValidatedResponse
): WeeklySummaryResponseValidationResult => {
  if (typeof responseText !== "string") {
    return {
      ok: false,
      value: normalizeFallback(fallback),
      errors: ["Response text must be a string."],
    };
  }

  try {
    return validateWeeklySummaryResponse(JSON.parse(responseText), fallback);
  } catch {
    return {
      ok: false,
      value: normalizeFallback(fallback),
      errors: ["JSON parse error."],
    };
  }
};
