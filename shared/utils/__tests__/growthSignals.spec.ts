import {
  buildGrowthSignals,
  type BuildGrowthSignalsInput,
  type GrowthSignal,
} from "../growthSignals";

const buildInput = (overrides: Partial<BuildGrowthSignalsInput> = {}): BuildGrowthSignalsInput => ({
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  totalNotes: 3,
  totalSets: 42,
  big3: [
    {
      lift: "squat",
      latestEstimatedOneRepMax: 152.5,
      maxEstimatedOneRepMax: 155,
      trendPointCount: 2,
    },
    {
      lift: "bench",
      latestEstimatedOneRepMax: 102.5,
      maxEstimatedOneRepMax: 105,
      trendPointCount: 3,
    },
    {
      lift: "deadlift",
      latestEstimatedOneRepMax: 180,
      maxEstimatedOneRepMax: 185,
      trendPointCount: 1,
    },
  ],
  muscleGroups: [
    {
      muscle: "chest",
      totalSets: 12,
      totalVolumeLoad: 2400,
    },
    {
      muscle: "back",
      totalSets: 10,
      totalVolumeLoad: 2200,
    },
  ],
  effort: {
    totalSetCount: 42,
    effortLoggedSetCount: 24,
    rpeCount: 20,
    averageRpe: 8.1,
    rirCount: 16,
    averageRir: 1.5,
    failureCount: 3,
  },
  dataQualityNotes: [],
  ...overrides,
});

const getSignal = (signals: GrowthSignal[], id: string): GrowthSignal => {
  const signal = signals.find((item) => item.id === id);
  if (!signal) {
    throw new Error(`Missing signal: ${id}`);
  }

  return signal;
};

const expectNoUnsafeNumbers = (value: unknown) => {
  const serialized = JSON.stringify(value);

  expect(serialized).not.toContain("NaN");
  expect(serialized).not.toContain("Infinity");
};

