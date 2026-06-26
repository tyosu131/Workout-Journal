# Backend AI Weekly Summary Endpoint Design

## Overview

This document defines the design direction for a future backend endpoint that can generate weekly training summaries with an AI provider.

This is a docs-only design note. It does not implement an endpoint, call an external AI API, add a provider SDK, add API keys, add environment variables, change the database, persist summaries, change frontend UI, or update dependencies.

The AI provider call should happen on the backend, not the frontend, because provider secrets must stay server-side and because the backend is the right boundary for authentication, authorization, rate limiting, request size limits, provider errors, logging policy, and response validation.

The design assumes the existing rule-based summary can be used as fallback and that provider responses are validated before rendering.

## Current State

Implemented:

- `buildWeeklySummaryInput` creates deterministic aggregate input for a selected range.
- `buildRuleBasedWeeklySummary` creates a local summary preview without AI.
- `buildWeeklySummaryPromptPayload` and `toWeeklySummaryPromptMessages` create provider-neutral prompt payloads.
- `parseAndValidateWeeklySummaryResponse` and `validateWeeklySummaryResponse` validate structured weekly summary responses.
- Analytics already displays charts, effort summary, and a rule-based weekly summary preview.
- Backend note exercises validation is in place for nested set intensity fields.

Not implemented:

- Backend AI weekly summary endpoint.
- External provider integration.
- API key, environment variable, or secret manager configuration for AI.
- Provider SDK dependency.
- AI summary persistence.
- Provider response logging policy in code.

## Goals

The future backend endpoint should:

- Accept an authenticated user's weekly summary request.
- Keep provider secrets backend-only.
- Build provider-neutral prompt content using the prompt builder.
- Call a provider through a narrow provider adapter boundary.
- Validate provider output with the response validation helper.
- Return rule-based fallback when provider output is invalid or unavailable.
- Define request size limits, range limits, rate limits, timeout behavior, and logging policy.
- Create a safe boundary for future external AI integration.

## Non-goals

This phase does not:

- Implement the endpoint.
- Call an external AI API.
- Add API keys or environment variables.
- Add a provider SDK.
- Change database schema.
- Save AI summaries.
- Change frontend UI.
- Commit to a provider.
- Send raw workout note text.
- Generate medical, injury, or treatment advice.

## Endpoint Proposal

Future route candidate:

```http
POST /api/analytics/weekly-summary
```

Request body candidate:

```json
{
  "rangeStart": "2026-06-01",
  "rangeEnd": "2026-06-07",
  "summaryInput": {}
}
```

AI response candidate:

```json
{
  "source": "ai",
  "summary": {
    "headline": "...",
    "summary": "...",
    "highlights": [],
    "concerns": [],
    "nextWeekFocus": [],
    "dataQualityNotes": []
  },
  "validationErrors": []
}
```

Fallback response candidate:

```json
{
  "source": "rule_based_fallback",
  "summary": {
    "headline": "...",
    "summary": "...",
    "highlights": [],
    "concerns": [],
    "nextWeekFocus": [],
    "dataQualityNotes": []
  },
  "validationErrors": ["Provider response validation failed."]
}
```

The response should make `source` explicit so the frontend can distinguish provider output from deterministic fallback.

## Authentication / Authorization

The endpoint should be authenticated-only.

Implementation should first confirm the existing backend auth flow and token validation pattern before adding a route. The endpoint must ensure that the authenticated user can only summarize their own notes and analytics data.

Authorization requirements:

- Require a valid access token.
- Resolve the authenticated user ID on the backend.
- Ensure requested date range is scoped to that user.
- Never allow one user's notes or analytics data to be sent in another user's summary request.
- Treat the endpoint as user-scoped only, not global analytics.

## Request Validation

Required validation:

- `rangeStart` must be a valid `YYYY-MM-DD` date.
- `rangeEnd` must be a valid `YYYY-MM-DD` date.
- `rangeEnd` must be on or after `rangeStart`.
- Range length should be limited, for example 4 weeks, 8 weeks, 12 weeks, 6 months, or another explicit maximum.
- Request body size should be limited.
- Raw note text should not be accepted in the initial request.

