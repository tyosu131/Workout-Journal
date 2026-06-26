import type {
  GrowthSignal,
  GrowthSignalsSummary,
  GrowthSignalStatus,
} from "./growthSignals";
import type {
  WeeklySummaryBig3Input,
  WeeklySummaryInput,
  WeeklySummaryMuscleGroupInput,
} from "./weeklySummaryInput";

export type WeeklySummaryPromptTone = "concise" | "coach_like" | "analytical";
export type WeeklySummaryPromptLocale = "en" | "ja";

export type WeeklySummaryPromptInput = {
  weeklySummaryInput: WeeklySummaryInput;
  locale?: WeeklySummaryPromptLocale;
  tone?: WeeklySummaryPromptTone;
};

export type WeeklySummaryPromptPayload = {
  system: string;
  task: string;
  constraints: string[];
  dataInterpretationRules: string[];
  outputFormat: string;
  data: WeeklySummaryInput;
};

export type WeeklySummaryPromptMessage = {
  role: "system" | "user";
  content: string;
};

const DEFAULT_LOCALE: WeeklySummaryPromptLocale = "en";
const DEFAULT_TONE: WeeklySummaryPromptTone = "concise";

const SYSTEM_INSTRUCTION = [
  "You summarize workout analytics data.",
  "You are not a medical professional and must not diagnose injuries or prescribe treatment.",
  "Use only the provided data.",
  "Mention uncertainty when data is sparse.",
  "Do not invent exercises, dates, weights, PRs, pain, injuries, or goals.",
].join(" ");

const BASE_CONSTRAINTS = [
  "Use only the provided aggregate data.",
  "Missing values are unknown.",
  "Missing effort values are not low effort.",
  "Do not give medical advice.",
  "Do not diagnose injuries.",
  "Do not prescribe a fixed training program.",
  "Do not infer user goals.",
  "Keep the output concise.",
  "Return JSON-compatible structured output.",
];

const DATA_INTERPRETATION_RULES = [
  "failure count means failure === true only.",
  "Sparse effort coverage lowers confidence.",
  "No BIG3 data means no strength trend conclusion.",
  "No muscle group data means no volume balance conclusion.",
  "No notes or no sets means a cautious summary.",
  "Raw note text is not provided.",
];

const OUTPUT_FORMAT = [
  "Return JSON-compatible structured output with these fields:",
  "- headline: string",
  "- summary: string",
  "- highlights: string[]",
  "- concerns: string[]",
  "- nextWeekFocus: string[]",
  "- dataQualityNotes: string[]",
  "Empty arrays are allowed.",
  "Do not include markdown.",
  "Do not invent data.",
].join("\n");

const TONE_INSTRUCTIONS: Record<WeeklySummaryPromptTone, string> = {
  analytical: "Emphasize concrete metrics and uncertainty without overexplaining.",
  coach_like: "Use supportive language, but do not prescribe a fixed training program.",
  concise: "Keep the reflection short and direct.",
};

const LOCALE_INSTRUCTIONS: Record<WeeklySummaryPromptLocale, string> = {
  en: "Write the output values in English.",
  ja: "Write the output values in Japanese, but keep JSON field names in English.",
};

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const toNonNegativeCount = (value: number | null | undefined): number => (
  isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0
);

const toNonNegativeNumber = (value: number | null | undefined): number => (
  isFiniteNumber(value) && value > 0 ? value : 0
);

const toFiniteNumberOrNull = (value: number | null | undefined): number | null => (
  isFiniteNumber(value) ? value : null
);

const toText = (value: string | null | undefined): string => (
  typeof value === "string" ? value : ""
);

const toNullableText = (value: string | null | undefined): string | null => (
  typeof value === "string" ? value : null
);

const resolveLocale = (
  locale: WeeklySummaryPromptLocale | undefined
): WeeklySummaryPromptLocale => (
  locale === "ja" || locale === "en" ? locale : DEFAULT_LOCALE
);

const resolveTone = (
  tone: WeeklySummaryPromptTone | undefined
): WeeklySummaryPromptTone => (
  tone === "analytical" || tone === "coach_like" || tone === "concise"
    ? tone
    : DEFAULT_TONE
);

const sanitizeBig3 = (
  big3: WeeklySummaryBig3Input[]
): WeeklySummaryBig3Input[] => {
  if (!Array.isArray(big3)) {
    return [];
  }

  return big3.map((summary) => ({
    lift: toText(summary.lift),
    latestEstimatedOneRepMax: toFiniteNumberOrNull(summary.latestEstimatedOneRepMax),
    maxEstimatedOneRepMax: toFiniteNumberOrNull(summary.maxEstimatedOneRepMax),
    trendPointCount: toNonNegativeCount(summary.trendPointCount),
  }));
};

const sanitizeMuscleGroups = (
  muscleGroups: WeeklySummaryMuscleGroupInput[]
): WeeklySummaryMuscleGroupInput[] => {
  if (!Array.isArray(muscleGroups)) {
    return [];
  }

  return muscleGroups.map((group) => ({
    muscle: toText(group.muscle),
    totalSets: toNonNegativeNumber(group.totalSets),
    totalVolumeLoad: toNonNegativeNumber(group.totalVolumeLoad),
  }));
};

