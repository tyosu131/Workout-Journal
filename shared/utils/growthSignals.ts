export type GrowthSignalStatus = "positive" | "neutral" | "watch" | "unknown";

export type GrowthSignal = {
  id: string;
  label: string;
  status: GrowthSignalStatus;
  headline: string;
  detail: string;
  evidence: string[];
  nextFocus: string | null;
};

export type GrowthSignalsSummary = {
  rangeStart: string;
  rangeEnd: string;
  signals: GrowthSignal[];
  dataQualityNotes: string[];
};

export type GrowthSignalsBig3Input = {
  lift: string;
  latestEstimatedOneRepMax: number | null;
  maxEstimatedOneRepMax: number | null;
  trendPointCount: number;
};

export type GrowthSignalsMuscleGroupInput = {
  muscle: string;
  totalSets: number;
  totalVolumeLoad: number;
};

export type GrowthSignalsEffortInput = {
  totalSetCount: number;
  effortLoggedSetCount: number;
  rpeCount: number;
  averageRpe: number | null;
  rirCount: number;
  averageRir: number | null;
  failureCount: number;
};

export type BuildGrowthSignalsInput = {
  rangeStart: string;
  rangeEnd: string;
  totalNotes: number;
  totalSets: number;
  big3: GrowthSignalsBig3Input[];
  muscleGroups: GrowthSignalsMuscleGroupInput[];
  effort: GrowthSignalsEffortInput;
  dataQualityNotes?: string[];
};

const NO_NOTES_NOTE = "No workout notes found in this range.";
const NO_SETS_NOTE = "No normalized sets found in this range.";
const NO_BIG3_NOTE = "No BIG3 trend data found in this range.";
const NO_MUSCLE_NOTE = "No muscle group volume data found in this range.";
const NO_EFFORT_NOTE = "No effort data logged in this range.";

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const toNonNegativeNumber = (value: number | null | undefined): number => (
  isFiniteNumber(value) && value >= 0 ? value : 0
);

const toCount = (value: number | null | undefined): number => (
  Math.floor(toNonNegativeNumber(value))
);

const toFiniteNumberOrNull = (value: number | null | undefined): number | null => (
  isFiniteNumber(value) ? value : null
);

const formatNumber = (value: number): string => (
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)
);

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

const uniqueStrings = (items: string[]): string[] => Array.from(new Set(items));

const buildDataQualityNotes = ({
  totalNotes,
  totalSets,
  big3,
  muscleGroups,
  effort,
  inputNotes,
}: {
  totalNotes: number;
  totalSets: number;
  big3: GrowthSignalsBig3Input[];
  muscleGroups: GrowthSignalsMuscleGroupInput[];
  effort: GrowthSignalsEffortInput;
  inputNotes?: string[];
}): string[] => {
  const notes = Array.isArray(inputNotes)
    ? inputNotes.filter((note) => typeof note === "string")
    : [];

  if (totalNotes === 0) {
    notes.push(NO_NOTES_NOTE);
  }

  if (totalSets === 0) {
    notes.push(NO_SETS_NOTE);
  }

  if (big3.length === 0 || big3.every((summary) => summary.trendPointCount === 0)) {
    notes.push(NO_BIG3_NOTE);
  }

  if (muscleGroups.length === 0) {
    notes.push(NO_MUSCLE_NOTE);
  }

  if (effort.effortLoggedSetCount === 0) {
    notes.push(NO_EFFORT_NOTE);
  }

  return uniqueStrings(notes);
};

const sanitizeBig3 = (
  big3: GrowthSignalsBig3Input[]
): GrowthSignalsBig3Input[] => {
  if (!Array.isArray(big3)) {
    return [];
  }

  return big3.map((summary) => ({
    lift: typeof summary.lift === "string" ? summary.lift : "",
    latestEstimatedOneRepMax: toFiniteNumberOrNull(summary.latestEstimatedOneRepMax),
    maxEstimatedOneRepMax: toFiniteNumberOrNull(summary.maxEstimatedOneRepMax),
    trendPointCount: toCount(summary.trendPointCount),
  }));
};

const sanitizeMuscleGroups = (
  muscleGroups: GrowthSignalsMuscleGroupInput[]
): GrowthSignalsMuscleGroupInput[] => {
  if (!Array.isArray(muscleGroups)) {
    return [];
  }

  return muscleGroups
    .map((group) => ({
      muscle: typeof group.muscle === "string" ? group.muscle.trim() : "",
      totalSets: toNonNegativeNumber(group.totalSets),
      totalVolumeLoad: toNonNegativeNumber(group.totalVolumeLoad),
    }))
    .filter((group) => (
      group.muscle !== "" && (group.totalSets > 0 || group.totalVolumeLoad > 0)
    ))
    .sort((a, b) => {
      const setCompare = b.totalSets - a.totalSets;
      return setCompare !== 0 ? setCompare : a.muscle.localeCompare(b.muscle);
    });
};