`summaryInput` source options need a clear choice:

- Frontend-generated `WeeklySummaryInput` is easier to wire initially.
- Backend-rebuilt `WeeklySummaryInput` is more trustworthy.

Even if the first endpoint accepts frontend-generated `WeeklySummaryInput`, the backend should validate shape and reject unexpected raw note text. Long term, backend rebuild is preferred.

## Data Source Options

### A. Frontend Sends WeeklySummaryInput

Pros:

- Smaller initial implementation.
- Reuses existing Analytics page state.
- Avoids rebuilding analytics data on the backend immediately.
- Good for mocked endpoint experiments.

Cons:

- Frontend input is client-controlled and can be altered.
- Backend cannot fully trust the summary input.
- Authorization is harder to reason about unless backend also verifies the date range and user.
- Less useful for server-side caching or persistence later.

### B. Backend Rebuilds WeeklySummaryInput From Notes

Pros:

- Trusted data source.
- Better alignment with authenticated user scope.
- Backend can ensure only the user's notes are summarized.
- Cleaner path for caching, persistence, and audit boundaries.

Cons:

- More implementation work.
- Requires backend access to note range data.
- Existing analytics utilities are TypeScript/shared utilities, while backend runtime is JavaScript.
- The shared utility reuse strategy must be confirmed before implementation.

Recommended direction:

- Design for backend rebuild as the long-term target.
- Allow a staged first implementation with frontend-provided `WeeklySummaryInput` only if backend validation, auth, and no-raw-note rules are strict.
- Before implementation, decide how backend JS will reuse or mirror shared TypeScript analytics utilities.

## Provider Boundary

Provider calls should be backend-only.

Provider boundary rules:

- Provider secret belongs in backend env or secret manager only.
- Frontend must never receive or store provider API keys.
- Provider SDK should not be added until the implementation PR that actually needs it.
- Provider-specific fields such as model, temperature, max tokens, retries, and response format should stay inside a provider adapter.
- Prompt builder should remain provider-neutral.

TypeScript candidate:

```ts
type WeeklySummaryAiProvider = {
  generateWeeklySummary(promptMessages: WeeklySummaryPromptMessage[]): Promise<string>;
};
```

Backend JavaScript candidate:

```js
const weeklySummaryAiProvider = {
  async generateWeeklySummary(promptMessages) {
    return "";
  },
};
```

The first implementation should use a mocked provider, not a real external API.

## Response Validation / Fallback

Provider response handling should be strict:

- Build rule-based fallback with `buildRuleBasedWeeklySummary`.
- Send prompt messages to the provider adapter.
- Parse provider response with `parseAndValidateWeeklySummaryResponse`.
- If validation succeeds, return `source: "ai"`.
- If validation fails, return `source: "rule_based_fallback"`.
- Include validation errors in a controlled field.
- Avoid exposing excessive provider details to users.
- Do not log full provider response text.

Fallback cases:

- Invalid JSON.
- Wrong root shape.
- Missing required fields.
- Wrong field types.
- Non-string array items.
- Overly long strings.
- Too many array items.
- Provider timeout or provider error, if the implementation chooses fallback instead of hard error.

## Rate Limit / Abuse Prevention

External AI calls have cost and abuse risk.

Before real provider integration, define:

- User-level rate limit.
- IP-level rate limit if practical.
- Time window, for example requests per minute or per hour.
- Range size limit.
- Request body size limit.
- 429 response shape.
- Whether repeated generation in the same range should be cached later.

Initial implementation can use a conservative limit and no persistence. More advanced caching should be a separate design.

## Logging / Privacy

Workout logs are personal data.

Logging rules:

- Do not log prompt payloads.
- Do not log provider responses.
- Do not log raw workout content.
- Do not log access tokens.
- Do not log provider API keys.
- Do not log raw request bodies.
- Error logs should contain only coarse provider status, route name, request ID, and safe error category.
- Raw note text should not be sent initially.

The endpoint should be designed under the assumption that prompt payloads and summaries can contain sensitive training habits and schedule patterns.

## Error Handling

Expected error classes:

