import type {
  EffortAnalyticsSummary,
} from "./effortAnalytics";
import type {
  WeeklySummaryBig3Input,
  WeeklySummaryInput,
  WeeklySummaryMuscleGroupInput,
} from "./weeklySummaryInput";

export type RuleBasedWeeklySummary = {
  headline: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  nextWeekFocus: string[];
  dataQualityNotes: string[];
};

const NO_BIG3_NOTE = "No BIG3 trend data found in this range.";
const NO_MUSCLE_NOTE = "No muscle group volume data found in this range.";
const NO_EFFORT_NOTE = "No effort data logged in this range.";
const SPARSE_EFFORT_NOTE = "Effort data is sparse in this range.";

const formatNumber = (value: number): string => (
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)
);

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const isPositiveFiniteNumber = (
  value: number | null | undefined
): value is number => (
  isFiniteNumber(value) && value > 0
);

const toCount = (value: number | null | undefined): number => (
  isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0
);

const toFiniteNumberOrNull = (value: number | null | undefined): number | null => (
  isFiniteNumber(value) ? value : null
);

const sanitizeEffortSummary = (
  effort: EffortAnalyticsSummary
): EffortAnalyticsSummary => ({
  totalSetCount: toCount(effort.totalSetCount),
  effortLoggedSetCount: toCount(effort.effortLoggedSetCount),
  rpeCount: toCount(effort.rpeCount),
  averageRpe: toFiniteNumberOrNull(effort.averageRpe),
  rirCount: toCount(effort.rirCount),
  averageRir: toFiniteNumberOrNull(effort.averageRir),
  failureCount: toCount(effort.failureCount),
});

const formatLift = (lift: string): string => {
  switch (lift) {
    case "bench":
      return "Bench Press";
    case "deadlift":
      return "Deadlift";
    case "squat":
      return "Squat";
    default:
      return lift;
  }
};

const getDataQualityNotes = (input: WeeklySummaryInput): string[] => (
  Array.isArray(input.dataQualityNotes)
    ? input.dataQualityNotes.filter((note) => typeof note === "string")
    : []
);

const getTopBig3 = (
  big3: WeeklySummaryBig3Input[]
): WeeklySummaryBig3Input | null => {
  if (!Array.isArray(big3)) {
    return null;
  }

  return [...big3]
    .filter((summary) => isPositiveFiniteNumber(summary.maxEstimatedOneRepMax))
    .sort((a, b) => {
      const valueCompare = (b.maxEstimatedOneRepMax ?? 0)
        - (a.maxEstimatedOneRepMax ?? 0);

      return valueCompare !== 0
        ? valueCompare
        : formatLift(a.lift).localeCompare(formatLift(b.lift));
    })[0] ?? null;
};

const getTopMuscleGroup = (
  muscleGroups: WeeklySummaryMuscleGroupInput[]
): WeeklySummaryMuscleGroupInput | null => {
  if (!Array.isArray(muscleGroups)) {
    return null;
  }

  return [...muscleGroups]
    .filter((group) => isPositiveFiniteNumber(group.totalSets))
    .sort((a, b) => {
      const setCompare = b.totalSets - a.totalSets;

      return setCompare !== 0 ? setCompare : a.muscle.localeCompare(b.muscle);
    })[0] ?? null;
};

const buildSummaryText = ({
  input,
  totalNotes,
  totalSets,
  topBig3,
}: {
  input: WeeklySummaryInput;
  totalNotes: number;
  totalSets: number;
  topBig3: WeeklySummaryBig3Input | null;
}): string => {
  if (totalSets === 0) {
    return `No normalized training sets were found from ${input.rangeStart} to ${input.rangeEnd}. Keep logging workouts to unlock weekly trends.`;
  }

  const parts = [
    `From ${input.rangeStart} to ${input.rangeEnd}, ${totalNotes} workout notes produced ${totalSets} normalized sets.`,
  ];

  if (topBig3?.maxEstimatedOneRepMax !== null && topBig3) {
    parts.push(
      `The strongest BIG3 signal was ${formatLift(topBig3.lift)} at ${formatNumber(topBig3.maxEstimatedOneRepMax)} estimated 1RM.`
    );
  }

  if (input.effort.effortLoggedSetCount > 0) {
    const effortDetails = [
      `effort was logged for ${input.effort.effortLoggedSetCount} / ${input.effort.totalSetCount} sets`,
    ];

    if (isFiniteNumber(input.effort.averageRpe)) {
      effortDetails.push(`average RPE ${formatNumber(input.effort.averageRpe)}`);
    }

    if (isFiniteNumber(input.effort.averageRir)) {
      effortDetails.push(`average RIR ${formatNumber(input.effort.averageRir)}`);
    }

    effortDetails.push(`${input.effort.failureCount} failure sets`);
    parts.push(`${effortDetails.join(", ")}.`);
  } else {
    parts.push("No RPE, RIR, or failure data was logged, so effort trends are unknown.");
  }

  return parts.join(" ");
};

