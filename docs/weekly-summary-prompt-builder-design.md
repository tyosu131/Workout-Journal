# Weekly Summary Prompt Builder Design

## Overview

This document defines the design direction for a provider-neutral weekly summary prompt builder.

The goal is to prepare a safe, structured prompt payload from existing deterministic analytics data before any external AI provider is connected. This is a design-only document. It does not implement a prompt builder, call an external AI API, add API keys, add environment variables, create a backend endpoint, change the database, persist summaries, add dependencies, or change package-lock files.

The initial prompt builder should use aggregated analytics data from `WeeklySummaryInput`. Raw workout note text should not be included in the first implementation.

## Current State

Workout Journal already has the following summary foundation:

- `buildWeeklySummaryInput` creates deterministic aggregate input from existing analytics data.
- The Analytics page displays a rule-based weekly summary preview.
- BIG3 trend, muscle group volume, exercise trend, and effort summary data are already available.
- AI provider selection is not implemented.
- External AI API calls are not implemented.
- Prompt builder utilities are not implemented.
- Backend AI endpoint design and implementation are not present.
- API key, secret management, and summary persistence are not present.

This fits the sequence described in `docs/ai-weekly-summary-design.md`: stabilize deterministic input and a local preview first, then design prompt construction, then design the backend AI endpoint, and only later connect an external provider.

## Prompt Builder Goals

The prompt builder should:

- Convert `WeeklySummaryInput` into a provider-neutral prompt payload.
- Keep AI input minimal and structured.
- Prefer aggregate analytics over raw user notes.
- Reduce hallucination by requiring the model to use only provided data.
- Make sparse data and uncertainty explicit.
- Avoid medical, injury, or treatment advice.
- Avoid automatically prescribing a fixed training program.
- Ask for a short weekly reflection grounded in concrete numbers.
- Produce output that can be validated and rendered by the existing summary UI.
- Be easy to call from a future backend endpoint.

## Non-goals

The prompt builder design does not include:

- Calling an external AI API.
- Adding API keys or environment variables.
- Creating a backend endpoint.
- Implementing the prompt builder in this phase.
- Writing summaries to the database.
- Sending raw workout note text.
- Asking AI to diagnose injuries or provide medical advice.
- Asking AI to decide a training program automatically.
- Guessing user goals that were not provided.
- Depending on provider-specific SDK fields.
- Adding provider SDKs or dependencies.

## Prompt Input Shape

Future prompt builder input should stay small and provider-neutral:

```ts
type WeeklySummaryPromptInput = {
  weeklySummaryInput: WeeklySummaryInput;
  locale?: "en" | "ja";
  tone?: "concise" | "coach_like" | "analytical";
};
```

Guidelines:

- `WeeklySummaryInput` should be the primary input.
- Raw workout note text should not be included initially.
- `locale` can support future English/Japanese output.
- `tone` should remain limited; too many modes make tests and safety behavior harder to reason about.
- Provider-specific fields such as model, temperature, max tokens, or tool definitions should stay outside this shape.

## Prompt Output Shape

The expected model output should be close to the existing rule-based summary shape:

```ts
type WeeklySummaryPromptOutput = {
  headline: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  nextWeekFocus: string[];
  dataQualityNotes: string[];
};
```

Reasons:

- The UI can compare or swap rule-based and AI-generated summaries with minimal branching.
- Backend response validation can check required fields.
- Sectioned output is easier to constrain than one long paragraph.
- Empty arrays are acceptable when the input does not support a section.

## Prompt Sections

The prompt should be built from explicit sections:

### System Instruction

Defines the assistant role and hard boundaries:

- Summarize workout analytics data.
- Do not provide medical advice.
- Do not diagnose injuries.
- Use only provided data.
- Mention uncertainty when data is sparse.
- Do not invent exercises, dates, weights, PRs, pain, injuries, or goals.

### Task Instruction

Defines the work to perform:

- Summarize the selected week or range.
- Use the provided aggregate metrics.
- Separate highlights, concerns, and next focus.
- Keep the output concise.
- Include numeric evidence when available.

### Safety Constraints

Reinforces prohibited behavior:

- No injury diagnosis.
- No treatment advice.
- No fixed program prescription.
- No shame-based language.
- No claims of causality from weak data.

### Data Interpretation Rules

Tells the model how to read the structured metrics:

- Missing values mean unknown.
- Missing effort data does not mean low effort.
- Failure count means `failure === true` only.
- Sparse effort coverage lowers confidence.
- No BIG3 data means no strength trend conclusion.
- No muscle group data means no volume balance conclusion.

