import {
  buildWeeklySummaryPromptPayload,
  toWeeklySummaryPromptMessages,
  type WeeklySummaryPromptInput,
  type WeeklySummaryPromptPayload,
} from "../weeklySummaryPromptBuilder";
import type { WeeklySummaryInput } from "../weeklySummaryInput";

const weeklySummaryInput: WeeklySummaryInput = {
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-07",
  totalNotes: 3,
  totalSets: 12,
  big3: [
    {
      lift: "bench",
      latestEstimatedOneRepMax: 98,
      maxEstimatedOneRepMax: 100,
      trendPointCount: 3,
    },
  ],
  muscleGroups: [
    {
      muscle: "chest",
      totalSets: 8,
      totalVolumeLoad: 2400,
    },
  ],
  effort: {
    totalSetCount: 12,
    effortLoggedSetCount: 8,
    rpeCount: 6,
    averageRpe: 8.1,
    rirCount: 4,
    averageRir: 1.5,
    failureCount: 2,
  },
  dataQualityNotes: ["Effort data is sparse in this range."],
};

const buildPayload = (
  overrides: Partial<WeeklySummaryPromptInput> = {}
): WeeklySummaryPromptPayload => buildWeeklySummaryPromptPayload({
  weeklySummaryInput,
  ...overrides,
});

