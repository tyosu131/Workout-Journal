# Verification

This project uses Node 24 and separate dependency sets for the root workspace, frontend, and backend. Install each one before running local verification.

## Local Commands

```bash
npm ci
npm ci --prefix frontend
npm ci --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run build --prefix backend
npm test -- --runInBand
npm audit --omit=dev --audit-level=high --prefix frontend
npm audit --omit=dev --audit-level=high --prefix backend
```

## CI Checks

GitHub Actions runs the same baseline on push and pull request:

- Install root dependencies with `npm ci`
- Install frontend dependencies with `npm ci --prefix frontend`
- Install backend dependencies with `npm ci --prefix backend`
- Run frontend lint with `npm run lint --prefix frontend`
- Run frontend build with `npm run build --prefix frontend`
- Run backend JavaScript syntax check with `npm run build --prefix backend`
- Run the root Jest baseline with `npm test`

## Current Baseline

- Frontend build is expected to pass once frontend dependencies are installed.
- Backend build runs a JavaScript syntax check over backend `.js` files with `node --check`.
- Root Jest is configured in `jest.config.js` and scans `frontend`, `shared`, and `backend`.
- Frontend API client tests under `frontend/lib/__tests__` are included in `npm test` and CI.
- The same directory contains the Pages API proxy contract tests for namespace allow-listing, request/response preservation, independent `Set-Cookie` forwarding, and sanitized `502`/`504` behavior.
- Shared utility tests under `shared/utils/__tests__` are included in `npm test` and CI.
- Shared training normalization tests for `normalizeWorkoutSets` are included in `npm test` and CI.
- Shared training metrics tests for volume load and estimated 1RM are included in `npm test` and CI.
- Shared weekly training volume tests are included in `npm test` and CI.
- Shared training personal record detection tests are included in `npm test` and CI.
- Shared exercise metadata canonicalization tests are included in `npm test` and CI.
- Shared BIG3 trend aggregation tests are included in `npm test` and CI.
- Shared weekly muscle group volume aggregation tests are included in `npm test` and CI.
- Shared training graph data transformation tests are included in `npm test` and CI.
- Shared set intensity validation tests for RPE/RIR/failure are included in `npm test` and CI.
- Shared effort analytics summary tests are included in `npm test` and CI.
- Shared weekly summary input builder tests are included in `npm test` and CI.
- Weekly summary input builder prepares deterministic aggregate data for future AI/rule-based summaries without calling an AI API.
- Weekly summary input includes deterministic Growth Signals for future rule-based and AI summaries.
- Shared rule-based weekly summary tests are included in `npm test` and CI.
- Analytics displays a deterministic rule-based weekly summary preview without calling an AI API.
- Rule-based weekly summary can use Growth Signals without calling an external AI API.
- Shared weekly summary prompt builder tests are included in `npm test` and CI.
- Weekly summary prompt builder creates provider-neutral prompt payloads without calling an external AI API.
- Shared weekly summary response validation tests are included in `npm test` and CI.
- Weekly summary response validation safely validates structured weekly summary responses before future AI rendering.
- Shared Growth Signals helper tests are included in `npm test` and CI.
- Growth Signals derive deterministic analytics signals without calling an external AI API.
- Analytics displays Growth Signals from deterministic shared helper output.
- Growth Signals are shown without calling an external AI API.
- Frontend note set types allow optional `rpe`, `rir`, and `failure` fields.
- Note input UI can optionally capture set-level `rpe`, `rir`, and `failure` from an advanced effort row.
- Existing `weight` / `reps` / `rest` input remains the primary note entry flow.
- The `/analytics` page scaffold reuses the authenticated notes range API and is covered by frontend lint and build checks.
- Frontend weekly summary API helper tests are included in `npm test` and CI.
- Analytics can request a mocked backend weekly summary response without calling an external AI API.
- Analytics uses Recharts for the BIG3 estimated 1RM line chart; BIG3 cards remain as accessible exact-value fallback content.
- Analytics uses Recharts for the weekly muscle-group chart with `totalSets` / `totalVolumeLoad` metric toggle; the muscle-group table remains as exact-value fallback content.
- Analytics includes an exercise trend selector using existing normalized set metrics and canonical exercise groups when metadata matches.
- Analytics displays set-level effort summary for RPE/RIR/failure when logged.
- Missing effort values are treated as unknown, not zero.
- Analytics chart empty states are range-aware, and exact-value fallback tables remain available for BIG3, muscle groups, and exercise trends.
- Unmatched exercise trends remain raw-name groups; exercise chart tooltips and fallback tables show raw exercise names.
- Frontend analytics canonical exercise grouping helper tests are included in `npm test` and CI.
- Recharts and `react-is` are frontend dependencies only.
- Backend auth utility tests under `backend/utils/__tests__` are included in `npm test` and CI.
- Backend note exercises validation tests are included in `npm test` and CI.
- Backend weekly summary endpoint skeleton tests are included in `npm test` and CI.
- Backend weekly summary endpoint uses a mocked provider only and does not call an external AI API.
- Backend weekly summary provider adapter tests are included in `npm test` and CI.
- Backend weekly summary provider adapter remains mocked and does not call an external AI API.
- Backend note service tests under `backend/services/__tests__` are included in `npm test` and CI.
- Backend `saveNote` defensively normalizes nested exercise intensity fields before persistence.
- Backend auth service validation and refresh tests under `backend/services/__tests__` are included in `npm test` and CI.
- `--passWithNoTests` was removed after adding shared tests to the Jest baseline.
- Test output no longer includes the old `calendarUtils` debug log or the `ts-jest` `esModuleInterop` warning.
- Browser API endpoints use same-origin `/api/*`; Backend routing is server-only through `BACKEND_INTERNAL_URL`.
- The Next.js custom font warning is resolved by loading global font links in `frontend/pages/_document.tsx`.

