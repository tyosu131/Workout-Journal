import type { Big3TrendSummary } from "./big3Trend";
import type { EffortAnalyticsSummary } from "./effortAnalytics";
import type { WeeklyMuscleGroupVolumeRow } from "./muscleGroupVolume";

export type WeeklySummaryBig3Input = {
  lift: string;
  latestEstimatedOneRepMax: number | null;
  maxEstimatedOneRepMax: number | null;
  trendPointCount: number;
};

export type WeeklySummaryMuscleGroupInput = {
  muscle: string;
  totalSets: number;
  totalVolumeLoad: number;
};

export type WeeklySummaryInput = {
  rangeStart: string;
  rangeEnd: string;
  totalNotes: number;
  totalSets: number;
  big3: WeeklySummaryBig3Input[];
  muscleGroups: WeeklySummaryMuscleGroupInput[];
  effort: EffortAnalyticsSummary;
  dataQualityNotes: string[];
};

export type BuildWeeklySummaryInputArgs = {
  rangeStart: string;
  rangeEnd: string;
  totalNotes: number;
  normalizedSets: unknown[];
  big3Summaries: Big3TrendSummary[];
  muscleRows: WeeklyMuscleGroupVolumeRow[];
  effortSummary: EffortAnalyticsSummary;
};

const NO_NOTES_NOTE = "No workout notes found in this range.";
const NO_SETS_NOTE = "No normalized sets found in this range.";
const NO_BIG3_NOTE = "No BIG3 trend data found in this range.";
const NO_MUSCLE_NOTE = "No muscle group volume data found in this range.";
const NO_EFFORT_NOTE = "No effort data logged in this range.";
const SPARSE_EFFORT_NOTE = "Effort data is sparse in this range.";

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const isPositiveFiniteNumber = (value: number | null | undefined): value is number => (
  isFiniteNumber(value) && value > 0
);

const toFiniteNumberOrNull = (value: number | null | undefined): number | null => (
  isFiniteNumber(value) ? value : null
);

const toPositiveFiniteNumberOrNull = (
  value: number | null | undefined
): number | null => (
  isPositiveFiniteNumber(value) ? value : null
);

const toNonNegativeNumber = (value: number | null | undefined): number => (
  isFiniteNumber(value) && value >= 0 ? value : 0
);

const toCount = (value: number | null | undefined): number => (
  Math.floor(toNonNegativeNumber(value))
);

const sanitizeEffortSummary = (
  effortSummary: EffortAnalyticsSummary
): EffortAnalyticsSummary => ({
  totalSetCount: toCount(effortSummary.totalSetCount),
  effortLoggedSetCount: toCount(effortSummary.effortLoggedSetCount),
  rpeCount: toCount(effortSummary.rpeCount),
  averageRpe: toFiniteNumberOrNull(effortSummary.averageRpe),
  rirCount: toCount(effortSummary.rirCount),
  averageRir: toFiniteNumberOrNull(effortSummary.averageRir),
  failureCount: toCount(effortSummary.failureCount),
});

const buildBig3Input = (
  big3Summaries: Big3TrendSummary[]
): WeeklySummaryBig3Input[] => {
  if (!Array.isArray(big3Summaries)) {
    return [];
  }

  return big3Summaries.map((summary) => ({
    lift: summary.liftType,
    latestEstimatedOneRepMax: toPositiveFiniteNumberOrNull(
      summary.latestTopSet?.estimatedOneRepMax
    ),
    maxEstimatedOneRepMax: toPositiveFiniteNumberOrNull(
      summary.maxEstimatedOneRepMax?.estimatedOneRepMax
    ),
    trendPointCount: Array.isArray(summary.points)
      ? summary.points.filter((point) => (
        isPositiveFiniteNumber(point.estimatedOneRepMax)
      )).length
      : 0,
  }));
};

const buildMuscleGroupInput = (
  muscleRows: WeeklyMuscleGroupVolumeRow[]
): WeeklySummaryMuscleGroupInput[] => {
  if (!Array.isArray(muscleRows) || muscleRows.length === 0) {
    return [];
  }

  const groups = new Map<string, WeeklySummaryMuscleGroupInput>();

  muscleRows.forEach((row) => {
    const muscle = typeof row.muscle === "string" ? row.muscle.trim() : "";
    if (muscle === "") {
      return;
    }

    const current = groups.get(muscle) ?? {
      muscle,
      totalSets: 0,
      totalVolumeLoad: 0,
    };

    current.totalSets += toNonNegativeNumber(row.totalSets);
    current.totalVolumeLoad += toNonNegativeNumber(row.totalVolumeLoad);

    groups.set(muscle, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      muscle: group.muscle,
      totalSets: roundToTwoDecimals(group.totalSets),
      totalVolumeLoad: roundToTwoDecimals(group.totalVolumeLoad),
    }))
    .filter((group) => group.totalSets > 0 || group.totalVolumeLoad > 0)
    .sort((a, b) => {
      const setCompare = b.totalSets - a.totalSets;
      return setCompare !== 0 ? setCompare : a.muscle.localeCompare(b.muscle);
    });
};

const buildDataQualityNotes = ({
  totalNotes,
  totalSets,
  big3,
  muscleGroups,
  effort,
}: {
  totalNotes: number;
  totalSets: number;
  big3: WeeklySummaryBig3Input[];
  muscleGroups: WeeklySummaryMuscleGroupInput[];
  effort: EffortAnalyticsSummary;
}): string[] => {
  const notes: string[] = [];

  if (totalNotes === 0) {
    notes.push(NO_NOTES_NOTE);
  }

  if (totalSets === 0) {
    notes.push(NO_SETS_NOTE);
  }

  if (big3.every((summary) => summary.trendPointCount === 0)) {
    notes.push(NO_BIG3_NOTE);
  }

  if (muscleGroups.length === 0) {
    notes.push(NO_MUSCLE_NOTE);
  }

  if (effort.effortLoggedSetCount === 0) {
    notes.push(NO_EFFORT_NOTE);
  } else if (
    effort.totalSetCount > 0 &&
    effort.effortLoggedSetCount / effort.totalSetCount < 0.25
  ) {
    notes.push(SPARSE_EFFORT_NOTE);
  }

  return notes;
};

export const buildWeeklySummaryInput = ({
  rangeStart,
  rangeEnd,
  totalNotes,
  normalizedSets,
  big3Summaries,
  muscleRows,
  effortSummary,
}: BuildWeeklySummaryInputArgs): WeeklySummaryInput => {
  const safeTotalNotes = toCount(totalNotes);
  const totalSets = Array.isArray(normalizedSets) ? normalizedSets.length : 0;
  const big3 = buildBig3Input(big3Summaries);
  const muscleGroups = buildMuscleGroupInput(muscleRows);
  const effort = sanitizeEffortSummary(effortSummary);

  return {
    rangeStart,
    rangeEnd,
    totalNotes: safeTotalNotes,
    totalSets,
    big3,
    muscleGroups,
    effort,
    dataQualityNotes: buildDataQualityNotes({
      totalNotes: safeTotalNotes,
      totalSets,
      big3,
      muscleGroups,
      effort,
    }),
  };
};
