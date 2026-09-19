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

## CD-C3C Recovery Contract Validation

On 2026-09-19, C3C implemented the [future recovery/result contract](./cd-c3-e2e-recovery-contract.md)
against main `ea3d0919eba549538da2346001ba45409e4a9465`. This is local source
verification; the separate Fresh Result Audit below passed. It is not a new release or cleanup proof.
Fresh GitHub read-back reconfirmed incident `35414003825`, exact SHA, attempt 1,
failure: preflight/candidate success, candidate-e2e failure, verify/production skipped,
and zero artifacts. At C3C, scenario was NOT PROVEN, residual UNKNOWN, old random
identity/recovery handle LOST. C3D later closed current residual uncertainty only
(see below). Historical R2/R4/R6 records remain unchanged.

Passed with Node **24.18.0**:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -q
npm run e2e:test
npm test -- --runInBand
actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml
git diff --check
```

Results: **85 Python tests**, **65 offline E2E tests** (including TypeScript check),
**46 Jest suites / 403 tests**, actionlint **1.7.12**, and diff check PASS.
The existing default Homebrew Node 25 binary had a missing library; validation used
the installed Node 24 binary through a per-command PATH, without changing the host.
No application build or Terraform plan is claimed.

Coverage includes the RFC UUIDv5 known vector, candidate/process/host stability,
all four pre-create collision checks, exact read-only cross-run recovery metadata,
independent scenario/cleanup outcomes, API/malformed-response/residual classifications,
remote-zero versus local receipt failure, and actual child-controller execution with
mocked external adapters. Python tests cover failed-child results, missing/malformed/
foreign/oversized/duplicate-key envelopes, inode/mode/symlink guards, and real Node
writer compatibility. Injected UUID/email/password/secret/token/URL/response/exception
markers do not enter published logs, summary or GitHub success outputs on failure.
No live Supabase, browser E2E scenario or cloud mutation runs in these tests.

Detection-force tests run nine source mutants in disposable offline copies and
require assertion failures: random UUID; missing candidate binding; public email;
raw child stderr forwarding; unknown counts as zero; receipt failure treated as
remote cleanup unproven; generic Auth user listing fallback; host/PID-bound recovery;
and missing parent result binding. **9/9 detected**; repository source is not mutated
by these tests. Prior exit-code tests were replaced by this structured-result and
controller coverage, rather than retaining the obsolete conflated cleanup semantics.

Runtime audit: only the explicitly authorized **one** deletion of
`CD_C1_ACTIVATION` occurred; final read-back is **UNCONFIGURED**. Before/after Cloud
Run metadata match exactly (both generations 7, retained traffic/tag/URL entries),
with C3A candidates at 0% and production Backend `00003-luc` / Frontend `00003-xar`
at 100%. No dispatch/rerun, secret access, generic user discovery, cleanup, IAM/WIF,
Terraform, Build, Cloud Run or production mutation was performed. Application source,
workflow YAML and Terraform `.tf` are unchanged. No secret/credential payload was
read, displayed or saved. All **63 local Markdown links/anchors** in changed docs
resolve; the canonical R1–R7 historical block was byte-identical to the implementation
baseline. The implementation stopped unstaged at **READY FOR FRESH RESULT AUDIT**,
before commit/push/PR.

### CD-C3C Fresh Audit and Pre-PR

The separate 2026-09-19 [Fresh Result Audit](./cd-c3-e2e-recovery-contract.md#fresh-result-audit-and-pre-pr)
closed First Pass before any edit/staging: **Must 0 / Should 0 / Pending Evidence 0 /
Decision Needed 0**. All 27 paths were classified individually; no unrelated change
was found. Exact baseline source was compared with GitHub; incident logs/jobs,
activation UNCONFIGURED and candidate/production traffic were freshly read.

The auditor independently reran the same 85 Python, 65 offline E2E, 403 Jest tests,
actionlint and diff/link checks. The nine source mutants were detected again; three
additional wrong-column/UUID/broad-query mutants also failed. Python stdlib UUIDv5
independently matched four candidate inputs and the RFC vector. Concatenated JSON,
partial JSON and hard-linked IPC were refused. No live Supabase operation or release
execution occurred. Semantic source/test fixes after First Pass: **none**. The staged
diff check found one extra EOF blank line in the new release fixture; it was removed
and the staged check rerun. Audit records and Current-status references were updated.

Local Pre-PR passed final scope, diff, 63-link and credential-safety checks.
At that audit, commit/push/PR and required CI verification were authorized; merge
remained Human action. Old incident residual was **UNKNOWN**, with post-merge CI
and a separate residual-policy Human Decision still pending. No release retry,
recovery, approval or promotion was authorized by that audit.

### CD-C3D Residual Investigation and C3E Closure

C3D confirmed PR #106 merged at main `a332289c95b846aed10c6f9d31c9339e7fc279ed`
and required post-merge CI run `35418949564` SUCCESS. C3C source remediation is
source-reviewed / CI-passed; runtime is not yet proven.

The [C3D aggregate evidence and claim boundary](./cd-c3-e2e-recovery-contract.md#c3d-current-residual-closure)
record one successful dedicated E2E secret version 1 access, complete Auth pagination,
0 exact historical ownership matches and 0 synthetic public candidates. Current
Auth/users/notes/user_tags residual outcome is **0/0/0/0 under verified current
schema contract**; application counts are schema-based conclusions, not fresh
exact-UUID counts. Production Supabase destination and repository schema/release
evidence were consistent. Live DDL was not freshly re-read; no contradictory drift
evidence was observed. No secret payload, UUID/email or raw user list was emitted
or saved; no destructive operation occurred.

Current residual Pending Evidence is **CLOSED**. Historical scenario **NOT PROVEN**
and cleanup execution **UNPROVEN** remain unchanged. C3D used no retroactive UUIDv5
recovery and did not verify C3C runtime. Activation stayed UNCONFIGURED, candidates
0%, production 100%; Must 3 stays In progress and Must 4 Open.

C3E reflects this evidence through documentation only. Validation is limited to
diff/whitespace checks, local links, Current/Historical/Future consistency and
sensitive-data inspection. No application/runtime validation, Supabase access,
cloud operation, dispatch/rerun, settings or Terraform/IAM/WIF mutation is performed.
The handoff is **READY FOR FRESH RESULT AUDIT**, before commit/push/PR; after closure
review/merge, **FRESH_RELEASE_PROOF_READY** still requires separate authorization.

## CD-C2D-R8 Runtime Evidence and R9 Documentation Closure

**Current: isolated WIF proof CLOSED / PASS; A/B/C PASS; R7 remediation runtime
verification PASS.** The [canonical R8 evidence / R9 closure](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure)
is owned by run `35411846680`, exact source
`6c0b91579f2caff02e9e190249c4c4bd73e877d1`, `main`, `workflow_dispatch`, attempt 1,
conclusion `success`. R9 freshly read the GitHub run, attempt-1 jobs/steps and safe
logs on 2026-09-19: A `AUTH_SUCCESS / P4 / PASS`, B
`IAM_PERMISSION_DENIED / P5 / PASS`, C `AUTH_SUCCESS / P4 / PASS`.
Both proof steps succeeded and all release jobs were skipped. The exact source
reuses A's federated STS token for B and accepts only HTTP 403 + error code 403 +
`PERMISSION_DENIED`; it does not reuse a Deploy-SA token or mint an extra STS token
for B. C executes through `candidate-e2e.yml` after A/B.

R2's broad P1 failure, R4's endpoint-validation failure and R6's fixed-path
rejection remain Historical. R8 passed the remediated path boundary and completed
the isolated proof; it did not prove the full release delivery path. Must 3 is
**In progress** (monitoring/alert resources deferred to Must 5 design), Must 4
**Open** (full delivery runtime proof, automatic triggering and production
activation). Production CD is **inactive**; R9 read back `CD_C1_ACTIVATION`
**UNCONFIGURED**. No R9 cloud state read-back is claimed.

R9 documentation validation **PASS**: `git status --short`, `git diff --name-status`,
full `git diff` review and `git diff --check`; 64 local links checked with no new
broken file/anchor targets; the complete canonical R1-R7 record is byte-for-byte
preserved; added-text credential scan passed. No dedicated docs
validator is configured in repository scripts/CI. Application build/tests and
Terraform commands are not required for these Markdown-only edits and are not
R9 evidence. Application source, workflows and Terraform `.tf` files remain
unchanged. Runtime mutation is **NONE**; no new proof, credential access or release
execution. Implementation handoff stopped at **READY FOR FRESH RESULT AUDIT**,
before commit/push/PR.

The separate **R9 Fresh Result Audit First Pass passed on 2026-09-19** with
**Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0** before edits or
staging. It independently re-acquired R8 metadata/jobs/safe logs and main source,
confirmed A/B/C contracts, reviewed the full diff and existing Must 3/4 ownership,
and reproduced the 64-link, Historical-integrity, credential and diff checks.
No remediation was needed; only audit-state documentation changed afterward.
Pre-PR rechecks that final Markdown-only diff and the PR description before
commit/push/PR and required CI verification. No application build was needed for
the local docs audit; the normal PR CI remains required. No new runtime proof,
cloud operation, activation or settings mutation is authorized by this audit.

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
state is **35 applied resources**. CD-C2C provider activation is COMPLETE; both
providers are **ACTIVE / disabled=false** and the R1 read-only plan was
**No changes / exit 0**. Secret Manager version 1 is ENABLED and
`CD_C1_ACTIVATION` is UNCONFIGURED (R9 read-back). Isolated WIF proof is now
**CLOSED / PASS** under the R8 record above. Historical R6 run `35323990499`
failed at A with `OIDC_ENDPOINT_PATH_FAILED / P1`, before request-token validation
/ HTTP request; B was not run and C skipped in that run. Provider/secret state
above is the existing record, not a fresh R9 cloud check. R9 performs no Terraform
operations or runtime proof; do not run the Terraform commands above, apply,
rerun or dispatch as part of R9.

`test_e2e_wif_proof.py` executes synthetic auth responses and reads actual YAML:
the default proof mode cannot reach Build/candidates/secret access/production;
A/B share the same federated token; only expected IAM denial passes B; unexpected
success or unrelated failure blocks C; positive proof uses the existing reusable
workflow; release still requires activation, manifest/hash and exact version.
R1/R3 diagnostics retain P0-P5, request-token, transport, HTTP-status and P2
parser-before-status semantics. [R7 path remediation](./cd-c1-candidate-delivery.md#cd-c2d-r6-runtime-evidence-and-r7-opaque-endpoint-path)
removes only the fixed path suffix requirement and its unreachable current code.
Missing / parse / scheme / host / port / userinfo / fragment / query-build
diagnostics remain; the origin/security predicates and their order are unchanged.

Historical R7 validation passed **79 Python tests**, **24 offline E2E tests** with Node **24.18.0**,
actionlint **1.7.12** and `git diff --check`. Three new regression tests failed on
the R6 source before remediation. Both callers now pass arbitrary synthetic paths
through to request-token validation; the real HTTP Request with mocked transport
retains the original path, ordered existing non-audience query pairs and exactly
one expected audience. Empty query values keep the existing `parse_qsl` behavior.
No new path pattern or path normalization is introduced. Tests still reject
insecure scheme, wrong host, disallowed port, userinfo and fragment before HTTP.
stdout/stderr/summary safety is checked for success, transport errors and invalid
response data with synthetic URL/path/query/credential markers.

All **six wrong-remediation categories / 14 in-memory variants** were detected:
guessed suffix, all endpoint guards removed, weakened hostname, path rewritten,
runner query dropped, and URL/path/query disclosure to each of the three sinks.
No mutant was written to repository source. Whole-module AST comparison against
R6 SHA `fdc017ba4e7e2756fefde9c6ac2b8cd1379e2fab` matches after removing only the
path requirement, its checkpoint and its diagnostic-map entry. Workflow YAML,
Terraform and application source are unchanged. R7 runtime mutation is **NONE**;
no commit/push/PR in the implementation session. Its handoff was
**READY FOR FRESH RESULT AUDIT**, not runtime closure.

The historical R7 Fresh Result Audit / Pre-PR reproduced all checks above and
closed First Pass with **Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**
before any code/docs/staging change. GitHub R6 run/jobs/safe logs and tested source
were re-acquired read-only. The three regression tests failed on R6 and passed
on R7 in memory. An independent AST comparison and 14 AST mutants confirmed
minimal policy change and detection force. A separate 16-case Request matrix and
five origin rejection cases passed with synthetic inputs and mocked transport.
No code fix was needed; only audit-state docs changed after closure. Pre-PR permits
commit/push/PR and required CI verification. No dispatch, rerun, cloud operation
or settings mutation occurred; runtime verification remains a separate Human Gate
after review, merge and post-merge CI.

Historical R5 verification: **77 Python tests**, **24 offline E2E tests** under Node **24.18.0**,
actionlint **1.7.12** and `git diff --check`. All endpoint failure tests run both
callers through the entrypoint, assert exact codes/zero HTTP calls, and inspect
stdout/stderr/summary for synthetic credential/URL/exception leakage. Multi-fault
cases verify first-failure precedence; accepted forms and exact query normalization
verify unchanged policy. Invalid/out-of-range port property access maps to PORT;
malformed URL parsing maps to PARSE. Query parsing/encoding/assembly exceptions
are injected into existing operations without production test hooks.
Five wrong-implementation categories were detected in seven in-memory variants:
host as scheme, port as host, path as generic endpoint, raw URL, and raw exception
output independently to stdout/stderr/summary. No mutation experiment writes
repository source. Authentication AST comparison matched after diagnostic removal,
endpoint inlining and ordered-predicate normalization; missing input was already
rejected by the previous scheme check. The standard PATH Node still has a missing
shared library; the existing compatible Node 24 binary completed all checks.

R5's separate Fresh Result Audit / Pre-PR on 2026-09-18 reproduced the results
above and closed First Pass with **Must 0 / Should 0 / Pending Evidence 0 /
Decision Needed 0** before any code/docs/staging change. Its independent AST and
28-case caller checks confirmed policy preservation, exact codes, first-failure
ownership, all output sinks and zero HTTP requests. A real synthetic query-encoding
failure mapped to QUERY_BUILD without patched URL operations. All seven required
mutants plus nine premature-HTTP mutants were detected in memory. No code fix
was required; only audit-state docs changed afterward. Commit/push/PR and required
CI verification may proceed. This does not establish a root-cause fix or authorize
runtime proof. Workflow YAML, Terraform and application source remain unchanged;
audit runtime mutation is NONE. Details are in the canonical R4/R5 record.
At that R5 handoff, positive/negative WIF proof was still pending; R8 now closes
the isolated A/B/C proof above. Credential consumption and candidate/promotion/
rollback runtime proofs remain separate Human Gates. Must 3 stays In progress, Must 4 Open,
production CD inactive. The existing required CI job runs both offline test
commands; its check name is unchanged. These tests never authenticate to Google
or Supabase.

## Test Candidates

- Expand coverage for `shared/utils/calendarUtils.ts` and `shared/utils/validationUtils.ts`.
- Add DB-backed/custom exercise catalog exploration, expanded effort trend charts if needed, optional weekly summary persistence/cache design, and external AI integration only after core analytics signals and the mocked frontend/backend flow are stable.
- Expand API client tests for retry limits and non-401 error paths.
- Expand route/service tests for notes and auth Supabase success/error paths.
- Resolve or document the remaining Google Fonts download warning if the build environment cannot reach Google Fonts.
- Add backend unit tests or integration tests; the current backend build checks syntax only.
