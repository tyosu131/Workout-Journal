export type EffortSetInput = {
  rpe?: number | null;
  rir?: number | null;
  failure?: boolean | null;
};

export type EffortAnalyticsSummary = {
  totalSetCount: number;
  effortLoggedSetCount: number;
  rpeCount: number;
  averageRpe: number | null;
  rirCount: number;
  averageRir: number | null;
  failureCount: number;
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const isLoggedFailure = (value: boolean | null | undefined): value is boolean => (
  typeof value === "boolean"
);

export const summarizeSetEffort = (
  sets: EffortSetInput[]
): EffortAnalyticsSummary => {
  if (!Array.isArray(sets) || sets.length === 0) {
    return {
      totalSetCount: 0,
      effortLoggedSetCount: 0,
      rpeCount: 0,
      averageRpe: null,
      rirCount: 0,
      averageRir: null,
      failureCount: 0,
    };
  }

  const totals = sets.reduce(
    (summary, set) => {
      const rpe = isFiniteNumber(set.rpe) ? set.rpe : null;
      const rir = isFiniteNumber(set.rir) ? set.rir : null;
      const hasFailure = isLoggedFailure(set.failure);

      summary.totalSetCount += 1;

      if (rpe !== null || rir !== null || hasFailure) {
        summary.effortLoggedSetCount += 1;
      }

      if (rpe !== null) {
        summary.rpeTotal += rpe;
        summary.rpeCount += 1;
      }

      if (rir !== null) {
        summary.rirTotal += rir;
        summary.rirCount += 1;
      }

      if (set.failure === true) {
        summary.failureCount += 1;
      }

      return summary;
    },
    {
      totalSetCount: 0,
      effortLoggedSetCount: 0,
      rpeTotal: 0,
      rpeCount: 0,
      rirTotal: 0,
      rirCount: 0,
      failureCount: 0,
    }
  );

  return {
    totalSetCount: totals.totalSetCount,
    effortLoggedSetCount: totals.effortLoggedSetCount,
    rpeCount: totals.rpeCount,
    averageRpe: totals.rpeCount > 0
      ? roundToTwoDecimals(totals.rpeTotal / totals.rpeCount)
      : null,
    rirCount: totals.rirCount,
    averageRir: totals.rirCount > 0
      ? roundToTwoDecimals(totals.rirTotal / totals.rirCount)
      : null,
    failureCount: totals.failureCount,
  };
};