const buildHighlights = ({
  input,
  topBig3,
  topMuscleGroup,
}: {
  input: WeeklySummaryInput;
  topBig3: WeeklySummaryBig3Input | null;
  topMuscleGroup: WeeklySummaryMuscleGroupInput | null;
}): string[] => {
  const highlights: string[] = [];

  if (topBig3?.maxEstimatedOneRepMax !== null && topBig3) {
    highlights.push(
      `${formatLift(topBig3.lift)} max estimated 1RM: ${formatNumber(topBig3.maxEstimatedOneRepMax)}.`
    );
  }

  if (topMuscleGroup) {
    const volumeText = isPositiveFiniteNumber(topMuscleGroup.totalVolumeLoad)
      ? `, ${formatNumber(topMuscleGroup.totalVolumeLoad)} volume load`
      : "";

    highlights.push(
      `${topMuscleGroup.muscle} had the highest logged muscle volume: ${formatNumber(topMuscleGroup.totalSets)} sets${volumeText}.`
    );
  }

  if (input.effort.effortLoggedSetCount > 0) {
    highlights.push(
      `Effort coverage: ${input.effort.effortLoggedSetCount} / ${input.effort.totalSetCount} sets logged RPE, RIR, or failure.`
    );
  }

  return highlights;
};

const buildConcerns = (input: WeeklySummaryInput, dataQualityNotes: string[]): string[] => {
  const concerns: string[] = [];

  if (dataQualityNotes.includes(NO_BIG3_NOTE)) {
    concerns.push("No BIG3 trend data was available for this range.");
  }

  if (dataQualityNotes.includes(NO_MUSCLE_NOTE)) {
    concerns.push("No muscle group volume data was available for this range.");
  }

  if (dataQualityNotes.includes(NO_EFFORT_NOTE)) {
    concerns.push("No effort data was logged, so intensity trends are unknown.");
  } else if (dataQualityNotes.includes(SPARSE_EFFORT_NOTE)) {
    concerns.push("Effort data is sparse, so intensity trends may be less reliable.");
  }

  if (
    input.effort.totalSetCount > 0 &&
    input.effort.failureCount >= 3 &&
    input.effort.failureCount / input.effort.totalSetCount >= 0.25
  ) {
    concerns.push(
      `Failure sets were relatively frequent: ${input.effort.failureCount} / ${input.effort.totalSetCount} sets were marked as failure.`
    );
  }

  return concerns;
};

const buildNextWeekFocus = ({
  input,
  totalSets,
  topBig3,
  topMuscleGroup,
}: {
  input: WeeklySummaryInput;
  totalSets: number;
  topBig3: WeeklySummaryBig3Input | null;
  topMuscleGroup: WeeklySummaryMuscleGroupInput | null;
}): string[] => {
  if (totalSets === 0) {
    return ["Log workouts consistently to unlock weekly summaries."];
  }

  const focus: string[] = [];
  const effortCoverage = input.effort.totalSetCount > 0
    ? input.effort.effortLoggedSetCount / input.effort.totalSetCount
    : 0;

  if (effortCoverage < 0.75) {
    focus.push("Keep logging RPE/RIR for better effort tracking.");
  }

  focus.push(
    topBig3
      ? "Watch whether top lifts trend up or down next week."
      : "Log squat, bench, or deadlift sets if BIG3 tracking matters."
  );

  focus.push(
    topMuscleGroup
      ? "Review muscle group volume balance across the week."
      : "Review muscle group volume balance as more data is logged."
  );

  return focus;
};

export const buildRuleBasedWeeklySummary = (
  input: WeeklySummaryInput
): RuleBasedWeeklySummary => {
  const totalNotes = toCount(input.totalNotes);
  const totalSets = toCount(input.totalSets);
  const dataQualityNotes = getDataQualityNotes(input);
  const safeInput = {
    ...input,
    totalNotes,
    totalSets,
    effort: sanitizeEffortSummary(input.effort),
  };
  const topBig3 = getTopBig3(input.big3);
  const topMuscleGroup = getTopMuscleGroup(input.muscleGroups);

  return {
    headline: totalSets === 0
      ? "No training data in this range"
      : "Weekly training summary",
    summary: buildSummaryText({
      input: safeInput,
      totalNotes,
      totalSets,
      topBig3,
    }),
    highlights: buildHighlights({
      input: safeInput,
      topBig3,
      topMuscleGroup,
    }),
    concerns: buildConcerns(safeInput, dataQualityNotes),
    nextWeekFocus: buildNextWeekFocus({
      input: safeInput,
      totalSets,
      topBig3,
      topMuscleGroup,
    }),
    dataQualityNotes,
  };
};