- Authentication failure.
- Authorization failure.
- Request validation failure.
- Rate limit exceeded.
- Provider timeout.
- Provider 4xx/5xx.
- Invalid JSON provider response.
- Provider response validation failure.
- Internal fallback generation failure.

Response policy:

- Auth failure should return an auth-appropriate status.
- Request validation failure should return a clear, short client error.
- Rate limit should return 429.
- Provider validation failure can return fallback.
- Provider timeout/error can return fallback or a safe error depending on product choice.
- Frontend-facing messages should remain short and non-sensitive.

## Timeout / Retry

Timeout is required before real provider calls.

Recommendations:

- Set a provider request timeout.
- Avoid automatic retries initially to prevent duplicate cost.
- If retry is added later, use at most one retry with careful timeout budget.
- Consider fallback on timeout if rule-based summary is available.
- Treat repeated generation cost as a product and abuse-prevention concern.

## Persistence / Caching

Initial recommendation:

- Do not persist summaries.
- Generate on demand.
- Treat refresh as a possible regeneration.

Future options:

- Cache by user ID and date range.
- Persist weekly summary history.
- Store source and validation status.
- Invalidate when notes change.
- Allow deletion or correction of stored summaries.

Persistence requires a separate schema, retention, invalidation, and privacy design.

## Testing Strategy

Future implementation should include:

- Route auth tests.
- Authorization/user-scope tests.
- Request validation tests.
- Mocked provider success tests.
- Mocked provider invalid JSON tests.
- Mocked provider invalid shape tests.
- Provider timeout/error tests.
- Rule-based fallback tests.
- Response validation helper integration tests.
- Tests that external provider APIs are not called in unit tests.
- Tests that provider SDK calls are mocked.
- Tests for no prompt or response leakage in logs where practical.
- Rate limit tests if rate limiting is implemented.

No unit test should call an external AI API.

## Implementation Plan

Suggested phases:

- **Phase AF1: Backend AI endpoint design docs** - This document.
- **Phase AF2: Backend request/response types and validation helper if needed** - Validate date ranges and summary request shape.
- **Phase AF3: Backend endpoint skeleton with mocked provider only** - Add route/service shape without external calls.
- **Phase AF4: Provider adapter interface with mocked tests** - Keep provider boundary narrow.
- **Phase AF5: Frontend "Generate AI summary" button wired to mocked/local endpoint** - UI calls endpoint without real provider.
- **Phase AF6: External provider integration** - Add env, provider SDK or HTTP client, timeout, and operational checks.
- **Phase AF7: Optional cache/persistence** - Decide whether summaries need history or caching.

## Recommended Next Implementation

Do not start with external AI integration.

Recommended next implementation:

- Add backend endpoint skeleton with mocked provider tests.
- Add request validation for date range and summary payload.
- Use a mock provider adapter only.
- Use existing prompt builder and response validation helper.
- Return rule-based fallback on mocked invalid provider responses.
- Do not add env variables or API keys yet.
- Do not add provider SDK yet.

This keeps the contract, auth, validation, and fallback behavior stable before provider cost and secret management enter the project.

## Risks / Open Questions

- API cost can grow quickly without rate limits.
- Secret management must be designed before real provider integration.
- Provider selection is still open.
- Backend shared TypeScript utility reuse needs a decision because backend is JavaScript.
- Provider response validation must remain strict.
- Rule-based fallback quality should be acceptable for invalid provider responses.
- Prompt and response logging can leak private workout data.
- Prompt wording can drift as providers change behavior.
- Raw note text handling needs a separate privacy review.
- Storage or caching may require schema and deletion policy.
- Abuse prevention is needed before public provider calls.
- Frontend-provided summary input is less trustworthy than backend-rebuilt input.
- Localization may affect prompt constraints and validation expectations.

## Suggested Next Step

The next practical step is a backend endpoint skeleton with a mocked provider.

That PR should focus on:

- Route and service boundaries.
- Authentication and request validation.
- Mock provider success and failure paths.
- Response validation helper integration.
- Rule-based fallback behavior.
- No external provider calls.
- No provider SDK.
- No API key or env changes.