### Output Format Instruction

Requires JSON-compatible structured output:

- `headline`
- `summary`
- `highlights`
- `concerns`
- `nextWeekFocus`
- `dataQualityNotes`

### Weekly Summary Input JSON

Contains the serialized `WeeklySummaryInput`. It should include deterministic aggregate data only.

## System Instruction Draft

This is a design draft, not an implementation:

```text
You summarize workout analytics data. You are not a medical professional and must not diagnose injuries or prescribe treatment. Use only the provided data. Mention uncertainty when data is sparse. Do not invent exercises, dates, weights, PRs, pain, injuries, or goals.
```

## Data Interpretation Rules

The prompt builder should include rules like:

- Treat missing data as unknown.
- Do not treat missing RPE, RIR, or failure values as low effort.
- Count failure only when `failure === true`.
- Mention uncertainty when effort coverage is sparse.
- If BIG3 trend data is missing, do not describe strength progress or regression.
- If muscle group volume data is missing, do not describe volume balance.
- If there are no notes or no normalized sets, keep the summary cautious and brief.
- Raw note text is not provided, so do not infer subjective context, motivation, pain, schedule, or goals.

## Safety Rules

The prompt should explicitly require:

- Do not diagnose injuries.
- Do not give medical advice.
- Do not infer pain, injury, illness, or fatigue unless explicitly present in the structured data.
- Do not prescribe a fixed training program.
- Do not claim causality from correlation.
- Do not shame the user.
- Use cautious language.
- State that the summary is informational.
- Prefer wording such as "may suggest", "could be worth watching", and "one thing to review".

## Output Rules

The initial recommendation is JSON output rather than Markdown.

Reasons:

- JSON is easier to parse and validate.
- The UI already has sectioned summary areas.
- Backend fallback to the rule-based summary is easier when the shape is predictable.

Rules:

- Return JSON-compatible structured output.
- `headline` should be short.
- `summary` should be one short paragraph.
- `highlights`, `concerns`, and `nextWeekFocus` should be arrays.
- `dataQualityNotes` should reflect the input data quality notes.
- Empty arrays are allowed.
- Do not invent data.
- Avoid overly long output.
- Do not include Markdown unless a later UI decision requires it.

Markdown output is easier for rich text rendering, but it is harder to validate reliably. It can be considered later after response validation is stable.

## Example Prompt Skeleton

This is a documentation skeleton, not application code:

```text
SYSTEM:
You summarize workout analytics data. You are not a medical professional and must not diagnose injuries or prescribe treatment. Use only the provided data. Mention uncertainty when data is sparse. Do not invent exercises, dates, weights, PRs, pain, injuries, or goals.

TASK:
Summarize the following weekly workout analytics data as a concise weekly reflection.

CONSTRAINTS:
- Use only the provided aggregate data.
- Missing values are unknown.
- Missing effort values are not low effort.
- Do not give medical advice.
- Do not prescribe a fixed training program.
- Mention uncertainty when data is sparse.
- Keep the output short.

OUTPUT FORMAT:
Return JSON with:
- headline
- summary
- highlights
- concerns
- nextWeekFocus
- dataQualityNotes

DATA:
{weeklySummaryInput}
```

## Example Input / Output

The following example uses fictional data only.

Example input:

```json
{
  "rangeStart": "2026-06-01",
  "rangeEnd": "2026-06-07",
  "totalNotes": 3,
  "totalSets": 42,
  "big3": [
    {
      "lift": "bench",
      "latestEstimatedOneRepMax": 98,
      "maxEstimatedOneRepMax": 100,
      "trendPointCount": 3
    }
  ],
  "muscleGroups": [
    {
      "muscle": "chest",
      "totalSets": 12,
      "totalVolumeLoad": 3200
    },
    {
      "muscle": "back",
      "totalSets": 10,
      "totalVolumeLoad": 2800
    }
  ],
  "effort": {
    "totalSetCount": 42,
    "effortLoggedSetCount": 18,
    "rpeCount": 14,
    "averageRpe": 8.1,
    "rirCount": 8,
    "averageRir": 1.6,
    "failureCount": 2
  },
  "dataQualityNotes": []
}
```

Example expected output:

```json
{
  "headline": "Consistent training week",
  "summary": "You logged 3 workout notes and 42 sets. Bench Press had a max estimated 1RM of 100, and chest had the highest logged muscle volume at 12 sets. Effort data was available for 18 of 42 sets, with average RPE 8.1.",
  "highlights": [
    "Bench Press max estimated 1RM: 100.",
    "Chest volume: 12 sets.",
    "Effort data was logged for 18 sets."
  ],
  "concerns": [
    "Effort coverage is partial, so intensity trends should be interpreted cautiously."
  ],
  "nextWeekFocus": [
    "Keep logging RPE/RIR for better effort tracking.",
    "Watch whether top lifts trend up or down.",
    "Review muscle group volume balance."
  ],
  "dataQualityNotes": []
}
```

## Validation Strategy

Future implementation should validate both prompt input and provider response.

Prompt input validation:

- Check required `WeeklySummaryInput` fields.
- Ensure counts are finite non-negative numbers.
- Ensure nullable metric values are either finite numbers or `null`.
- Ensure arrays are bounded.
- Ensure raw note text is not present.

Response validation:

- Parse JSON safely.
- Require all top-level fields.
- Require string fields for `headline` and `summary`.
- Require arrays for `highlights`, `concerns`, `nextWeekFocus`, and `dataQualityNotes`.
- Limit array lengths.
- Limit string lengths.
- Reject or sanitize non-string array items.
- Fall back to `buildRuleBasedWeeklySummary` when validation fails.

Testing and runtime rules:

- Unit tests must not call external AI APIs.
- Provider responses must be mocked in backend tests.
- Invalid provider responses must be covered.
- Prompt and response content should not be logged with user workout data.

## Testing Strategy

Future prompt builder tests should cover:

- Full data prompt includes all required sections.
- Sparse data prompt includes uncertainty rules.
- Empty range prompt includes cautious summary instructions.
- Raw note text is not included.
- Medical and injury advice prohibitions are present.
- Output schema instruction is present.
- Prompt output is deterministic for the same input.
- Input is not mutated.
- Locale handling can be extended without changing the core data shape.
- Tone handling remains bounded.
- Snapshot tests should be used carefully because full prompt snapshots can become brittle.

Prefer targeted assertions for required sections and safety rules over one large snapshot.

## Architecture Impact

Placement options:

- `shared/utils/weeklySummaryPromptBuilder.ts`
  - Good for provider-neutral, testable prompt construction.
  - Can be imported by backend tests and future backend endpoint code.
- `backend/utils/weeklySummaryPromptBuilder.js`
  - Keeps prompt construction backend-only.
  - Avoids frontend bundling, but duplicates TypeScript summary types unless carefully handled.

Recommended initial placement:

- Start with `shared/utils/weeklySummaryPromptBuilder.ts`.
- Keep it provider-neutral.
- Do not include provider SDK imports.
- Do not include secrets, env access, network calls, or logging.

Future endpoint relationship:

- Provider calls should be backend-only.
- Frontend should not build prompts or hold provider secrets.
- Backend endpoint should enforce authentication.
- Backend endpoint should apply rate limits and request size limits.
- Prompt payloads, provider responses, API keys, and raw workout content should not be logged.

## Recommended Initial Implementation

Recommended next PR:

- **Phase AD: Prompt builder helper + tests**

Candidate files:

```text
shared/utils/weeklySummaryPromptBuilder.ts
shared/utils/__tests__/weeklySummaryPromptBuilder.spec.ts
```

Scope:

- Accept `WeeklySummaryPromptInput`.
- Return deterministic provider-neutral prompt sections or messages.
- Include system, task, safety, interpretation, output format, and data sections.
- Do not call an external AI API.
- Do not add API keys or environment variables.
- Do not add provider SDKs.
- Keep response validation helper as a separate PR if needed.

## Risks / Open Questions

- Prompt injection risk increases if raw note text is added later.
- Raw note text handling needs a separate privacy decision.
- Provider output may drift over time.
- AI can hallucinate even with structured input.
- Output may become overly prescriptive without strong constraints.
- Response validation is required before rendering provider output.
- Token cost depends on payload size and provider choice.
- Workout logs are personal data and need careful handling.
- Prompt and response logging must be avoided.
- Localization may change safety wording and output validation needs.
- Future schema changes may affect input shape.
- Provider lock-in should be avoided by keeping prompt construction neutral.

## Suggested Next Step

The next implementation step should be a provider-neutral prompt builder helper with tests.

Recommended order:

1. Add `weeklySummaryPromptBuilder` as a pure shared utility.
2. Add tests for required sections, safety rules, sparse data behavior, no raw note text, and deterministic output.
3. Keep external AI API integration out of that PR.
4. Design the backend AI endpoint after prompt construction is stable.