const sanitizeEffort = (effort: GrowthSignalsEffortInput): GrowthSignalsEffortInput => ({
  totalSetCount: toCount(effort?.totalSetCount),
  effortLoggedSetCount: toCount(effort?.effortLoggedSetCount),
  rpeCount: toCount(effort?.rpeCount),
  averageRpe: toFiniteNumberOrNull(effort?.averageRpe),
  rirCount: toCount(effort?.rirCount),
  averageRir: toFiniteNumberOrNull(effort?.averageRir),
  failureCount: toCount(effort?.failureCount),
});

const buildStrengthSignal = (big3: GrowthSignalsBig3Input[]): GrowthSignal => {
  const trendPointCount = big3.reduce((total, summary) => (
    total + summary.trendPointCount
  ), 0);

  if (trendPointCount === 0) {
    return {
      id: "strength",
      label: "Strength",
      status: "unknown",
      headline: "Strength signal unavailable",
      detail: "No BIG3 estimated 1RM trend points were found in this range.",
      evidence: [],
      nextFocus: "Log squat, bench, or deadlift top sets if strength tracking matters.",
    };
  }

  const byMax = [...big3]
    .filter((summary) => isFiniteNumber(summary.maxEstimatedOneRepMax))
    .sort((a, b) => {
      const valueCompare = (b.maxEstimatedOneRepMax ?? 0)
        - (a.maxEstimatedOneRepMax ?? 0);
      return valueCompare !== 0
        ? valueCompare
        : formatLift(a.lift).localeCompare(formatLift(b.lift));
    });
  const top = byMax[0] ?? big3.find((summary) => summary.trendPointCount > 0) ?? null;
  const evidence = [`BIG3 trend points: ${trendPointCount}.`];

  if (top && isFiniteNumber(top.maxEstimatedOneRepMax)) {
    evidence.push(
      `${formatLift(top.lift)} max estimated 1RM: ${formatNumber(top.maxEstimatedOneRepMax)}.`
    );
  }

  if (top && isFiniteNumber(top.latestEstimatedOneRepMax)) {
    evidence.push(
      `${formatLift(top.lift)} latest estimated 1RM: ${formatNumber(top.latestEstimatedOneRepMax)}.`
    );
  }

  return {
    id: "strength",
    label: "Strength",
    status: "neutral",
    headline: "Strength data is available",
    detail: "BIG3 trend data exists, but previous range comparison is not connected yet.",
    evidence,
    nextFocus: "Compare these top lift signals with the next range once previous-range logic exists.",
  };
};

const buildVolumeSignal = (muscleGroups: GrowthSignalsMuscleGroupInput[]): GrowthSignal => {
  if (muscleGroups.length === 0) {
    return {
      id: "volume",
      label: "Volume",
      status: "unknown",
      headline: "Volume signal unavailable",
      detail: "No muscle group volume data was found in this range.",
      evidence: [],
      nextFocus: "Log exercises that match metadata so muscle group volume can be calculated.",
    };
  }

  const top = muscleGroups[0];
  const second = muscleGroups[1] ?? null;
  const hasImbalance = Boolean(second && second.totalSets > 0 && top.totalSets >= second.totalSets * 3);
  const evidence = [
    `${top.muscle}: ${formatNumber(top.totalSets)} sets.`,
  ];

  if (top.totalVolumeLoad > 0) {
    evidence.push(`${top.muscle} volume load: ${formatNumber(top.totalVolumeLoad)}.`);
  }

  if (second) {
    evidence.push(`${second.muscle}: ${formatNumber(second.totalSets)} sets.`);
  }

  return {
    id: "volume",
    label: "Volume",
    status: hasImbalance ? "watch" : "neutral",
    headline: hasImbalance ? "Volume may be concentrated" : "Volume data is available",
    detail: hasImbalance
      ? "The top muscle group has at least 3x the sets of the next muscle group."
      : "Muscle group volume exists for this range; previous range comparison is not connected yet.",
    evidence,
    nextFocus: hasImbalance
      ? "Review whether this muscle group emphasis matches your plan."
      : "Review volume balance across muscle groups.",
  };
};