const sanitizeDataQualityNotes = (notes: string[]): string[] => {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes.filter((note) => typeof note === "string");
};

const sanitizeGrowthSignalStatus = (
  status: GrowthSignalStatus | undefined
): GrowthSignalStatus => (
  status === "positive" ||
  status === "neutral" ||
  status === "watch" ||
  status === "unknown"
    ? status
    : "unknown"
);

const sanitizeGrowthSignalEvidence = (evidence: string[]): string[] => {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence.filter((item) => typeof item === "string");
};

const sanitizeGrowthSignals = (
  growthSignals: GrowthSignalsSummary | undefined,
  rangeStart: string,
  rangeEnd: string
): GrowthSignalsSummary => {
  if (!growthSignals || !Array.isArray(growthSignals.signals)) {
    return {
      rangeStart,
      rangeEnd,
      signals: [],
      dataQualityNotes: [],
    };
  }

  return {
    rangeStart: toText(growthSignals.rangeStart) || rangeStart,
    rangeEnd: toText(growthSignals.rangeEnd) || rangeEnd,
    signals: growthSignals.signals.map((signal: GrowthSignal) => ({
      id: toText(signal.id),
      label: toText(signal.label),
      status: sanitizeGrowthSignalStatus(signal.status),
      headline: toText(signal.headline),
      detail: toText(signal.detail),
      evidence: sanitizeGrowthSignalEvidence(signal.evidence),
      nextFocus: toNullableText(signal.nextFocus),
    })),
    dataQualityNotes: sanitizeDataQualityNotes(growthSignals.dataQualityNotes),
  };
};

const sanitizeWeeklySummaryInput = (
  input: WeeklySummaryInput
): WeeklySummaryInput => {
  const rangeStart = toText(input.rangeStart);
  const rangeEnd = toText(input.rangeEnd);
  const growthSignals = (
    input as WeeklySummaryInput & {
      growthSignals?: GrowthSignalsSummary;
    }
  ).growthSignals;

  return {
    rangeStart,
    rangeEnd,
    totalNotes: toNonNegativeCount(input.totalNotes),
    totalSets: toNonNegativeCount(input.totalSets),
    big3: sanitizeBig3(input.big3),
    muscleGroups: sanitizeMuscleGroups(input.muscleGroups),
    effort: {
      totalSetCount: toNonNegativeCount(input.effort.totalSetCount),
      effortLoggedSetCount: toNonNegativeCount(input.effort.effortLoggedSetCount),
      rpeCount: toNonNegativeCount(input.effort.rpeCount),
      averageRpe: toFiniteNumberOrNull(input.effort.averageRpe),
      rirCount: toNonNegativeCount(input.effort.rirCount),
      averageRir: toFiniteNumberOrNull(input.effort.averageRir),
      failureCount: toNonNegativeCount(input.effort.failureCount),
    },
    growthSignals: sanitizeGrowthSignals(growthSignals, rangeStart, rangeEnd),
    dataQualityNotes: sanitizeDataQualityNotes(input.dataQualityNotes),
  };
};

const buildTaskInstruction = (
  locale: WeeklySummaryPromptLocale,
  tone: WeeklySummaryPromptTone
): string => [
  "Summarize the weekly workout analytics data as a concise weekly reflection.",
  LOCALE_INSTRUCTIONS[locale],
  TONE_INSTRUCTIONS[tone],
  "Separate achievements, concerns, and next focus.",
].join(" ");

export const buildWeeklySummaryPromptPayload = (
  input: WeeklySummaryPromptInput
): WeeklySummaryPromptPayload => {
  const locale = resolveLocale(input.locale);
  const tone = resolveTone(input.tone);

  return {
    system: SYSTEM_INSTRUCTION,
    task: buildTaskInstruction(locale, tone),
    constraints: [...BASE_CONSTRAINTS],
    dataInterpretationRules: [...DATA_INTERPRETATION_RULES],
    outputFormat: OUTPUT_FORMAT,
    data: sanitizeWeeklySummaryInput(input.weeklySummaryInput),
  };
};

const formatListSection = (title: string, items: string[]): string => [
  `${title}:`,
  ...items.map((item) => `- ${item}`),
].join("\n");

export const toWeeklySummaryPromptMessages = (
  payload: WeeklySummaryPromptPayload
): WeeklySummaryPromptMessage[] => {
  const userContent = [
    "TASK:",
    payload.task,
    "",
    formatListSection("CONSTRAINTS", payload.constraints),
    "",
    formatListSection("DATA INTERPRETATION RULES", payload.dataInterpretationRules),
    "",
    "OUTPUT FORMAT:",
    payload.outputFormat,
    "",
    "DATA:",
    JSON.stringify(payload.data, null, 2),
  ].join("\n");

  return [
    {
      role: "system",
      content: payload.system,
    },
    {
      role: "user",
      content: userContent,
    },
  ];
};