describe("growthSignals", () => {
  describe("buildGrowthSignals", () => {
    it("returns 5 ordered signals from full data", () => {
      const summary = buildGrowthSignals(buildInput());

      expect(summary.rangeStart).toBe("2026-06-01");
      expect(summary.rangeEnd).toBe("2026-06-07");
      expect(summary.signals.map((signal) => signal.id)).toEqual([
        "strength",
        "volume",
        "consistency",
        "effort",
        "exercise_progress",
      ]);
      expect(summary.signals).toHaveLength(5);
    });

    it("marks consistency unknown and adds notes when no notes or sets are present", () => {
      const summary = buildGrowthSignals(buildInput({
        totalNotes: 0,
        totalSets: 0,
      }));
      const consistency = getSignal(summary.signals, "consistency");

      expect(consistency.status).toBe("unknown");
      expect(summary.dataQualityNotes).toEqual(expect.arrayContaining([
        "No workout notes found in this range.",
        "No normalized sets found in this range.",
      ]));
    });

    it("marks strength unknown when there is no BIG3 data", () => {
      const summary = buildGrowthSignals(buildInput({ big3: [] }));
      const strength = getSignal(summary.signals, "strength");

      expect(strength.status).toBe("unknown");
      expect(strength.detail).toContain("No BIG3 estimated 1RM trend points");
      expect(summary.dataQualityNotes).toContain("No BIG3 trend data found in this range.");
    });

    it("marks strength neutral when BIG3 data exists without previous comparison", () => {
      const summary = buildGrowthSignals(buildInput());
      const strength = getSignal(summary.signals, "strength");

      expect(strength.status).toBe("neutral");
      expect(strength.evidence).toEqual([
        "BIG3 trend points: 6.",
        "Deadlift max estimated 1RM: 185.",
        "Deadlift latest estimated 1RM: 180.",
      ]);
      expect(strength.detail).toContain("previous range comparison is not connected yet");
    });

    it("marks volume unknown when there is no muscle group data", () => {
      const summary = buildGrowthSignals(buildInput({ muscleGroups: [] }));
      const volume = getSignal(summary.signals, "volume");

      expect(volume.status).toBe("unknown");
      expect(volume.detail).toContain("No muscle group volume data");
      expect(summary.dataQualityNotes).toContain(
        "No muscle group volume data found in this range."
      );
    });

    it("marks volume neutral when muscle group data exists", () => {
      const summary = buildGrowthSignals(buildInput());
      const volume = getSignal(summary.signals, "volume");

      expect(volume.status).toBe("neutral");
      expect(volume.evidence).toEqual([
        "chest: 12 sets.",
        "chest volume load: 2,400.",
        "back: 10 sets.",
      ]);
    });

    it("marks volume watch when top muscle group has at least 3x second muscle group sets", () => {
      const summary = buildGrowthSignals(buildInput({
        muscleGroups: [
          {
            muscle: "chest",
            totalSets: 18,
            totalVolumeLoad: 3600,
          },
          {
            muscle: "back",
            totalSets: 6,
            totalVolumeLoad: 1200,
          },
        ],
      }));
      const volume = getSignal(summary.signals, "volume");

      expect(volume.status).toBe("watch");
      expect(volume.headline).toBe("Volume may be concentrated");
      expect(volume.nextFocus).toContain("matches your plan");
    });

    it("marks consistency watch for low notes", () => {
      const summary = buildGrowthSignals(buildInput({
        totalNotes: 1,
        totalSets: 12,
      }));
      const consistency = getSignal(summary.signals, "consistency");

      expect(consistency.status).toBe("watch");
      expect(consistency.evidence).toEqual([
        "Workout notes: 1.",
        "Normalized sets: 12.",
      ]);
    });

    it("marks consistency watch for low sets", () => {
      const summary = buildGrowthSignals(buildInput({
        totalNotes: 3,
        totalSets: 4,
      }));

      expect(getSignal(summary.signals, "consistency").status).toBe("watch");
    });

    it("marks consistency neutral when notes and sets are sufficient", () => {
      const summary = buildGrowthSignals(buildInput());
      const consistency = getSignal(summary.signals, "consistency");

      expect(consistency.status).toBe("neutral");
      expect(consistency.detail).toContain("enough logged notes and sets");
    });

    it("marks effort unknown when no effort data is logged", () => {
      const summary = buildGrowthSignals(buildInput({
        effort: {
          totalSetCount: 12,
          effortLoggedSetCount: 0,
          rpeCount: 0,
          averageRpe: null,
          rirCount: 0,
          averageRir: null,
          failureCount: 0,
        },
      }));
      const effort = getSignal(summary.signals, "effort");

      expect(effort.status).toBe("unknown");
      expect(effort.detail).toContain("No RPE, RIR, or failure data");
      expect(summary.dataQualityNotes).toContain("No effort data logged in this range.");
    });

    it("marks effort watch when effort coverage is below 25%", () => {
      const summary = buildGrowthSignals(buildInput({
        effort: {
          totalSetCount: 20,
          effortLoggedSetCount: 4,
          rpeCount: 2,
          averageRpe: 8,
          rirCount: 2,
          averageRir: 2,
          failureCount: 0,
        },
      }));
      const effort = getSignal(summary.signals, "effort");

      expect(effort.status).toBe("watch");
      expect(effort.headline).toBe("Effort data is sparse");
      expect(effort.evidence).toContain("Effort coverage: 4 / 20 sets (20%).");
    });

    it("marks effort watch when failure ratio is 20% or higher", () => {
      const summary = buildGrowthSignals(buildInput({
        effort: {
          totalSetCount: 20,
          effortLoggedSetCount: 18,
          rpeCount: 12,
          averageRpe: 8.5,
          rirCount: 10,
          averageRir: 1,
          failureCount: 4,
        },
      }));
      const effort = getSignal(summary.signals, "effort");

      expect(effort.status).toBe("watch");
      expect(effort.headline).toBe("Failure sets are worth watching");
      expect(effort.detail).toContain("At least 20% of sets");
    });

    it("includes average RPE/RIR evidence only when finite", () => {
      const summary = buildGrowthSignals(buildInput({
        effort: {
          totalSetCount: 20,
          effortLoggedSetCount: 10,
          rpeCount: 5,
          averageRpe: Number.NaN,
          rirCount: 5,
          averageRir: Number.POSITIVE_INFINITY,
          failureCount: 1,
        },
      }));
      const effort = getSignal(summary.signals, "effort");

      expect(effort.evidence).toEqual([
        "Effort coverage: 10 / 20 sets (50%).",
        "Failure sets: 1.",
      ]);
      expectNoUnsafeNumbers(summary);
    });

    it("treats missing effort values as unknown, not low effort", () => {
      const summary = buildGrowthSignals(buildInput({
        effort: {
          totalSetCount: 20,
          effortLoggedSetCount: 0,
          rpeCount: 0,
          averageRpe: null,
          rirCount: 0,
          averageRir: null,
          failureCount: 0,
        },
      }));
      const effort = getSignal(summary.signals, "effort");

      expect(effort.status).toBe("unknown");
      expect(JSON.stringify(effort)).not.toContain("low effort");
    });

    it("keeps exercise_progress unknown initially", () => {
      const summary = buildGrowthSignals(buildInput());
      const exerciseProgress = getSignal(summary.signals, "exercise_progress");

      expect(exerciseProgress.status).toBe("unknown");
      expect(exerciseProgress.detail).toContain("Selected exercise trend data is not connected");
      expect(exerciseProgress.nextFocus).toContain("exercise trend selector");
    });

    it("generates and dedupes data quality notes", () => {
      const summary = buildGrowthSignals(buildInput({
        totalNotes: 0,
        totalSets: 0,
        big3: [],
        muscleGroups: [],
        effort: {
          totalSetCount: 0,
          effortLoggedSetCount: 0,
          rpeCount: 0,
          averageRpe: null,
          rirCount: 0,
          averageRir: null,
          failureCount: 0,
        },
        dataQualityNotes: [
          "No workout notes found in this range.",
          "No workout notes found in this range.",
          "Custom note.",
          123 as unknown as string,
        ],
      }));

      expect(summary.dataQualityNotes).toEqual([
        "No workout notes found in this range.",
        "Custom note.",
        "No normalized sets found in this range.",
        "No BIG3 trend data found in this range.",
        "No muscle group volume data found in this range.",
        "No effort data logged in this range.",
      ]);
    });

    it("ignores invalid numeric values", () => {
      const summary = buildGrowthSignals(buildInput({
        totalNotes: Number.NaN,
        totalSets: Number.POSITIVE_INFINITY,
        big3: [
          {
            lift: "bench",
            latestEstimatedOneRepMax: Number.NaN,
            maxEstimatedOneRepMax: Number.POSITIVE_INFINITY,
            trendPointCount: Number.NaN,
          },
        ],
        muscleGroups: [
          {
            muscle: "chest",
            totalSets: Number.NaN,
            totalVolumeLoad: Number.POSITIVE_INFINITY,
          },
        ],
        effort: {
          totalSetCount: Number.NaN,
          effortLoggedSetCount: Number.POSITIVE_INFINITY,
          rpeCount: Number.NaN,
          averageRpe: Number.NaN,
          rirCount: Number.POSITIVE_INFINITY,
          averageRir: Number.POSITIVE_INFINITY,
          failureCount: -1,
        },
      }));

      expect(getSignal(summary.signals, "strength").status).toBe("unknown");
      expect(getSignal(summary.signals, "volume").status).toBe("unknown");
      expect(getSignal(summary.signals, "consistency").status).toBe("unknown");
      expect(getSignal(summary.signals, "effort").status).toBe("unknown");
      expectNoUnsafeNumbers(summary);
    });

    it("keeps deterministic output ordering", () => {
      const first = buildGrowthSignals(buildInput());
      const second = buildGrowthSignals(buildInput());

      expect(second).toEqual(first);
      expect(first.signals.map((signal) => signal.id)).toEqual([
        "strength",
        "volume",
        "consistency",
        "effort",
        "exercise_progress",
      ]);
    });

    it("does not mutate input", () => {
      const input = buildInput();
      const original = JSON.parse(JSON.stringify(input));

      buildGrowthSignals(input);

      expect(input).toEqual(original);
    });

    it("does not call external AI or API side effects", () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = jest.fn();
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: fetchMock,
      });

      try {
        buildGrowthSignals(buildInput());

        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          value: originalFetch,
        });
      }
    });
  });
});