const buildConsistencySignal = ({
  totalNotes,
  totalSets,
}: {
  totalNotes: number;
  totalSets: number;
}): GrowthSignal => {
  const evidence = [
    `Workout notes: ${formatNumber(totalNotes)}.`,
    `Normalized sets: ${formatNumber(totalSets)}.`,
  ];

  if (totalNotes === 0 || totalSets === 0) {
    return {
      id: "consistency",
      label: "Consistency",
      status: "unknown",
      headline: "Consistency signal unavailable",
      detail: "No usable notes or normalized sets were found in this range.",
      evidence,
      nextFocus: "Log workouts consistently to unlock trend signals.",
    };
  }

  if (totalNotes <= 1 || totalSets < 5) {
    return {
      id: "consistency",
      label: "Consistency",
      status: "watch",
      headline: "Consistency data is sparse",
      detail: "This range has limited logged training, so growth signals may be less reliable.",
      evidence,
      nextFocus: "Keep logging sessions so the next range has more context.",
    };
  }

  return {
    id: "consistency",
    label: "Consistency",
    status: "neutral",
    headline: "Consistency data is available",
    detail: "This range has enough logged notes and sets for basic analytics.",
    evidence,
    nextFocus: "Keep the logging habit steady across future ranges.",
  };
};

const buildEffortSignal = (effort: GrowthSignalsEffortInput): GrowthSignal => {
  const {
    totalSetCount,
    effortLoggedSetCount,
    averageRpe,
    averageRir,
    failureCount,
  } = effort;

  if (totalSetCount === 0 || effortLoggedSetCount === 0) {
    return {
      id: "effort",
      label: "Effort",
      status: "unknown",
      headline: "Effort signal unavailable",
      detail: "No RPE, RIR, or failure data was logged in this range.",
      evidence: [`Effort coverage: 0 / ${formatNumber(totalSetCount)} sets.`],
      nextFocus: "Log optional RPE/RIR or failure values when useful.",
    };
  }

  const coverage = effortLoggedSetCount / totalSetCount;
  const failureRatio = totalSetCount > 0 ? failureCount / totalSetCount : 0;
  const isLowCoverage = coverage < 0.25;
  const isHighFailure = failureRatio >= 0.2;
  const evidence = [
    `Effort coverage: ${formatNumber(effortLoggedSetCount)} / ${formatNumber(totalSetCount)} sets (${formatNumber(coverage * 100)}%).`,
  ];

  if (isFiniteNumber(averageRpe)) {
    evidence.push(`Average RPE: ${formatNumber(averageRpe)}.`);
  }

  if (isFiniteNumber(averageRir)) {
    evidence.push(`Average RIR: ${formatNumber(averageRir)}.`);
  }

  evidence.push(`Failure sets: ${formatNumber(failureCount)}.`);

  return {
    id: "effort",
    label: "Effort",
    status: isLowCoverage || isHighFailure ? "watch" : "neutral",
    headline: isLowCoverage
      ? "Effort data is sparse"
      : isHighFailure
        ? "Failure sets are worth watching"
        : "Effort data is available",
    detail: isLowCoverage
      ? "Effort coverage is below 25%, so intensity interpretation is uncertain."
      : isHighFailure
        ? "At least 20% of sets were marked as failure in this range."
        : "Logged effort data is available; missing values are treated as unknown.",
    evidence,
    nextFocus: isLowCoverage
      ? "Log RPE/RIR on more sets if effort tracking matters."
      : "Review effort alongside volume and top sets.",
  };
};

const buildExerciseProgressSignal = (): GrowthSignal => ({
  id: "exercise_progress",
  label: "Exercise Progress",
  status: "unknown",
  headline: "Exercise progress signal not connected yet",
  detail: "Selected exercise trend data is not connected to Growth Signals yet.",
  evidence: [],
  nextFocus: "Use the exercise trend selector to review raw and canonical exercise progress.",
});

export const buildGrowthSignals = ({
  rangeStart,
  rangeEnd,
  totalNotes,
  totalSets,
  big3,
  muscleGroups,
  effort,
  dataQualityNotes,
}: BuildGrowthSignalsInput): GrowthSignalsSummary => {
  const safeTotalNotes = toCount(totalNotes);
  const safeTotalSets = toCount(totalSets);
  const safeBig3 = sanitizeBig3(big3);
  const safeMuscleGroups = sanitizeMuscleGroups(muscleGroups);
  const safeEffort = sanitizeEffort(effort);

  return {
    rangeStart,
    rangeEnd,
    signals: [
      buildStrengthSignal(safeBig3),
      buildVolumeSignal(safeMuscleGroups),
      buildConsistencySignal({
        totalNotes: safeTotalNotes,
        totalSets: safeTotalSets,
      }),
      buildEffortSignal(safeEffort),
      buildExerciseProgressSignal(),
    ],
    dataQualityNotes: buildDataQualityNotes({
      totalNotes: safeTotalNotes,
      totalSets: safeTotalSets,
      big3: safeBig3,
      muscleGroups: safeMuscleGroups,
      effort: safeEffort,
      inputNotes: dataQualityNotes,
    }),
  };
};