describe("weeklySummaryPromptBuilder", () => {
  describe("buildWeeklySummaryPromptPayload", () => {
    it("builds provider-neutral prompt payload sections from full input", () => {
      const payload = buildPayload();

      expect(payload).toEqual({
        system: expect.any(String),
        task: expect.any(String),
        constraints: expect.any(Array),
        dataInterpretationRules: expect.any(Array),
        outputFormat: expect.any(String),
        data: weeklySummaryInput,
      });
      expect(payload.task).toContain("weekly workout analytics data");
      expect(payload.constraints.length).toBeGreaterThan(0);
      expect(payload.dataInterpretationRules.length).toBeGreaterThan(0);
    });

    it("includes medical, injury, and provided-data-only constraints in the system instruction", () => {
      const payload = buildPayload();

      expect(payload.system).toContain("workout analytics data");
      expect(payload.system).toContain("not a medical professional");
      expect(payload.system).toContain("must not diagnose injuries");
      expect(payload.system).toContain("Use only the provided data");
      expect(payload.system).toContain("Do not invent exercises, dates, weights, PRs, pain, injuries, or goals");
    });

    it("includes required safety constraints", () => {
      const payload = buildPayload();

      expect(payload.constraints).toEqual(expect.arrayContaining([
        "Use only the provided aggregate data.",
        "Missing values are unknown.",
        "Missing effort values are not low effort.",
        "Do not give medical advice.",
        "Do not diagnose injuries.",
        "Do not prescribe a fixed training program.",
        "Do not infer user goals.",
        "Keep the output concise.",
        "Return JSON-compatible structured output.",
      ]));
    });

    it("includes data interpretation rules for effort, sparse data, BIG3, and raw notes", () => {
      const payload = buildPayload();

      expect(payload.dataInterpretationRules).toEqual(expect.arrayContaining([
        "failure count means failure === true only.",
        "Sparse effort coverage lowers confidence.",
        "No BIG3 data means no strength trend conclusion.",
        "No muscle group data means no volume balance conclusion.",
        "No notes or no sets means a cautious summary.",
        "Raw note text is not provided.",
      ]));
    });

    it("includes required JSON output fields", () => {
      const payload = buildPayload();

      expect(payload.outputFormat).toContain("headline: string");
      expect(payload.outputFormat).toContain("summary: string");
      expect(payload.outputFormat).toContain("highlights: string[]");
      expect(payload.outputFormat).toContain("concerns: string[]");
      expect(payload.outputFormat).toContain("nextWeekFocus: string[]");
      expect(payload.outputFormat).toContain("dataQualityNotes: string[]");
      expect(payload.outputFormat).toContain("Do not include markdown");
      expect(payload.outputFormat).toContain("Do not invent data");
    });

    it("keeps weekly summary input as structured data", () => {
      expect(buildPayload().data).toEqual(weeklySummaryInput);
    });

    it("does not include raw note text from accidental extra input fields", () => {
      const inputWithRawNote = {
        ...weeklySummaryInput,
        rawNoteText: "private workout note text",
        note: "another private note",
        notes: [{ note: "nested private note" }],
      } as unknown as WeeklySummaryInput;
      const payload = buildPayload({ weeklySummaryInput: inputWithRawNote });
      const messages = toWeeklySummaryPromptMessages(payload);
      const serialized = JSON.stringify({ payload, messages });

      expect(serialized).not.toContain("private workout note text");
      expect(serialized).not.toContain("another private note");
      expect(serialized).not.toContain("nested private note");
    });

    it("does not mutate input data", () => {
      const promptInput: WeeklySummaryPromptInput = {
        weeklySummaryInput,
        locale: "en",
        tone: "analytical",
      };
      const original = JSON.parse(JSON.stringify(promptInput));

      buildWeeklySummaryPromptPayload(promptInput);

      expect(promptInput).toEqual(original);
    });

    it("returns deterministic output for the same input", () => {
      expect(buildPayload()).toEqual(buildPayload());
    });

    it("uses en and concise as default locale and tone", () => {
      const payload = buildPayload();

      expect(payload.task).toContain("Write the output values in English.");
      expect(payload.task).toContain("Keep the reflection short and direct.");
    });

    it("falls back to default locale and tone for unsupported runtime values", () => {
      const payload = buildPayload({
        locale: "fr" as never,
        tone: "verbose" as never,
      });

      expect(payload.task).toContain("Write the output values in English.");
      expect(payload.task).toContain("Keep the reflection short and direct.");
    });

    it("keeps safety rules when ja locale is selected", () => {
      const payload = buildPayload({ locale: "ja" });

      expect(payload.task).toContain("Write the output values in Japanese");
      expect(payload.system).toContain("not a medical professional");
      expect(payload.constraints).toContain("Do not give medical advice.");
      expect(payload.constraints).toContain("Do not diagnose injuries.");
    });

    it("keeps safety rules for analytical and coach_like tones", () => {
      const analyticalPayload = buildPayload({ tone: "analytical" });
      const coachLikePayload = buildPayload({ tone: "coach_like" });

      expect(analyticalPayload.task).toContain("Emphasize concrete metrics");
      expect(analyticalPayload.constraints).toContain("Do not prescribe a fixed training program.");
      expect(coachLikePayload.task).toContain("Use supportive language");
      expect(coachLikePayload.constraints).toContain("Do not prescribe a fixed training program.");
    });
  });

  describe("toWeeklySummaryPromptMessages", () => {
    it("converts prompt payload to provider-neutral system and user messages", () => {
      const payload = buildPayload();
      const messages = toWeeklySummaryPromptMessages(payload);

      expect(messages).toEqual([
        {
          role: "system",
          content: payload.system,
        },
        {
          role: "user",
          content: expect.any(String),
        },
      ]);
      expect(messages[1].content).toContain("TASK:");
      expect(messages[1].content).toContain("CONSTRAINTS:");
      expect(messages[1].content).toContain("DATA INTERPRETATION RULES:");
      expect(messages[1].content).toContain("OUTPUT FORMAT:");
      expect(messages[1].content).toContain("DATA:");
    });

    it("includes weekly summary data JSON in the user message", () => {
      const messages = toWeeklySummaryPromptMessages(buildPayload());

      expect(messages[1].content).toContain('"rangeStart": "2026-06-01"');
      expect(messages[1].content).toContain('"totalSets": 12');
      expect(messages[1].content).toContain('"averageRpe": 8.1');
    });

    it("does not add provider-specific fields", () => {
      const payload = buildPayload();
      const messages = toWeeklySummaryPromptMessages(payload);
      const serialized = JSON.stringify({ payload, messages });

      expect(Object.keys(payload)).toEqual([
        "system",
        "task",
        "constraints",
        "dataInterpretationRules",
        "outputFormat",
        "data",
      ]);
      expect(serialized).not.toContain("model");
      expect(serialized).not.toContain("temperature");
      expect(serialized).not.toContain("max_tokens");
    });

    it("does not include raw note text in messages", () => {
      const inputWithRawNote = {
        ...weeklySummaryInput,
        rawNoteText: "private workout note text",
      } as unknown as WeeklySummaryInput;
      const payload = buildPayload({ weeklySummaryInput: inputWithRawNote });
      const messages = toWeeklySummaryPromptMessages(payload);

      expect(JSON.stringify(messages)).not.toContain("private workout note text");
    });
  });
});