## Cloud Run Build Verification

Build both images from the repository root so the frontend can resolve `shared/`:

```bash
docker build --file backend/Dockerfile --tag workout-journal-backend:verify .
docker build \
  --file frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://public-example.invalid \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-example-key \
  --tag workout-journal-frontend:verify \
  .
```

The frontend image accepts only the two publishable Supabase build arguments. Backend secrets and `BACKEND_INTERNAL_URL` are runtime-only.

For browser-artifact secrecy, build with a unique non-secret Backend URL canary in the environment, then confirm the canary is absent from `.next/static` and generated `.html` files. The variable name may appear in the server-side API bundle; its runtime value must not.

Runtime probes use `PORT=8080`. Expected current contracts are Frontend `/` = `200`, Backend `/` = `404`, invalid `POST /auth/login` = `400`, and unauthenticated `GET /notes/test` = `401`.

## Deployment Verification Boundary

Container builds and local runtime probes verify repository artifacts only. Cloud Run service creation, no-traffic candidate deployment, production smoke, traffic promotion, and Safari/iOS Safari/Chrome/Firefox/Edge browser smoke are Human Gate work described in [the deployment runbook](./cloud-run-deployment-runbook.md).

## Automated Candidate E2E Evidence

[P2A/P2B E2E runbook](./e2e-smoke-runbook.md) owns the execution and cleanup contract.
P2A verifies the local isolated foundation. On 2026-09-05, P2B run
`p2b-1788593776629-9943a84c9ea7c644` passed the same serial Chromium scenario
against the actual HTTPS Frontend 0% candidate paired with its exact Backend
candidate URL, using application source `9b6c3c69543784b3e02e4fd9b45d8e7a4b34300d`.

The proof includes matched autosave responses and persisted values after reload;
Calendar tag/date-to-note navigation; Bench Press `60 x 5` / estimated 1RM `70`;
catalog and persisted-note tag removal; and logout token/cookie removal, refresh
401 and protected-route redirect. HTTPS refresh-cookie flags were verified.
Exact disposable-user cleanup left Auth/profile/notes/user_tags residuals at zero.
Production revisions stayed at 100%, the candidate pair stayed at 0%, and sanitized
evidence passed secret inspection without raw browser artifacts.

`npm run e2e:test` checks TypeScript and controller safety. `npm run e2e` and
`npm run e2e:cleanup` select explicit local or Human-approved manifest-bound
candidate mode; candidate credentials use a private stdin pipe, never CLI values.
No E2E step was added to the required PR CI workflow. P2B is Must 2 evidence,
not promotion, full v1 cross-browser smoke, password-recovery evidence or CD
activation. Subsequent [CD-B2 evidence](./wif-submission-proof.md#cd-b2-verified-runtime-proof)
closed PE-P1C-01B and confirmed WIF `ACTIVE` / `disabled = false`; Must 4 remains
Open and production CD inactive. The production Environment was separately
[configuration-verified](./portfolio-infra-ownership.md#production-environment-and-activation-dependency);
runtime deployment-approval integration is still future work, not P2B evidence.

## CD-C1 Offline Validation

The [CD-C1 source contract](./cd-c1-candidate-delivery.md) is not runtime activation.
Run these checks without a Supabase credential, OIDC token or workflow dispatch:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -v
npm run e2e:test
actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform state list
terraform -chdir=infra/terraform plan -detailed-exitcode
git diff --check
```

Use Node 24. All controller cloud operations in tests are mocked; v2 manifest
validation, tampering/identity/stale-state rejection, ETag update shape, exact
rollback, private stdin and cross-provider mapping are checked offline. Expected
state is **35 applied resources** after CD-C2A; CD-C2B's baseline was no-op.
CD-C2C's expected plan is **0 create / 1 update / 0 delete / 0 replace** (exit 2),
only E2E provider `disabled: true -> false` and its neutral description. Actual
runtime is still disabled, Secret Manager version 1 is ENABLED, and activation
is UNCONFIGURED. Do not apply a source-validation plan.

`test_e2e_wif_proof.py` executes synthetic auth responses and reads actual YAML:
the default proof mode cannot reach Build/candidates/secret access/production;
A/B share the same federated token; only expected IAM denial passes B; unexpected
success or unrelated failure blocks C; positive proof uses the existing reusable
workflow; release still requires activation, manifest/hash and exact version.
Tokens and raw errors cannot enter evidence. Tests never request real OIDC.
Positive/negative WIF, credential consumption and candidate/promotion/rollback
runtime proofs remain separate Human Gates.
The existing required CI job also runs both offline test commands; its check name
is unchanged. These tests never authenticate to Google or Supabase.

## Test Candidates

- Expand coverage for `shared/utils/calendarUtils.ts` and `shared/utils/validationUtils.ts`.
- Add DB-backed/custom exercise catalog exploration, expanded effort trend charts if needed, optional weekly summary persistence/cache design, and external AI integration only after core analytics signals and the mocked frontend/backend flow are stable.
- Expand API client tests for retry limits and non-401 error paths.
- Expand route/service tests for notes and auth Supabase success/error paths.
- Resolve or document the remaining Google Fonts download warning if the build environment cannot reach Google Fonts.
- Add backend unit tests or integration tests; the current backend build checks syntax only.
