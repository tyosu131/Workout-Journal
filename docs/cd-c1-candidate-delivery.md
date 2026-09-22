# CD-C1: dedicated candidate E2E and gated delivery

Current runtime status (C4D, 2026-09-21): **Must 4 Closed; automatic production
delivery SUCCESS; C4C remediation source and runtime PROVEN**. The current
production pair is `cd-35573153822-1`, each service at 100%; `CD_C1_ACTIVATION`
is **UNCONFIGURED**. See the [C4D evidence and requirement mapping](#c4d-automatic-production-delivery-runtime-closure).
Must 3 remains **In progress** for monitoring/alert resources. C3 runtime chain
and the authorization defect remain CLOSED; historical root-cause boundaries are unchanged.

PR #114 → main CI `35572912520` → automatic `workflow_run` CD `35573153822`
proved exact-source Build/candidates, 8/8 E2E, PROVEN_ZERO cleanup, verify,
Human production Environment approval, paired promotion and post-deploy verification.
Manual activation remains UNCONFIGURED; the automatic path succeeded without it.
The [C4B failure/C4C diagnosis](#c4c-nested-playwright-authority-remediation) remains
Historical. Dated phase sections retain their then-current traffic and OPEN/NOT-YET
states; they do not override this Current summary. C4D only reads runtime evidence
and synchronizes docs; it performs no runtime mutation.

CD-C1 merged at `b73e2461de363f00fb01e5620cf3fe7288078a37`; CD-C2A/B provisioning,
CD-C2C activation and [R8 isolated WIF proof / R9 closure](#cd-c2d-r8-runtime-proof-and-r9-closure)
remain complete. [C3C/C3D recovery evidence](./cd-c3-e2e-recovery-contract.md)
retains the historical cleanup limits. C3P proved `HTTP_STATUS / OPERATION_GET / 403`,
C3R2 proved missing effective allow, and C3U/C3V establish remediation runtime
**PROVEN** and the current authorization defect **CLOSED**. Historical C3N/C3P
incident root cause remains **STRONGLY_SUPPORTED_NOT_PROVEN** for the reasons in
the closure record. C3N's unrecorded HTTP integer is not retroactively filled in.
C3G and C3K technical root causes remain **NOT PROVEN**.

## Current CD-C2A/B runtime record

CD-C2A is **COMPLETE**: the separately approved five-resource apply provisioned
the E2E SA, secret container, exact-secret Accessor, disabled provider and mapped
WorkloadIdentityUser member. Remote state then contained **35 resources**; the subsequent
CD-C2B read-only plan was **0 add / 0 change / 0 destroy**. Optional empty-collection
normalization with a no-op action is not a resource update.

CD-C2B is **COMPLETE** (2026-09-10). Human-created Supabase project
`krpnnkcipyeasddzbpma` Secret key has actual Dashboard display name **`candidate_e2e`**;
`candidate-e2e` below denotes its logical E2E role, not its display name.
Clipboard-to-memory-validation-to-gcloud-stdin ingestion created exactly
`projects/437413312066/secrets/workout-journal-e2e-supabase-secret-key/versions/1`
at `2026-09-10T10:55:20.897236Z`. Metadata read-back confirmed **1 / ENABLED**,
exactly one total/enabled version; the clipboard was cleared. No payload read-back,
repository storage, Terraform storage or credential-bearing evidence was used.

Runtime IAM read-back verified the E2E SA's exact-secret Accessor, zero user-managed
keys, no project-level E2E grant, no E2E access to Backend/JWT secrets, and no
Deploy or Backend runtime SA access to the E2E secret. Existing Deploy provider
remains enabled. CD-C2C provider activation is now **COMPLETE**: both providers are
**ACTIVE / disabled=false**, rechecked during CD-C2D-R1 with **35 resources /
No changes / exit 0**. `CD_C1_ACTIVATION` is **UNCONFIGURED**.
Neither CD-C2A nor CD-C2B dispatched CD, submitted a Build, created a Run revision,
changed traffic or published an image. Their runtime completion does not close
Must 3 or Must 4. Do not repeat their provisioning or secret-version insertion.

## Current CD-C3A incident and CD-C3C remediation

[Run 35414003825](https://github.com/tyosu131/Workout-Journal/actions/runs/35414003825),
source `ea3d0919eba549538da2346001ba45409e4a9465`, attempt 1, failed at
`candidate-e2e / e2e`: `cleanup / E2E_CLEANUP_UNPROVEN`. Preflight, Build,
immutable images and paired 0% candidate creation passed. Scenario result is
NOT PROVEN, cleanup execution UNPROVEN, residual initially UNKNOWN, and the historical random UUID/P2B runId
and exact recovery receipt are unavailable. Verify-candidate and production were
skipped. C3D separately established **HISTORICAL_RESIDUAL_PROVEN_ZERO under
verified current schema contract**: complete Auth discovery matched 0 and public
synthetic candidates were 0. Residual Pending Evidence is CLOSED; this does not
prove historical cleanup execution or scenario success. See the
[C3D evidence boundary](./cd-c3-e2e-recovery-contract.md#c3d-current-residual-closure).

Historical C3C/C3D state: C3C deleted `CD_C1_ACTIVATION` exactly once under explicit Human authorization;
read-back on 2026-09-19 confirmed **UNCONFIGURED**. Both C3A candidates are retained
at 0%; production Backend `workout-journal-backend-00003-luc` and Frontend
`workout-journal-frontend-00003-xar` remain at 100%, reconfirmed in C3D. C3C
performed no incident discovery; C3D performed read-only discovery only, with no
cleanup, new dispatch or promotion. Must 3 stays In progress,
Must 4 Open, production CD inactive.

The [C3C source contract](./cd-c3-e2e-recovery-contract.md) adds deterministic
candidate-bound UUIDv5 identity, exact pre-create zero checks, separate read-only
recovery ownership, and a strict private child result channel. Only validated
safe results reach logs/summary, including failed-child sub-results. These are
merged source changes with required post-merge CI PASS; C3F later runtime-proved
the successful candidate/E2E/cleanup path. Failure-path transport and cross-run
recovery are not runtime-proved by that success. They do not retroactively recover
the old v1 identity or prove C3A cleanup execution.

## CD-C2D-R8 runtime proof and R9 closure

**Current: isolated WIF proof CLOSED / PASS; A PASS, B PASS, C PASS.** Evidence
owner is [R8 run 35411846680](https://github.com/tyosu131/Workout-Journal/actions/runs/35411846680),
source **`6c0b91579f2caff02e9e190249c4c4bd73e877d1`**. R9 freshly re-acquired
GitHub run metadata, attempt-1 jobs/steps and allowlisted proof log records on
2026-09-19; closure does not rely on the prior completion report alone.

| Run identity | Verified value |
| --- | --- |
| Workflow / mode | `.github/workflows/cd.yml` / `wif-proof` |
| Event / branch | `workflow_dispatch` / `main` |
| Head SHA | `6c0b91579f2caff02e9e190249c4c4bd73e877d1` |
| Attempt / conclusion | `1` / `success` |
| Created / completed run update | `2026-09-19T01:11:11Z` / `2026-09-19T01:11:32Z` |
| R8 execution count | One dispatch; zero reruns or second dispatches |

The exact source includes [merged PR #104](https://github.com/tyosu131/Workout-Journal/pull/104);
post-merge [CI 35411423165](https://github.com/tyosu131/Workout-Journal/actions/runs/35411423165)
passed `Lint, build, and test baseline` before R8. Both proof jobs checked out the
exact source. The safe runtime records are:

| Check | providerRole | targetSA | expected | phase | result |
| --- | --- | --- | --- | --- | --- |
| A | `deploy` | `workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com` | `AUTH_SUCCESS` | `P4` | **PASS** |
| B | `deploy` | `workout-journal-e2e@workout-journal-506909.iam.gserviceaccount.com` | `IAM_PERMISSION_DENIED` | `P5` | **PASS** |
| C | `e2e` | `workout-journal-e2e@workout-journal-506909.iam.gserviceaccount.com` | `AUTH_SUCCESS` | `P4` | **PASS** |

Both emitted envelopes were `wifProof: PASS`; no failure code was emitted.
[Job 105812872442](https://github.com/tyosu131/Workout-Journal/actions/runs/35411846680/job/105812872442)
(`wif-control-negative`) and its `Deploy control then expected E2E impersonation denial`
step succeeded. [Job 105812893686](https://github.com/tyosu131/Workout-Journal/actions/runs/35411846680/job/105812893686)
(`wif-positive / wif-proof`) and its `Dedicated E2E provider authentication only`
step succeeded after A/B, through `.github/workflows/candidate-e2e.yml`.

The [exact proof source](https://github.com/tyosu131/Workout-Journal/blob/6c0b91579f2caff02e9e190249c4c4bd73e877d1/.github/scripts/e2e_wif_proof.py)
calls `federate` once for A/B, then passes that same STS token to Deploy-SA
impersonation and to E2E-SA negative impersonation. B neither obtains another STS
token nor uses A's impersonated Deploy-SA token. B can pass only with **HTTP 403,
`error.code = 403`, `error.status = PERMISSION_DENIED`**. This establishes the
expected denial through that exact executed contract; no raw response or token
comparison is retained. A proves Deploy-provider federation and Deploy-SA
impersonation; C proves E2E-provider federation and E2E-SA impersonation through
the reusable workflow. These claims apply to this run/source, not every identity,
IAM path, future GitHub run or full production delivery path.

**R7 remediation runtime verification: PASS.** The fixed `/idtoken` suffix
requirement is absent; the runner-provided path remains opaque. Endpoint presence,
parse, HTTPS, GitHub Actions hostname restriction, port, userinfo prohibition and
fragment prohibition remain. R8 advanced beyond the historical R6 path boundary
and completed A/B/C. R6's `OIDC_ENDPOINT_PATH_FAILED` remains Historical evidence;
R2's broad P1 and R4's endpoint-validation failures are not reclassified.

All release jobs were **SKIPPED**: `preflight`, `candidate`, `candidate-e2e`,
`verify-candidate`, `production`, and the reusable workflow's `wif-positive / e2e`.
R8 did not execute `mode=release`, Cloud Build, Cloud Run candidate deployment,
Secret Manager E2E credential consumption, production Environment approval or
traffic promotion. Proof authentication API calls were R8's intended action.
`CD_C1_ACTIVATION` was freshly read back **UNCONFIGURED** in R9. Existing provider,
IAM, Terraform and secret metadata records are not new R9 cloud read-backs.

**Historical R9 remaining scope:** Must 3 stayed **In progress**. Its concrete remaining
gap is monitoring and alert resources, explicitly unimplemented and deferred to
Must 5 design in the [ownership matrix](./portfolio-infra-ownership.md#approved-ownership-matrix)
and required where applicable by the [Completion Contract](./portfolio-completion-contract.md#must-3-infrastructure-as-code--identity).
R8 adds isolated Deploy/E2E trust-boundary evidence; it does not implement those
resources. No additional identity/build hardening gap is inferred, and automatic
default-SA-grant prevention stays Backlog / separate hardening.

At the R9 checkpoint, Must 4 stayed **Open**: the merged release source needed full candidate
delivery runtime proof (Build/digests, exact Backend tagged URL and paired Frontend,
dedicated-secret E2E and cleanup), production approval integration, Backend then
Frontend promotion, post-deploy verification and failure/rollback verification.
At R9, automatic main-merge + CI-success triggering was unimplemented and
`cd.yml` had only `workflow_dispatch`. Production CD was **inactive** at R9. Isolated WIF
success is no longer a remaining prerequisite. Portfolio Done is not established.
The later [C3U/C3V closure](#c3u-and-c3v-runtime-closure) proves the manually
dispatched production path; [C4D](#c4d-automatic-production-delivery-runtime-closure)
subsequently closes full automatic delivery proof. Future runtime actions retain their Human Gates.

R9 is documentation closure only: no dispatch, rerun, Terraform operation, IAM/WIF
change, Secret Manager access/mutation, Build, Cloud Run mutation, GitHub settings
change or production release. No endpoint value, token, credential, authorization
header or raw sensitive response is included. Implementation handoff was **READY
FOR FRESH RESULT AUDIT**, before commit/push/PR. The R1-R7 sections below retain their Historical
results and phase-local gates; they do not override the Current R8 closure.

The separate **R9 Fresh Result Audit First Pass passed on 2026-09-19**, before
any audit edit or staging: **Must 0 / Should 0 / Pending Evidence 0 / Decision
Needed 0**. It freshly re-acquired R8 run/jobs/safe logs, main source identity,
PR #104 and required post-merge CI, and `CD_C1_ACTIVATION` UNCONFIGURED. Actual
A/B/C source semantics and the complete eight-file diff agreed with the runtime
records. The canonical R1-R7 block was byte-for-byte identical to main; all 64
local links resolved, and credential checks passed. Must 3's remaining resource
scope comes from the existing monitoring/alert ownership decision deferred to
Must 5 design; at R9, Must 4 retained full release verification and automatic triggering.
No remediation was needed. Only this audit record and its verification summary
were updated after First Pass; Pre-PR rechecks those additions before staging.
Commit/push/PR and required CI verification may proceed under the Pre-PR gate;
merge, new WIF proof, full release execution and production activation are not
part of this audit. Audit runtime mutation remains **NONE**.

## CD-C2D failed proof and CD-C2D-R1 diagnosis

[Run 35229757740](https://github.com/tyosu131/Workout-Journal/actions/runs/35229757740)
was dispatched exactly once with `mode=wif-proof`, `event=workflow_dispatch`,
`main`, attempt **1**, source `fc93af7c4eaeebaaf831550f66aae1df6edaebe4`.
The run was created at `2026-09-17T13:51:30Z` and concluded **failure** at
`13:51:39Z`. Checkout of the exact SHA succeeded; the proof step ran from
`13:51:36Z` to `13:51:37Z` and exited 1. Its only check record was
Deploy-provider / Deploy-SA `AUTH_SUCCESS` expected, `FAIL` actual.

| Check | Observed | Proof status |
| --- | --- | --- |
| A Deploy provider -> Deploy SA | FAIL | NOT PROVEN in this run |
| B same Deploy-provider STS token -> E2E SA | NOT RUN | NOT PROVEN |
| C dedicated E2E provider -> E2E SA | SKIPPED | NOT PROVEN |

`preflight`, `candidate`, `candidate-e2e`, `verify-candidate` and `production`
were all skipped. Before/after Build lists, Run revision/traffic, image inventory,
secret version metadata, provider settings and both SA IAM policies matched;
Terraform remained 35 / No changes. No secret payload read or delivery operation
ran. Historical CD-B2 proof remains historical evidence, not a PASS for this run.

R1 re-read the run, attempt-1 jobs and sanitized logs on 2026-09-18. The old
source appends A's record **after** `context()` returns: P0 passed. It marks A
PASS only after impersonation returns. Thus the failure is **UNKNOWN within
P1-P4**; P5 was not reached. Auth audit-log lookup for
`2026-09-17T13:51:28Z` through `13:52:00Z` returned zero STS/IAM Credentials
entries. **Audit log absence is not call absence**, and timing does not establish
root cause. No runtime rerun or new dispatch was performed in R1.

Official-contract comparison against that exact source:

| Phase | Contract and source comparison | Diagnosis |
| --- | --- | --- |
| P0 context | [Dispatch SHA/ref](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch) and [workflow ref/SHA variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) match the main/exact-source checks. | Passed, from A-record ordering. |
| P1 OIDC request | [GitHub's endpoint and bearer variables](https://docs.github.com/en/actions/reference/security/oidc#methods-for-requesting-the-oidc-token) are used with a URL-encoded custom audience. The hostname/path guard is an additional local restriction, not a documented guarantee about every runner URL. | Actual URL/response unavailable; no proven mismatch. Do not relax the guard speculatively. |
| P2 response/claims | [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc) are compared with repository, caller, source and run identity; C additionally validates reusable-workflow identity. | Actual claims unavailable; no proven mismatch. |
| P3 STS | [Google token exchange](https://docs.cloud.google.com/iam/docs/reference/sts/rest/v1/TopLevel/token): provider resource audience, JSON camelCase request fields, JWT subject type, cloud-platform scope, no Authorization header; response snake_case fields and Bearer type. Source agrees with these requirements. | Request completion/response unknown. |
| P4 SA token | [generateAccessToken](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken): `projects/-/serviceAccounts/{email}`, scope array, `600s`, `accessToken` and `expireTime`. [WIF trust and impersonation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) use conditions and attribute principalSet WorkloadIdentityUser grants. | Source contract checked; actual response unknown. |
| P5 negative B | Same STS token; only IAM HTTP 403, error code 403 and PERMISSION_DENIED pass. | Not reached. |

**Root cause: NOT PROVEN.** The proven source issue is insufficient diagnostics;
R1 changes diagnostics only, not authentication requests or trust policy.

R1 allows only `phase`, fixed `failureCode`, `providerRole`, `targetSA`, `expected`
and PASS/FAIL result in check output. The `wifProof` envelope remains PASS/FAIL.
Context identity is still validated internally, but source SHA/run ID/attempt are
obtained from GitHub run metadata instead of emitted by this script.

| Phase | Fixed failure code |
| --- | --- |
| P0 | `CONTEXT_PRECHECK_FAILED` |
| P1 | `OIDC_REQUEST_FAILED` |
| P2 response decoding/shape | `OIDC_RESPONSE_INVALID` |
| P2 claims comparison | `OIDC_CLAIMS_MISMATCH` |
| P3 | `STS_EXCHANGE_FAILED` |
| P4 Deploy | `DEPLOY_IMPERSONATION_FAILED` |
| P4 E2E | `POSITIVE_E2E_IMPERSONATION_FAILED` |
| P5 | `NEGATIVE_DENIAL_MISMATCH` |

Network/request errors and non-200 OIDC responses use P1; malformed bounded
JSON/JWT uses P2. STS and IAM response/transport failures remain in their own
phase. Codes identify the failing operation, not its underlying cause; B's code
does not turn unrelated failures into an expected denial. All failures still
exit nonzero, blocking C. No exceptions, response bodies, URLs/query data or
tokens are serialized. Offline injection tests cover each code and output sink.

R1 validation on 2026-09-18: all **59 Python controller tests** and **24 offline
E2E contract tests** passed with Node 24; actionlint **1.7.12** passed for CI/CD/
reusable workflows. `git diff --check` and the changed-file credential/token
literal scan passed. Workflow YAML and Terraform `.tf` files are unchanged.

At R1 handoff: provider activation **COMPLETE**; WIF proof **OPEN**; Must 3
**In progress**; Must 4 **Open**; production CD **inactive**. R1 source subsequently
passed its separate Fresh Result Audit and merged as PR #101. R1 itself authorized
no rerun; the separately authorized R2 observation follows.

## CD-C2D-R2 runtime evidence and R3 P1 diagnostics

R3 re-acquired [run 35313988444](https://github.com/tyosu131/Workout-Journal/actions/runs/35313988444)
and attempt-1 jobs/logs read-only on 2026-09-18. Identity: `workflow_dispatch`,
`main`, SHA `53123894391637393ad4581ded5847611c6ae11e`, attempt **1**, created
`2026-09-18T06:13:47Z`, conclusion **failure**. PR #101 is MERGED at that SHA.
Exact-SHA checkout succeeded; `Deploy control then expected E2E impersonation denial`
failed with exit 1. Its safe JSON contains `wifProof=FAIL` and one A record:
`phase=P1`, `failureCode=OIDC_REQUEST_FAILED`, `providerRole=deploy`,
`targetSA=workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com`,
`expected=AUTH_SUCCESS`, `result=FAIL`. B was **NOT RUN / NOT PROVEN**;
`wif-positive` (C) and all release jobs were **SKIPPED**. C is **NOT PROVEN**.

Evidence resolution improved from the old run's **UNKNOWN P1-P4** to **P1**.
**P1 internal root cause: NOT PROVEN.** The old checkpoint covers endpoint parsing/
validation, request-token validation, request/transport exceptions, and parseable
non-200 HTTP responses. Neither actual request transmission nor any one of these
four candidates is proven. P0 passed; P2 completion, STS and impersonation were not
reached. No URL, token, response body or exception was retained as evidence.

Official-contract comparison (2026-09-18):

| Boundary | Official source and current implementation | Classification / significance |
| --- | --- | --- |
| Permissions | GitHub permits [job-level `id-token: write`](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token). [Permission calculation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#how-permissions-are-calculated-for-a-workflow-job) applies workflow settings before job settings. Actual `wif-control-negative` has `contents: read` and `id-token: write` over workflow `permissions: {}`. | **NO ISSUE** found in YAML; the empty workflow default does not negate this job override. No permission defect proven by R2. |
| Endpoint / audience | [Manual retrieval](https://docs.github.com/en/actions/reference/security/oidc#methods-for-requesting-the-oidc-token) uses the runner URL and an audience query. Our client parses that URL, replaces audience and URL-encodes the query; the [official toolkit](https://github.com/actions/toolkit/blob/main/packages/core/src/oidc-utils.ts) appends an encoded audience. Our host/path/port/userinfo/fragment guard and query normalization are additional local restrictions. | **POSSIBLE CAUSE**, not a proven endpoint mismatch: the documented contract does not guarantee this exact URL shape, and R2 does not expose it. Guard and URL construction are unchanged. |
| Request credential | Manual retrieval uses the runner request token as a bearer credential. Our regex/type/length check is stricter than the toolkit's presence check. | **POSSIBLE CAUSE**, not proven: R2 does not identify validation failure. Token validation and bearer handling are unchanged. |
| Method / headers / response | Manual curl retrieval is GET with Authorization; toolkit `getJson` reads the `value` field. Our GET has no body, uses Bearer authorization and `Accept: application/json`, then requires 200 plus a dictionary with a valid JWT in `value`. The manual example specifies no additional required header. | **NO ISSUE** established for GET/bearer/JSON retrieval. A parseable HTTP rejection remains a **POSSIBLE CAUSE**; its status and body are unknown. Invalid body/JWT remains P2. |
| Transport policy | Our client disables proxies, redirects and retries. The [toolkit HTTP client](https://github.com/actions/http-client/blob/main/index.ts) supports proxy routing and redirects; the OIDC toolkit enables retries. Those implementation choices are not mandatory manual-retrieval requirements. | **POSSIBLE CAUSE** only if runtime transport evidence supports it. No transport dependency is proven. Existing fail-closed policy is unchanged. |

There is **no PROVEN ROOT CAUSE** or source-only evidence requiring an
authentication/workflow change. R3 refines observability only. It replaces the
historical `OIDC_REQUEST_FAILED` code (retained above for R2 traceability) with
four fixed codes, all still in phase **P1**:

| Subphase | Fixed code | Exact boundary |
| --- | --- | --- |
| P1-A | `OIDC_ENDPOINT_VALIDATION_FAILED` | URL parsing/guard and audience URL construction, before request-token validation |
| P1-B | `OIDC_REQUEST_TOKEN_VALIDATION_FAILED` | Request-token validation, before any HTTP request |
| P1-C | `OIDC_TRANSPORT_FAILED` | Request construction/open/read exceptions other than the existing `InvalidResponse` parser gate; does not by itself prove network transmission |
| P1-D | `OIDC_HTTP_STATUS_FAILED` | Parsed dictionary response with status other than 200 |

The first failing operation owns the code; the old broad P1 code is no longer
emitted. Invalid/oversized/non-dictionary bodies keep **P2 / OIDC_RESPONSE_INVALID**
before the status check, including non-200 bodies. A refused redirect is not
followed: its parseable HTTP response maps to P1-D, invalid body to P2, and a
transport exception to P1-C. Invalid/missing JWT and claims mismatch retain their
separate P2 codes. P3/P4/P5, identities, audience/claims, STS payload, B's same-token
403 + PERMISSION_DENIED oracle, C dependency and release isolation are unchanged.
Only existing allowlisted fields and fixed codes are public. Raw status metadata
is unnecessary for this four-way decision and is not added; URLs/query, credentials,
headers, request/response bodies and exceptions stay private.

R3 validation: baseline **59 Python tests** passed; refined suite **67 passed**,
**24 offline E2E tests** passed using Node **24.18.0**, actionlint **1.7.12** passed
for CI/CD/reusable YAML, and `git diff --check` passed. Marker injection covers
stdout/stderr/step summary; real JSON-client tests use mocked transport, never OIDC.
Five in-memory wrong implementations were all detected: endpoint/transport merge,
request-token/transport merge, HTTP rejection moved to P2, raw exception output,
and raw response output. No mutation experiment changed repository files.

The R3 implementation session performed **no runtime mutation**, dispatch, rerun,
commit, push or PR creation.
Workflow YAML and Terraform source are unchanged. Provider activation remains
**COMPLETE** (existing record, not reverified by R3), `CD_C1_ACTIVATION`
**UNCONFIGURED** (last read-back R2), WIF proof **OPEN**, A **FAIL**, B/C **NOT PROVEN**,
Must 3 **In progress**, Must 4 **Open**, production CD **inactive**.
At implementation handoff R3 was **READY FOR FRESH RESULT AUDIT**. The subsequent
Fresh Result Audit / Pre-PR pass on 2026-09-18 re-acquired the runtime evidence,
reviewed the actual diff and official contracts, and reproduced **59 baseline /
67 current Python tests**, **24 offline E2E tests**, actionlint **1.7.12** and
`git diff --check`. All five required wrong-implementation categories were detected
in seven in-memory variants, including exception output to stdout, stderr and
summary. Authentication AST equivalence was independently checked. The standard
PATH Node has a missing local shared library; repository-compatible Node **24.18.0**
reproduced validation, so this is not a source blocker.

First Pass: **Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**.
No code remediation was required; only audit-state documentation was advanced
after First Pass. Pre-PR permits commit/push/PR and required CI verification.
No new runtime proof or infrastructure/settings mutation was performed by this audit.
These diagnostics improve evidence resolution for a separately authorized next
single runtime proof after merge; they do not establish an OIDC fix, close WIF
proof or authorize execution.

## CD-C2D-R4 runtime evidence and R5 endpoint diagnostics

Historical R4/R5 record: the policy and diagnostic tables in this section describe
that source version. R6 localized the failure and R7 changes the path rule below.

PR #102 merged at `fc57e92323bd08290f3cbbd8c4b1ba8e74d161a8` on
2026-09-18. Required main-push [CI 35317453412](https://github.com/tyosu131/Workout-Journal/actions/runs/35317453412)
succeeded. R4 dispatched `mode=wif-proof` exactly once, with no rerun.
R5 freshly re-read [run 35318084987](https://github.com/tyosu131/Workout-Journal/actions/runs/35318084987),
attempt-1 jobs and safe logs on 2026-09-18:

- Workflow `.github/workflows/cd.yml`, event `workflow_dispatch`, branch `main`,
  SHA `fc57e92323bd08290f3cbbd8c4b1ba8e74d161a8`, attempt **1**, created
  `2026-09-18T07:09:21Z`, conclusion **failure**.
- [Job 105514115657](https://github.com/tyosu131/Workout-Journal/actions/runs/35318084987/job/105514115657)
  completed checkout successfully; step 3, `Deploy control then expected E2E
  impersonation denial`, failed with exit 1. Its safe JSON has `wifProof=FAIL`
  and only A: `phase=P1`, `failureCode=OIDC_ENDPOINT_VALIDATION_FAILED`,
  `providerRole=deploy`, the fixed Deploy `targetSA`, `expected=AUTH_SUCCESS`,
  `result=FAIL`. B **NOT RUN / NOT PROVEN**; C **SKIPPED / NOT PROVEN**;
  all release jobs **SKIPPED**.
- **Proven:** local endpoint processing failed before request-token validation
  or an OIDC HTTP request. **Not proven:** the specific endpoint condition,
  actual URL properties, why the runner supplied them, or a defect in the guard.
  **ROOT_CAUSE_NOT_PROVEN.** No sensitive endpoint value is retained in this record.

Evidence resolution: `35229757740` **UNKNOWN P1-P4** -> `35313988444`
**P1 / OIDC_REQUEST_FAILED** -> `35318084987`
**P1 / OIDC_ENDPOINT_VALIDATION_FAILED**. The last code is historical R4 evidence;
R5 replaces it in source with the fixed codes below, without a new runtime proof.

### Official contract and unchanged repository policy

[GitHub's OIDC reference](https://docs.github.com/en/actions/reference/security/oidc#methods-for-requesting-the-oidc-token)
documents runner-provided `ACTIONS_ID_TOKEN_REQUEST_URL`, the bearer request token
`ACTIONS_ID_TOKEN_REQUEST_TOKEN`, and custom audience addition.
[`id-token: write`](https://docs.github.com/en/actions/reference/security/oidc#workflow-permissions-for-the-requesting-the-oidc-token)
is required to request the JWT; both proof jobs already grant it.
The [Toolkit OIDC source at 193fa46](https://github.com/actions/toolkit/blob/193fa46c20fde8b0ed54194bc08b841c78c0776d/packages/core/src/oidc-utils.ts)
checks URL/token presence, appends the encoded audience to the supplied URL,
uses a bearer-authenticated JSON GET and reads response `value`.
The [HTTP client at 602cbaf](https://github.com/actions/http-client/blob/602cbafdf5b9de6e5a68995f6d8ccf4f318c5fde/index.ts)
parses the URL and selects host, port, pathname and search; its
[Bearer handler](https://github.com/actions/http-client/blob/602cbafdf5b9de6e5a68995f6d8ccf4f318c5fde/auth.ts)
sets the request Authorization header. These are reviewed source snapshots,
not evidence of R4's actual endpoint value.

| Component | Documented / Toolkit behavior | Workout-Journal policy, unchanged |
| --- | --- | --- |
| Scheme | OIDC helper consumes the supplied URL; HTTP client selects transport by scheme. | Explicit HTTPS-only guard. |
| Hostname | No fixed hostname suffix contract in the reviewed OIDC documentation/helper. Client uses parsed hostname. | Host must exist and end with `.actions.githubusercontent.com`. |
| Port | Client uses parsed port or transport default; no OIDC-specific port allowlist. | Only absent port or numeric 443. |
| Userinfo | No OIDC-helper rejection of URL userinfo; bearer handler supplies authentication. | Both parsed username and password must be falsey. |
| Fragment | No OIDC-helper fragment guard; HTTP request path uses pathname plus search. | Parsed fragment must be falsey. |
| Path | No documented `/idtoken` suffix guarantee or OIDC-helper suffix guard. | Path must end with `/idtoken`. |
| Query / audience | Docs show audience addition; Toolkit appends an encoded audience. | Existing `parse_qsl` defaults, removal of decoded `audience` keys, one provider audience appended, `urlencode` and `urlunsplit`. |

These explicit guard predicates and the query reconstruction algorithm are
repository-specific defense in depth / implementation choices, not the documented
GitHub endpoint contract. Their narrower assumptions are a **compatibility risk /
possible cause** only. Neither Toolkit's lack of those guards nor R4's broad code
proves which rule failed. **No proven defect or policy change is established.**

### Sequential endpoint diagnostics

On actual R4/main source, one checkpoint covered environment lookup, `urlsplit`,
the short-circuited scheme/hostname/suffix/port/userinfo/fragment/path predicates,
provider audience construction, `parse_qsl`, audience replacement, `urlencode`
and `urlunsplit`. R5 records the checkpoint immediately before each operation:

| First failing boundary (all P1) | Fixed diagnostic |
| --- | --- |
| Missing/empty endpoint; already rejected by the old scheme gate | `OIDC_ENDPOINT_URL_MISSING_FAILED` |
| `urlsplit`, including malformed authority / normalization errors | `OIDC_ENDPOINT_PARSE_FAILED` |
| Scheme is not HTTPS | `OIDC_ENDPOINT_SCHEME_FAILED` |
| Host missing or not matching the existing suffix | `OIDC_ENDPOINT_HOST_FAILED` |
| Port outside policy, or invalid/out-of-range `.port` access | `OIDC_ENDPOINT_PORT_FAILED` |
| Nonempty username or password | `OIDC_ENDPOINT_USERINFO_FAILED` |
| Nonempty fragment | `OIDC_ENDPOINT_FRAGMENT_FAILED` |
| Missing/wrong path suffix | `OIDC_ENDPOINT_PATH_FAILED` |
| Existing query/audience construction, encoding or URL assembly | `OIDC_ENDPOINT_QUERY_BUILD_FAILED` |

Only the first failure is reported. The original predicate order is preserved;
port access is not moved ahead of scheme/host checks. Query/build is one boundary
because it changes the same reconstruction decision; host, port and userinfo
remain separate. The next authorized single proof can identify a fixed failing
rule/operation boundary, but will not disclose its actual value or necessarily
prove the underlying cause. No raw URL, component, port value, audience URL,
exception, response, header, token or credential is added to output. Existing
allowlisted fields and source-controlled values alone reach stdout/summary.

P1 request-token / transport / HTTP-status semantics and P2/P3/P4/P5 are unchanged,
including parser-before-status precedence, claims, request/Bearer policy, A/B's
same federated token, exact B 403 + PERMISSION_DENIED, C dependency and release
isolation. Empty userinfo/fragment/port and other previously accepted forms remain
accepted. This is diagnostic classification only, not an OIDC or guard fix.

R5 validation: **77 Python tests**, **24 offline E2E tests** with Node **24.18.0**,
actionlint **1.7.12**, and `git diff --check` passed. Each endpoint condition is
tested through both callers, with exact first-failure assertions, zero HTTP calls,
and marker checks on stdout/stderr/summary. Existing query operations are fault
injected; no test-only production branches are added. All five required wrong
implementation categories were detected in **seven in-memory variants** (host as
scheme, port as host, generic path code, raw URL, raw exception to each output
sink). Authentication AST comparison passed after removing diagnostics, inlining
the endpoint local and joining the ordered predicates; the new missing-input
check only rejects inputs that the old gate already rejected.

The R5 implementation session performed runtime mutation **NONE**, dispatch **0**,
rerun **0**, and no commit/push/PR. Workflow YAML, Terraform and application source
are unchanged. Provider
activation remains **COMPLETE** from the existing record (not reverified by R5),
`CD_C1_ACTIVATION` **UNCONFIGURED** from R4 read-back, WIF proof **OPEN**, A **FAIL**,
B/C **NOT PROVEN**, Must 3 **In progress**, Must 4 **Open**, production CD **inactive**.
The implementation handoff was **READY FOR FRESH RESULT AUDIT** with a PASS self-check.

The separate **R5 Fresh Result Audit / Pre-PR passed on 2026-09-18**. First Pass
re-acquired R4 run/jobs/safe logs and the current main SHA, inspected the complete
nine-file working diff, rechecked official OIDC/Toolkit sources, and reproduced
**77 Python tests / 24 offline E2E tests / actionlint 1.7.12 / diff check PASS**.
Node **24.18.0** meets the repository's `>=24 <25` requirement and reproduced the
checks despite the existing default-PATH Node shared-library failure.

Independent AST comparison confirmed identical ordered endpoint predicates and
query construction, identical request-token-through-claims statements, and
unchanged remaining authentication functions. A separate **28-case caller matrix**
verified all nine codes, first-failure ownership, all output sinks and zero HTTP
requests. A synthetic surrogate query also reached the real `urlencode` failure
boundary and safely produced QUERY_BUILD without patching URL operations; this
is offline classification evidence, not evidence of R4's actual input. The seven
required-category in-memory mutants were detected again, as were **nine additional
premature-HTTP mutants**, one for each endpoint checkpoint.

First Pass closed with **Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**.
No code/docs/staging changes occurred before closure; no code remediation was
needed. Only audit-state documentation was updated afterward and rechecked for
Pre-PR. Commit/push/PR and required CI verification may proceed under this gate;
no runtime dispatch, rerun, cloud operation or settings mutation was performed.
`CD_C1_ACTIVATION` was freshly rechecked **UNCONFIGURED**. Historical R4 remains
**OIDC_ENDPOINT_VALIDATION_FAILED**, never reclassified into an R5 subcode.
Any endpoint policy fix or next single runtime proof remains a separate phase
and Human Gate after reviewed source is merged. Root cause is still NOT PROVEN;
WIF proof, Must 3/4 and production CD status above remain unchanged.

## CD-C2D-R6 runtime evidence and R7 opaque endpoint path

Historical [R6 run 35323990499](https://github.com/tyosu131/Workout-Journal/actions/runs/35323990499)
used post-PR-103 main `fdc017ba4e7e2756fefde9c6ac2b8cd1379e2fab`, after required
[CI 35323409365](https://github.com/tyosu131/Workout-Journal/actions/runs/35323409365)
succeeded. Identity: `.github/workflows/cd.yml`, `workflow_dispatch`, `main`,
`mode=wif-proof`, attempt **1**, created `2026-09-18T08:21:50Z`, conclusion
**failure**. R6 dispatched exactly once, with no rerun or second dispatch.
Checkout succeeded; `Deploy control then expected E2E impersonation denial`
failed with exit **1**. Its allowlisted evidence was A **FAIL**, phase **P1**,
diagnostic **`OIDC_ENDPOINT_PATH_FAILED`**. B was **NOT RUN / NOT PROVEN**;
C and every release job were **SKIPPED**. Artifacts: **0**.

**Failure rule: PROVEN.** The tested source required
`parts.path.endswith('/idtoken')`; the runner-provided endpoint failed that
predicate after presence, parsing, scheme, host, port, userinfo and fragment
checks passed. Query construction, request-token validation and the OIDC HTTP
request were not reached. No endpoint/component, credential, raw response or
exception value was retained. R6 localized the rule without changing it; its
historical diagnostic remains unchanged by R7.

R7 rechecked [GitHub's current OIDC reference](https://docs.github.com/en/actions/reference/security/oidc#methods-for-requesting-the-oidc-token)
and [Actions Toolkit OIDC source](https://github.com/actions/toolkit/blob/main/packages/core/src/oidc-utils.ts)
on 2026-09-18. GitHub requires `id-token: write` and documents the runner-provided
URL, bearer request token and optional custom audience. The Toolkit checks URL
presence, appends an encoded audience, requests JSON by GET and reads `value`.
Neither reference requires a fixed `/idtoken` suffix. Combined with R6, this
establishes the source defect: **the repository required an undocumented path
suffix incompatible with its runner-provided endpoint**. This does not prove a
malformed GitHub URL, a GitHub contract change or successful downstream auth.

R7 removes only that path requirement and its checkpoint. The unused
`OIDC_ENDPOINT_PATH_FAILED` entry is removed from current `FAILURE_PHASES`;
it remains historical R6 evidence here, not a reachable current diagnostic.
The runner path is opaque and is neither replaced nor normalized by audience
rebuilding. URL presence/parsing, HTTPS, the existing hostname suffix rule,
absent-or-443 port, userinfo and fragment predicates remain in the same order.
Query behavior is unchanged: existing `parse_qsl` defaults (including dropping
blank values), non-audience pairs retained in order, decoded audience keys
removed, and exactly one provider audience appended with `urlencode`.
Only the query is replaced in the parsed URL.

Request-token validation, Bearer handling, GET/response/claims checks, STS,
service accounts, A/B's same STS token and strict HTTP 403 + error code 403 +
PERMISSION_DENIED oracle, C dependency and release isolation are unchanged.
The remaining endpoint codes and P1-P5 diagnostics keep their existing meanings.
No URL/path/query or credential data is added to any output sink.

R7 self-check: **79 Python tests**, **24 offline E2E tests** with Node **24.18.0**,
actionlint **1.7.12**, and `git diff --check` passed. Three regression tests failed
against the old path guard before remediation. Both providers accept synthetic
non-fixed paths; real Request objects with mocked transport preserve path bytes,
query pairs and one audience. Existing endpoint rejection tests still assert
zero HTTP calls. All six required wrong-remediation categories were detected in
**14 in-memory variants**, including URL/path/query leaks to each of stdout,
stderr and summary. AST comparison against the R6 SHA confirms the only changes
are the path requirement, its checkpoint and its diagnostic-map entry removal.

R7 implementation handoff was **READY FOR FRESH RESULT AUDIT**; that session
performed no commit, push or PR creation.
Workflow YAML, Terraform and application source are unchanged. Runtime mutation
**NONE**, dispatch **0**, rerun **0**. WIF proof remains **OPEN**, A **FAIL** from
R6, B/C **NOT PROVEN**, Must 3 **In progress**, Must 4 **Open**, production CD
**inactive**. Provider activation **COMPLETE** is the existing record, not a new
cloud check; `CD_C1_ACTIVATION` remains **UNCONFIGURED** from R6 read-back.
Offline success is not runtime proof. Fresh review, merge, post-merge CI and a
separate Human Gate are required before another WIF proof.

The separate **R7 Fresh Result Audit / Pre-PR passed on 2026-09-18**. Before any
code/docs/staging change, First Pass re-acquired R6 run/attempt-1 jobs/safe logs
and the exact tested source from GitHub, reviewed the full nine-file working
diff and current official OIDC/Toolkit sources, and independently reproduced
**79 Python tests / 24 offline E2E tests / actionlint 1.7.12 / diff check PASS**.
The three new regressions failed against R6 source and passed against R7 in memory.
Whole-module AST comparison confirmed only the path predicate, checkpoint and
diagnostic-map entry removal. All **six categories / 14 independently constructed
AST mutants** were detected, including URL/path/query leakage to each output
sink. A separate **16-case real Request matrix** verified opaque paths, query,
audience and Bearer preservation; five origin/security rejection cases stopped
before HTTP. All inputs were synthetic; transport was mocked.

First Pass closed with **Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**.
No code remediation was needed. Only audit-state docs changed after closure and
were rechecked for Pre-PR. Commit/push/PR and required CI verification may proceed;
merge and the next WIF proof remain separate Human Gates. Audit runtime mutation
is **NONE**; workflow YAML, Terraform and application source are unchanged.
`CD_C1_ACTIVATION` was freshly rechecked **UNCONFIGURED**. R6 remains historical
A **FAIL / OIDC_ENDPOINT_PATH_FAILED**, B/C **NOT PROVEN**, WIF proof **OPEN**,
Must 3 **In progress**, Must 4 **Open**, production CD **inactive**.

## Identity and credential ownership

| Identity | Current permissions and responsibility |
| --- | --- |
| Existing Deploy SA | Existing service-level Developer grants preserved; C3U added the project custom role containing only `run.operations.get`; no privileged Supabase payload access |
| Existing Build SA | Existing dedicated Cloud Build execution grants unchanged |
| Provisioned `workout-journal-e2e` | Only `secretAccessor` on `workout-journal-e2e-supabase-secret-key` |

The E2E SA has no project-level IAM grant, Build/Run/Artifact Registry/Storage role,
Service Account User, Token Creator, JWT secret access, Backend Supabase secret
access, key or Editor/Owner role. Terraform owns metadata, never a secret version
or payload. CD-C2B separately populated version 1; subsequent rotation requires
another Human Gate. Do not duplicate this key into GitHub secrets or use the Backend key instead.

The dedicated Supabase logical credential `candidate-e2e` separates identity,
lifecycle, rotation and auditability from Backend and Deploy-SA usage. A separate
`sb_secret` **does not reduce Supabase DB authorization scope**: it is still a
privileged project credential. Exact-run ownership and exact-UUID cleanup guards
remain necessary; this is not an RLS-scoped testing account.

## Same-pool trust boundary

The new provider `workout-journal-e2e` reuses pool `github-actions`, but an IAM
principal is pool-scoped, not provider-scoped. Its impersonation member uses only
`attribute.e2e_boundary/candidate-e2e-v1`, minted only by this provider. The existing
Deploy provider does not map that attribute. The new provider does not map
`attribute.repository_id`, which selects the existing Deploy-SA grant, and uses a
distinct `candidate-e2e:` subject namespace.

All assertions must match:

- owner ID `95160728`, repository ID `790375516`;
- owner `tyosu131`, repository `tyosu131/Workout-Journal`;
- `ref = refs/heads/main`;
- caller `workflow_ref = tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main`;
- called `job_workflow_ref = tyosu131/Workout-Journal/.github/workflows/candidate-e2e.yml@refs/heads/main`.

Ordinary GitHub claims describe the caller; `job_workflow_ref` identifies the
reusable workflow. The default provider-specific audience is preserved. A token
accepted through the Deploy provider cannot gain the E2E mapped attribute merely
by sharing a pool/repository. No pool-wide or repository-wide E2E grant is added.
The provider is now `ACTIVE / disabled = false` after CD-C2C activation;
mapping, condition, pool and IAM remain unchanged.

This is mapped-principal isolation, not a claim that arbitrarily modified
trusted-main code could never request credentials through another provider.
The existing Deploy provider's caller trust is unchanged; all code that can run
inside `cd.yml`, including the reusable workflow, remains security-sensitive.
Provider mapping/grant changes require renewed cross-provider review. Runtime
positive/negative federation proof is **CLOSED / PASS** for the exact
[R8 run/source](#cd-c2d-r8-runtime-proof-and-r9-closure), within the A/B/C scope above.

Primary contracts: [GitHub reusable-workflow OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows),
[Google mappings and conditions](https://docs.cloud.google.com/iam/docs/reference/rest/v1/projects.locations.workloadIdentityPools.providers),
and [Google pool-collision guidance](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation).
Google generally recommends separate pools to avoid subject collisions; this
Task's preferred same-pool design explicitly separates subjects and grant attributes.

## Activation and source authority

C4B source implements `workflow_run` for `CI`, `completed`, branch `main`, while
preserving both manual dispatch inputs. **Automatic runtime is PROVEN through
production and post-deploy verification** in run `35573153822`. C4C's nested
Playwright metadata remediation is source/runtime PROVEN; the earlier failed
run `35557989507` remains Historical evidence.

| Entry | Normalized mode | Release-start authority / E2E version |
| --- | --- | --- |
| `workflow_dispatch`, input `wif-proof` (default) | `manual-wif-proof` | Isolated A/B/C authentication proof; no release or secret consumption |
| `workflow_dispatch`, input `release` | `manual-release` | `CD_C1_ACTIVATION == approved` plus Human-supplied exact positive numeric secret version |
| Qualified `workflow_run` | `automatic-release` | Protected main + exact successful required CI; reviewed secret-version metadata **`1`**, without activation |

`CD_C1_ACTIVATION` remains **UNCONFIGURED** from C3W runtime read-back. It gates
manual release only; it is not a global automatic-release kill switch or production
approval. No variable, provider, IAM or Terraform change is part of C4B. Existing
WIF conditions constrain repository/main/workflow identities without an event-name
condition; run `35557989507` proves actual automatic Deploy and E2E OIDC/WIF compatibility.

The runner's `GITHUB_EVENT_PATH` is parsed with strict object/type/duplicate-key
checks. Automatic qualification requires exact repository `tyosu131/Workout-Journal`,
repository ID `790375516`, owner ID `95160728`, top-level webhook `action=completed`,
CI name `CI`, workflow ID `286209592`, path `.github/workflows/ci.yml`, upstream
`push`, `main`, completed/success and same head repository. SHA must be 40 lowercase
hex characters; run ID and attempt must be positive integers. Failed, cancelled,
skipped, PR, feature-branch and foreign-workflow completions cannot start release.

Preflight independently reads the fixed GitHub repository API, never payload URLs.
Payload and REST run identity/attempt/source must agree. It queries the
attempt-specific jobs endpoint and requires the sole `Lint, build, and test baseline`
job to be completed/success at the same SHA/run/attempt. Automatic CI ID/attempt
come only from the triggering run. Manual release discovers CI once; all later
checks use those fixed pins and reject attempt changes without selecting another CI.

For automatic release, **S = triggering CI `head_sha` = REST CI SHA = current remote
main = `GITHUB_SHA` = `GITHUB_WORKFLOW_SHA`**. Preflight checks out the trusted CD
workflow SHA and verifies this equality. Candidate, verify and production check out
`preflight.source_sha`; reusable E2E receives the same explicit source and authority
outputs. Its job guard requires the exact `cd.yml@refs/heads/main` caller. Before
Google authentication, `candidate_e2e.py preflight` binds actual event, mode,
manifest/hash and fixed CI pins, and checks current remote main without cloud
credentials. The secret-consuming entrypoint repeats these checks. No job
substitutes a newer main or an arbitrary source input. Before Build and promotion,
current-main equality is checked again. A main advance during candidate creation or
approval wait stops promotion; it does not refresh the manifest or source.

The valid concurrency group remains `workout-journal-production-delivery` with
`cancel-in-progress: false`. Obviously unqualified completions use their own CD run
ID group, so they cannot replace valid pending delivery. GitHub retains at most one
running and one pending member; a newer eligible pending run may replace the old
pending run. This is **not FIFO or exactly-once**, and does not cancel an active
release. TTL is checked by the controller when it runs, not by automatically expiring
a waiting Environment approval. Repeated successful CI attempts are not a deduplication
guarantee; stale source and changed attempts fail closed.

Production still has exactly `environment: production`. Automatic Build, 0% paired
candidates, E2E and verify can precede Human approval, but production traffic writes
cannot. TTL, captured-production comparison, manifest/configuration hashes, tag and
revision identity, CAS, Backend-then-Frontend promotion and Frontend-then-Backend
rollback retain their existing contracts. No artifact/cache handoff is introduced.

All Actions in the CI trust root and privileged delivery jobs are immutable-SHA
pinned, and checkout does not persist credentials. CI explicitly has only
`contents: read`. Delivery default permissions are empty;
`id-token: write` is limited to Google-authenticated jobs; only CI inspection jobs
receive `actions: read`. E2E is a same-repository, same-commit reusable call.

## Isolated WIF proof contract (R8 CLOSED / PASS)

`mode=wif-proof` does not need a manifest, secret version or activation variable.
It has exactly this dependency chain, with no production Environment:

| Check | Provider / target | Required outcome |
| --- | --- | --- |
| A control | Deploy provider `workout-journal` / Deploy SA | STS federation and SA access-token generation succeed |
| B isolation | The **same A federated token** / E2E SA | IAM Credentials HTTP 403, error code 403 and `PERMISSION_DENIED` |
| C positive | E2E provider `workout-journal-e2e` / E2E SA | Federation and SA access-token generation succeed inside `candidate-e2e.yml` |

A/B run in `wif-control-negative`; only its success permits `wif-positive`, which
calls the existing reusable workflow with normalized `mode=manual-wif-proof`. B does not reuse the
impersonated Deploy-SA token. Unexpected success, disabled-provider failure,
STS failure, network error, malformed response, or any other IAM status fails
closed and prevents C. Only A+B+C PASS proves this run; a standalone B denial
does not establish that the E2E account exists or that its provider works.

The stdlib-only `e2e_wif_proof.py` checks repository/main/caller/source/run identity
before requesting GitHub OIDC. C additionally checks signed-token reusable-workflow
ref/SHA consistency; STS performs signature/trust validation. HTTPS uses the GitHub
runner OIDC endpoint, fixed STS endpoint and exact two IAM Credentials targets.
No redirects, proxies, retries, SDK logging or credential files are used. Tokens
stay in memory, requested SA lifetime is 600 seconds, and minted SA tokens are
discarded without resource access. Output and step summary contain only phase,
fixed failure code on failure, provider role, target SA, expected outcome and PASS/FAIL.
Raw auth responses and exceptions never reach logs or evidence.

Every release job is mode-guarded and depends on the release preflight chain.
The reusable workflow has separate proof and release jobs; its release job still
requires qualified caller authority, exact source, CI ID/attempt, secret version,
manifest and hash. Manual release additionally requires activation; automatic
release revalidates the allowlisted workflow_run authority. Existing exact secret
read, private stdin, scenario and cleanup remain unchanged. Proof performs **no Secret
Manager access, E2E/Playwright, Cloud Build, Cloud Run or production operation**.
The shared concurrency group also serializes proof runs behind an outstanding
release/approval wait, subject to the non-FIFO pending behavior described above.

API contracts: [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc),
[STS token exchange](https://docs.cloud.google.com/iam/docs/reference/sts/rest/v1/TopLevel/token)
and [IAM access-token generation](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken).
Offline tests mock all authentication endpoints. Actual A/B/C proof is
**CLOSED / PASS** under [R8 evidence](#cd-c2d-r8-runtime-proof-and-r9-closure).

## Dynamic candidate provenance

The release path builds a v2 manifest from Build and Cloud Run read-back, binding:

- repository, source/workflow SHA and caller; `run.id`/`run.attempt` identify CD,
  `run.ciRunId`/new required `run.ciRunAttempt` identify the fixed CI authority;
- `run.event` is explicitly `workflow_dispatch` or `workflow_run`; `run.workflowSha`
  is the actual CD workflow SHA and equals `sourceSha`, which also equals `build.sourceSha`;
- manifest `version: 2` is retained; old expired manifests lacking CI attempt cannot
  authorize a new release;
- `e2eIdentityVersion: 2` for the new deterministic recovery contract (absent in historical C3A);
- actual Build ID, SUCCESS, dedicated Build SA and both immutable digests;
- never-reused `CANDIDATE_ID = CANDIDATE_TAG = cd-<run-id>-<attempt>` (at most 22 characters; longer IDs stop before Build);
- candidate revision/tag/exact URL, 0% traffic and runtime configuration hashes;
- captured 100% production pair, configuration hashes, Backend tagged target and all retained traffic entries;
- approved Supabase project `krpnnkcipyeasddzbpma` and dedicated E2E secret's exact numeric version;
- capture timestamp and non-extendable 60-minute TTL.

Only sanitized metadata and its SHA-256 travel through job outputs. The manifest
must match this run and exact hash; E2E success returns that hash. Deploy SA
re-reads the pair after E2E and after Environment approval. Expiry/mismatch stops
the run; no automatic manifest refresh or retry.

Tagged URLs are read back verbatim, not reconstructed by parsing Cloud Run's
opaque service identifier. Both hash-based and deterministic `run.app` origins
are accepted only as exact manifest/read-back targets; tag prefix and DNS label
length are checked. See [Cloud Run URL contract](https://docs.cloud.google.com/run/docs/triggering/https-request#service_url).
Candidate and promotion summaries retain an allowlisted pair record: source SHA,
run/CI identity, Build ID/SA, each candidate revision/tag/URL/digest, previous
revision/digest/configuration hash and traffic, and both paired Backend URLs.
Promotion/rollback result is recorded alongside it. No credential value or
arbitrary manifest extension is included.

C3I adds [durable promotion/rollback diagnostics](./cd-c3-e2e-recovery-contract.md#c3i-source-contract-durable-promotion-diagnostics):
fixed original failure codes and operation stages, separate from the existing
top-level `RELEASE_NOT_VERIFIED`. The pair summary is unchanged. A single canonical
job-log line originally exposed eight fixed diagnostic fields, allowing incident
read-back when Checks summary/text are null. Unknown exceptions normalize to
`CD_CONTROLLER_FAILED`. This source-only change does not alter traffic behavior
or establish the unknown C3G technical root cause.

### C3K incident and C3M API failure diagnostics

Historical [C3K run `35442981748`](https://github.com/tyosu131/Workout-Journal/actions/runs/35442981748),
attempt 1, source `ba9ddf34b401355fa9ab98d87dec054ca4c8165f`, passed candidate,
E2E, PROVEN_ZERO cleanup and verify-candidate, then failed production promotion.
Its durable diagnostic was:

```json
{"failureCode":"RELEASE_NOT_VERIFIED","promotionFailureCode":"RUN_API_FAILED","promotionFailureStage":"backend-traffic-update","rollback":"HUMAN_DECISION_REQUIRED","rollbackFailureCode":"RUN_API_FAILED","rollbackFailureStage":"backend-rollback-update"}
```

Cloud Audit evidence observed Backend UpdateService and rollback UpdateService;
a Backend Ready transition was observed. Independent historical read-back found
the previous production pair restored and smoke PASS; the workflow did not reach
post-rollback verification. These observations do not identify the underlying
HTTP/transport failure. **C3K technical root cause: NOT PROVEN. C3I diagnostic
durability: runtime proven for the observed promotion and rollback failures.**
The two new C3M fields cannot be inferred retrospectively for C3K.

C3M extends the canonical safe log and step summary with two fixed-enum fields:

| Field | Allowed values / ownership |
| --- | --- |
| `runApiFailureKind` | `HTTP_STATUS`, `TIMEOUT`, `CONNECTION`, `JSON_PARSE`, `UNKNOWN` |
| `runApiFailureStage` | Caller-supplied `PATCH`, `OPERATION_GET`, or default `OTHER` for other Cloud Run calls |

`HTTPError` maps to `HTTP_STATUS`; direct or urllib-wrapped `TimeoutError` maps
to `TIMEOUT`; other `URLError` and `ConnectionError` map to `CONNECTION`;
JSON decode/encoding failure maps to `JSON_PARSE`; other wrapper exceptions map
to `UNKNOWN`. The wrapper still raises `RUN_API_FAILED`, and the promotion
controller still uses top-level `RELEASE_NOT_VERIFIED` at the existing boundary.
A successful API response containing a failed operation retains the existing
`TRAFFIC_OPERATION_FAILED` contract.

The **first Cloud Run API failure** owns the new kind/stage pair. Capture occurs
before rollback and before replacement by the generic promotion failure. If the
first API failure occurs only during rollback, that failure owns the pair;
later failures cannot overwrite it. Existing promotion and rollback code/stage
fields retain their independent meanings. Both new fields are null when promotion
observes no API failure. At C3M the safe log had ten fixed fields; pair metadata
remains exclusively in the existing summary.

Only allowlisted enum values are copied to diagnostics. No raw exception, response
body, Authorization header, token, URL, request payload or credential is copied.
Cloud Run HTTP error responses are closed without reading their bodies, preventing
resource-finalization warnings from printing the original exception. A close
failure cannot replace the original classification. Other HTTP callers retain
their existing error contract.

C3M changes no traffic, CAS, promotion/rollback ordering, retry, sleep, polling
deadline, PATCH semantics, IAM/WIF or production workflow. This is an **offline API
failure diagnostic improvement**, not a production root-cause or convergence fix.
Validation is recorded in [C3M verification](./verification.md#cd-c3m-cloud-run-api-failure-diagnostic-validation).

### C3N runtime evidence, C3O diagnosis and C3P HTTP status

Historical [C3N run `35490314562`](https://github.com/tyosu131/Workout-Journal/actions/runs/35490314562),
attempt 1, used main `5586ca9fafa7b9b42170cf261e49a9d24bdd8023` after required
[CI `35488494492`](https://github.com/tyosu131/Workout-Journal/actions/runs/35488494492)
SUCCESS. Preflight, candidate, candidate-e2e and verify-candidate passed. E2E was
8/8 PASS with HTTPS cookie verification, PROVEN_ZERO cleanup (auth/users/notes/user_tags
0/0/0/0) and a PERSISTED local receipt. Production failed with:

```json
{"failureCode":"RELEASE_NOT_VERIFIED","promotionFailureCode":"RUN_API_FAILED","promotionFailureStage":"backend-traffic-update","rollback":"HUMAN_DECISION_REQUIRED","rollbackFailureCode":"RUN_API_FAILED","rollbackFailureStage":"backend-rollback-update","runApiFailureKind":"HTTP_STATUS","runApiFailureStage":"OPERATION_GET"}
```

This runtime-proves the observed C3M HTTP failure kind/stage. The **HTTP integer
was not captured**. The shared API fields describe the first failure; they do not
independently establish rollback's HTTP kind, stage or status.

Human-confirmed production state after terminal failure: Backend
`workout-journal-backend-00003-luc` and Frontend
`workout-journal-frontend-00003-xar` each 100%; their
`workout-journal-{backend,frontend}-cd-35490314562-1` candidates each 0%.
`CD_C1_ACTIVATION` was UNCONFIGURED. C3P does not repeat or mutate that runtime state.

C3O read-only diagnosis retained **root cause PENDING_EVIDENCE**: the historical
HTTP integer and exact Operation's effective `run.operations.get` remain UNKNOWN.
UpdateService observations and service-scoped role bindings do not distinguish
403, 404, 409, 429, 5xx or other HTTP causes. Candidate deployment succeeded under
the same Deploy SA; C3O found its gcloud v1 deployment/polling paths differ from
the controller's v2 Operation GET, but did not prove an authorization failure.

C3P adds only `runApiHttpStatus` to the canonical diagnostic and step summary:

| Contract | C3P source behavior |
| --- | --- |
| Type/range | Integer 400–599 inclusive, or null; `type(value) is int` rejects bool, string and float |
| Source | Only `HTTPError.code`; no inference from stage, message or a non-HTTP exception |
| Ownership | Kind, stage and status belong to the same first API failure; rollback never overwrites them |
| Non-HTTP / no API failure | Status is null |
| Security | Close HTTPError without reading body; no reason, exception text, URL, headers, token or payload serialization |

The safe log has eleven fixed fields. All existing failure codes/stages retain
their meanings. Request URLs, PATCH/GET, headers/authentication, CAS, traffic,
promotion/rollback ordering, retry, sleep, polling/deadline, IAM/WIF and workflow
behavior are unchanged. At C3P source-validation time, **runtime was NOT YET**;
that source change alone established neither a historical HTTP status nor a
root-cause fix. Subsequent runtime evidence is below. See
[C3P offline validation](./verification.md#cd-c3p-http-status-diagnostic-validation).

### C3P runtime, C3R2 authorization proof and C3S desired state

[C3P run `35496219461`](https://github.com/tyosu131/Workout-Journal/actions/runs/35496219461),
attempt 1, used main `e922feab245546fb308621782dc7d067eb469833` after required
[CI `35495319133`](https://github.com/tyosu131/Workout-Journal/actions/runs/35495319133)
SUCCESS. Its runtime diagnostic established `RELEASE_NOT_VERIFIED`,
`RUN_API_FAILED / backend-traffic-update`, and **`HTTP_STATUS / OPERATION_GET / 403`**.
The first-failure fields do not independently establish rollback's historical
HTTP status. C3R2 instead evaluated each recovered exact Operation independently.

Principal: `workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com`.
All three resource names use
`//run.googleapis.com/projects/workout-journal-506909/locations/asia-northeast1/`.

| Resource suffix | Permission | C3R2 overall / allow / deny |
| --- | --- | --- |
| `services/workout-journal-backend` | `run.services.update` | `CAN_ACCESS / GRANTED / NOT_DENIED` |
| `operations/d07f3193-fad6-4fd7-99f9-282af19fe15c` (promotion) | `run.operations.get` | `CANNOT_ACCESS / NOT_GRANTED / NOT_DENIED` |
| `operations/109471a4-8672-491f-906d-13f60ce4e1a5` (rollback) | `run.operations.get` | `CANNOT_ACCESS / NOT_GRANTED / NOT_DENIED` |

Stable `gcloud policy-intelligence troubleshoot-policy iam` (SDK `582.0.0`)
evaluated the control at 08:05:15–08:05:17Z, promotion at 08:05:41–08:05:43Z,
and rollback at 08:05:58–08:06:00.005482Z on 2026-09-20. The service control
matched `roles/run.developer`, principal and permission. Both Operation allow
evaluations contained only the project policy: the Deploy SA matched
`roles/cloudbuild.builds.editor` and `roles/serviceusage.serviceUsageConsumer`,
neither containing the permission; `roles/owner` contained it but did not match
the principal. The service-level Developer binding was absent from the effective
Operation policy. This is an observed implementation/runtime contract mismatch,
not an inference from role contents alone.

Project Admin Activity from **2026-09-20T07:22:00Z through 08:06:01Z** contained
eight entries with no relevant IAM policy, policy binding, role or project-move
mutation. The query was not truncated. **Historical-policy continuity:
SUPPORTED**; log absence is not an absolute proof of the historical snapshot.
At C3R2, **current missing effective allow: PROVEN** and **historical incident root
cause: STRONGLY_SUPPORTED_NOT_PROVEN** were separate conclusions. The later
[C3U/C3V closure](#c3u-and-c3v-runtime-closure) supplies the targeted remediation
and successful fresh-release evidence; it does not alter this historical evaluation.

Stable evaluation covers [allow and deny](https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/troubleshoot-policy/iam).
PAB was **not evaluated**; it restricts access and cannot supply the missing allow.
Policy Troubleshooter does [not diagnose VPC-SC](https://docs.cloud.google.com/policy-intelligence/docs/troubleshoot-access).
C3R2 enabled only `policytroubleshooter.googleapis.com`, exactly once; it made no
IAM, Cloud Run or release changes. The API remains enabled outside Terraform.

C3S prepared a project custom role with only `run.operations.get` and an additive
Deploy SA project member, preserving both service-level Developer grants. See
the [design, eligibility and applied-state evidence](../infra/terraform/README.md#cd-c3s-operation-iam-applied-and-runtime-verified).
**Historical C3S source-validation snapshot: remote state 35; planned +2; apply
NOT YET; C3S runtime NOT YET.** C3U subsequently applied the fresh post-merge C3T
plan and verified authorization; C3V then completed the fresh production release.

C3R2 read-back and C3S authority retain Backend `workout-journal-backend-00003-luc`
and Frontend `workout-journal-frontend-00003-xar` at 100%, both C3P candidates at
0%, and `CD_C1_ACTIVATION` UNCONFIGURED. These are historical phase snapshots;
the current pair is recorded below.

P2B's `APPLICATION_SHA`, fixed production names/tag and v1 builder remain solely
as the historical manual proof oracle. GitHub Actions rejects v1 manifests.
CD-C1 does not use that builder's fixed SHA, Build ID, digests or pair.

## C3U and C3V runtime closure

Historical C3W checkpoint: production/activation/status statements in this section
describe that closure. The Current production and Must 4 status are in the C4D record below.

**C3 runtime chain: CLOSED. Must 4: OPEN.** This is the C3W documentation closure
of C3P → C3R2 → C3S → C3U → C3V, not a new runtime execution.

### Authority and evidence provenance

C3W started from clean `main`, with local HEAD, `origin/main` and freshly read
GitHub main all `cc608aa5f2edbd81952024d497bdc5838b796599`.
[Required CI `35507087914`](https://github.com/tyosu131/Workout-Journal/actions/runs/35507087914)
is `.github/workflows/ci.yml`, `push`, attempt 1, completed/SUCCESS at that exact SHA.
[Release `35545739898`](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898)
is `.github/workflows/cd.yml`, `workflow_dispatch`, branch `main`, attempt 1,
completed/SUCCESS at the same SHA. It was created at `2026-09-20T23:48:49Z`;
production completed at `2026-09-21T00:19:12Z`.

GitHub run/jobs/activation were freshly read at `2026-09-21T00:26:36Z`; GCP
service traffic, exact revision digests, Frontend Backend URL, API enabled state
and Build metadata were freshly read during C3W. The detailed E2E safe result,
manifest/E2E hash and production diagnostic below are the project owner's C3V
closure evidence supplied for C3W, corroborated by the fresh job conclusions and
GCP read-back. They are not represented as a new C3W log download or E2E execution.
The C3U apply/state/authorization record is retained evidence, not a C3W re-apply
or fresh Terraform plan.

| Release job | Fresh result |
| --- | --- |
| [preflight](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898/job/106171182617) | SUCCESS |
| [candidate](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898/job/106171195820) | SUCCESS |
| [candidate-e2e / e2e](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898/job/106172151503) | SUCCESS |
| [verify-candidate](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898/job/106172291548) | SUCCESS |
| [production](https://github.com/tyosu131/Workout-Journal/actions/runs/35545739898/job/106172387569) | SUCCESS |

### C3U applied IAM and authorization

The exact C3T plan (SHA-256
`b159b4ef895f9ce54434a1272e575ae45041d3084d736bae887f6a658892603a`)
was applied once under its separate Human Gate, using Terraform `1.16.0` and
Google provider `7.45.0`. It completed at `2026-09-20T23:34:57Z` with **2 added /
0 changed / 0 destroyed**. State advanced from 35 resources / serial 8 to **37 /
serial 9**, lineage `66945691-ab92-e20a-4bc1-badb121e7ab4` unchanged, GCS generation
`1789947297225011`. The post-apply plan was **0 add / 0 change / 0 destroy**, all
37 resources no-op. Three existing project IAM member `etag` refresh differences
were computed-only and no-op; no unrelated semantic drift was present.

The two added addresses are `google_project_iam_custom_role.deploy_run_operation_reader`
and `google_project_iam_member.deploy_run_operation_reader`. Runtime read-back
confirmed `projects/workout-journal-506909/roles/workoutJournalRunOperationReader`,
stage GA, not deleted, with exactly **`["run.operations.get"]`**. Its additive
project member is
`serviceAccount:workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com`.
Existing project bindings and both Backend/Frontend `roles/run.developer`
service bindings remained unchanged.

| C3U Policy Troubleshooter resource | Permission | Overall / allow / deny | Decisive binding |
| --- | --- | --- | --- |
| Backend service | `run.services.update` | CAN_ACCESS / GRANTED / NOT_DENIED | Existing service `roles/run.developer` |
| Exact promotion Operation `d07f3193-fad6-4fd7-99f9-282af19fe15c` | `run.operations.get` | CAN_ACCESS / GRANTED / NOT_DENIED | New project custom role; permission included, principal matched |
| Exact rollback Operation `109471a4-8672-491f-906d-13f60ce4e1a5` | `run.operations.get` | CAN_ACCESS / GRANTED / NOT_DENIED | New project custom role; permission included, principal matched |

Operation resource prefix is the same exact project/location recorded in C3R2.
Both Operation checks passed on the first attempt; propagation retries/wait were
0. **C3S IAM remediation runtime: PROVEN. Current authorization defect: CLOSED.**

### C3V release and current production

Cloud Build **`cebec13a-f307-43f9-95d6-3071b83dcadb`** is SUCCESS, with
`COMMIT_SHA=cc608aa5f2edbd81952024d497bdc5838b796599`, dedicated Build SA and both
immutable image results matching the live revisions. Candidate ID is
**`cd-35545739898-1`**.

| Current production | Backend | Frontend |
| --- | --- | --- |
| Revision | `workout-journal-backend-cd-35545739898-1` | `workout-journal-frontend-cd-35545739898-1` |
| Digest | `sha256:c6d003dce4352e7d9f68839635faf510a571a2266856f8c9215e336d28f7c35d` | `sha256:eae20a34275a727a9df33b4c1b4fd936bfbc8ebafb648552363b1ba82f50d516` |
| Production traffic | 100% | 100% |
| Previous production revision | `workout-journal-backend-00003-luc` | `workout-journal-frontend-00003-xar` |
| Previous pair traffic | 0% | 0% |

Read-back scope: project `workout-journal-506909`, region `asia-northeast1`,
`2026-09-21T00:30:28Z`. Frontend `BACKEND_INTERNAL_URL` equals exactly
`https://cd-35545739898-1---workout-journal-backend-cpbzb7lqza-an.a.run.app`;
the Backend tag still points to the paired Backend revision. Historical candidates
remain at 0%; no old tag or traffic was manually changed in C3W.

E2E scenario **PASS**, **8/8 PASS**: login, tag-create, note-create-save-read,
tag-use, Calendar, Analytics, tag-delete, logout. `httpsCookieVerified=true`;
cleanup `auth=0 / users=0 / notes=0 / user_tags=0`; `cleanupState=PROVEN_ZERO`,
`localReceiptState=PERSISTED`, `evidenceState=PASS`.
`CD_MANIFEST_HASH = CD_E2E_HASH = a32a07f291e31d522640ce80f62bf384d26e24d02ccd3ac1fd72a243a6ae5294`;
equality **PASS**.

Production diagnostic is **`CD-C1: PASS / post-deploy-verification`**:

```json
{"failureCode":null,"promotionFailureCode":null,"promotionFailureStage":null,"rollback":null,"rollbackFailureCode":null,"rollbackFailureStage":null,"runApiFailureKind":null,"runApiFailureStage":null,"runApiHttpStatus":null}
```

Production approval, Backend then Frontend promotion and post-deploy verification
completed successfully. **C3V had no rollback.** Fresh repository-variable GET
returned HTTP 404: `CD_C1_ACTIVATION` is **UNCONFIGURED**. C3W did not recreate it.

### Incident classification and remaining completion gap

| Incident / capability | Current conclusion and evidence limit |
| --- | --- |
| C3P numeric HTTP diagnostic | 403 / OPERATION_GET runtime PROVEN; shared API fields identify the first failure, not an independent rollback HTTP status |
| C3R2 missing effective allow | PROVEN by exact historical Operation evaluations, allow NOT_GRANTED / deny NOT_DENIED |
| C3N/C3P historical incident root cause | **STRONGLY_SUPPORTED_NOT_PROVEN:** missing effective allow for `run.operations.get` is the leading causal explanation. C3P's numeric 403 and exact Operation evaluations are stronger evidence than C3N's unrecorded HTTP integer; the later successful release does not reconstruct either incident's authorization decision |
| Earlier C3G technical root cause | **NOT PROVEN / Historical:** original technical failure provenance was lost; no claim that it had the same IAM cause |
| C3K technical root cause | **NOT PROVEN / Historical:** captured promotion/rollback failure diagnostics remain valid; later HTTP/IAM evidence is not retroactively assigned to C3K |

The Fresh Result Audit distinguishes the proven defect from historical causal
attribution. C3P captured `HTTP_STATUS / OPERATION_GET / 403`; C3N captured only
`HTTP_STATUS / OPERATION_GET`. C3R2 evaluated the recovered C3P Operation resources
at diagnosis time, finding allow NOT_GRANTED / deny NOT_DENIED. It did not capture
the effective authorization decision of the original denied GET. C3U's exact
one-permission apply, GRANTED read-back and C3V success prove that the diagnosed
gap was repaired and that the fresh production path works.

The audit freshly expanded Admin Activity inspection to
**2026-09-20T05:16:00Z–08:06:01Z**, covering C3N through C3R2: **19 entries**, below
the 1,000-entry limit, with no relevant IAM policy/binding/role or project-move
mutation. This strengthens continuity beyond the earlier C3R2 interval. A separate
Cloud Run Operation GET / Policy Denied query over the same interval returned
zero entries, so no contemporaneous denied-GET authorization record was recovered.
Absence of a logged mutation supports continuity; it is not itself a historical
effective-policy snapshot or the server's request-specific refusal reason.

The material unresolved alternative for C3N is a different HTTP failure, such as
404, 429 or 5xx, which its captured kind/stage cannot distinguish. C3P is narrower:
403 is proven and the missing-allow explanation is strongly supported, but its
safe record does not isolate the original authorization decision from another
request-specific 403. No competing cause was positively observed. The fresh
release used a new request/Operation after the fix, not a replay of the original
denial. Together these limits prevent elevating the combined historical claim
to PROVEN; they do not reopen the now-closed effective-allow defect.

Reassessment requires incident-time evidence tying the actual principal,
Operation and `run.operations.get` refusal to missing allow, or equivalent
historical evidence that resolves these alternatives. Conversely, evidence of
effective allow at the incident or a different refusal reason would refute or
narrow the IAM attribution. No historical HTTP value or policy snapshot is
invented to close this documentation task.

The previous blanket requirement for rollback verification is closed for C3's
restoration and diagnostic-durability evidence: C3G actually restored the previous
pair with post-rollback smoke PASS; C3K runtime-recorded the observed promotion
and rollback failure fields; C3U proved read authorization on the exact rollback
Operation. These are distinct facts. They do not recover C3G's missing workflow
field or establish a new successful rollback after C3U. The Completion Contract
requires preservation of the paired rollback/runbook contract, not an induced
production failure for every release. The runbook's checks still apply to any
future rollback; full authenticated post-rollback browser coverage is not newly
claimed by these endpoint smoke results. No forced failure or additional rollback
event is required for this C3 closure.

**Must 4 remains OPEN.** The verified path is manual dispatch after exact-main CI,
then OIDC/WIF → Build → immutable digests → paired candidates/exact Backend URL →
E2E/cleanup → production approval → Backend promotion → Frontend promotion →
post-deploy verification. At C3W closure, automatic **main merge + required-CI-success
triggering** was the remaining gap and `cd.yml` had only `workflow_dispatch`.
At C4B source-validation time automatic runtime was NOT YET. The later C4C record
below proves the automatic path through E2E WIF, retaining the C3 historical boundary.
C3W documentation synchronization was complete pending its
separate Fresh Result Audit; it does not close the Portfolio final documentation
audit or unrelated Must conditions.

`policytroubleshooter.googleapis.com` remains **ENABLED / not Terraform-owned**;
cleanup/codification is **DEFERRED**, not an inferred Portfolio Must. C3W made no
runtime, workflow, application or Terraform desired-state change.

## Approval, traffic and concurrency

```text
exact-main successful CI
-> Deploy WIF / exact-source Build / immutable digests
-> unique Backend 0% candidate
-> Frontend 0% candidate with that Backend's exact tagged URL
-> reusable E2E WIF / dedicated secret / browser scenario
-> exact-user cleanup and zero residuals
-> Deploy-SA candidate + production read-back
-> production Environment approval
-> fresh source / TTL / captured-production / retained-tag checks
-> Backend promotion -> Frontend promotion
-> read-only production smoke + actual-state verification
```

“Candidate cleanup” before approval means disposable-user Auth/profile/notes/tags
cleanup, **not deleting the Cloud Run candidate about to be promoted**. Only the
production mutation job uses Environment `production`. The entire workflow shares
one concurrency group with `cancel-in-progress: false`, including approval waits.
A newer run cannot cancel in-progress production mutation.

Traffic parsing supports one 100% production revision plus multiple 0% tagged
revisions, not one traffic entry. Split production is refused. All existing
tags/URLs are preserved, including stale candidates and the Backend URL used by
the previous Frontend. Promotion requires unchanged captured production and
retained traffic. Cloud Run v2 traffic-only PATCH includes a fresh ETag to reject
read/check/write races; conflict/uncertain update responses are never blindly retried.
See [traffic PATCH](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/patch)
and [Service ETag](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services).

## Candidate lifecycle and failure handling

Before Build, each service must have fewer than 20 tags and 40 retained revisions,
including zero-traffic/non-tagged revisions. Pagination beyond the inspected bound
fails closed. The v2 revision-list request uses the exact service parent. Runtime
permission proof remains Human-gated; do not widen IAM to bypass failure.

Failed/partial candidates stay at 0% for inspection and count toward these caps.
No tag is automatically removed/reassigned. A separate Human operation must retire
complete pairs from rollback eligibility, prove no retained Frontend references
their Backend tag, then remove only those retired tags/revisions. The workflow
cannot accumulate candidates indefinitely by deleting its cap markers. No tag or
revision cleanup automation is introduced here.

| Failure stage | Behavior |
| --- | --- |
| pre-build / Build | Stop; no promotion; Build submitted at most once |
| candidate creation | Stop; inspect partial 0% pair; verify production preserved; never repair traffic before approval |
| E2E / user cleanup | Cleanup in controller `finally`; no pass/hash without zero residuals; approval blocked |
| runner loss / forced kill | Cleanup may be unproven; Human recovery, no retry/delete-by-pattern |
| pre-promotion stale state / TTL | Fail closed before traffic mutation |
| promotion / post-deploy verification | Read actual state; rollback only if every revision/tag/config still belongs to this attempt or captured previous pair |

The remediated v2 controller distinguishes scenario failure (exit 20), remote
cleanup unproven/residual (21), and evidence/local receipt failure (22). Validated
scenario and cleanup sub-results survive any failed exit. Remote all-zero counts
remain PROVEN_ZERO even if local receipt persistence fails. Missing/corrupt results
become E2E_RESULT_UNAVAILABLE with unknown counts; interrupted or mismatched exits
block success without rewriting observed counts. Python flushes the safe recovery
handle before creation and publishes only the strict envelope to logs/summary.
No approval hash is emitted on failure; raw streams remain discarded. Historical
P2B v1 retains its 0/1 exit contract. See the [result contract](./cd-c3-e2e-recovery-contract.md#future-source-contract-safe-durable-result).

Rollback restores **Frontend first, then Backend**, using exact captured revisions
and unchanged Backend tag mapping. Unknown/out-of-band state requires Human decision.
Restoration is re-read and smoked; tags never move to reconstruct a pair.
Post-deploy smoke is read-only `/login = 200`, `/api/auth/session = 401`, Backend
`/ = 404`. Authenticated major workflow coverage comes from preceding E2E on the
same immutable images; this does not claim the full v1 production browser smoke.

## Secret transport and evidence

Only E2E selects the E2E SA. The Python parent validates manifest and credential
identity before one exact-version Secret Manager REST access, verifies response
identity/checksum, and keeps `sb_secret` in memory. The SDK never receives this
payload, avoiding SDK file logging of it. Private stdin carries it to Node; the
browser child inherits neither it nor Google/GitHub credentials. Core dumps are
disabled. No payload enters argv, env, disk, artifact, `GITHUB_OUTPUT`, `GITHUB_ENV`,
logs, summary or thrown-error output. Errors and child streams are not forwarded.
Google auth's temporary external-account configuration is distinct from the
Supabase credential and is removed by the pinned auth action.

Browser trace/screenshot/video/automatic error context remain disabled. Existing
exact-UUID ownership, cleanup and artifact-marker checks remain. Only after E2E
and cleanup pass is a manifest hash output; Deploy still verifies actual traffic.
No GitHub artifact upload is used.

The [publishable-key logging Should](./wif-submission-proof.md#follow-up-should-publishable-key-log-hygiene)
remains non-secret, non-blocking and requires no rotation. It is distinct from the
privileged E2E credential's strict transport boundary.

## Validation and runtime boundary

Use the [C3C validation record](./verification.md#cd-c3c-recovery-contract-validation)
and [offline commands](./verification.md#cd-c1-offline-validation). Current Terraform
state is **37** at C3U closure; the post-apply plan was **0 add / 0 change / 0 destroy**.
The historical C3S plan was **+2 / 0 change / 0 destroy**, with all 35 existing
resources no-op; the earlier post-CD-C2C baseline was **No changes / exit 0**.
No apply/import/state mutation, Cloud
Build, dispatch, Supabase key creation or Cloud Run mutation is authorized by
source validation. Fresh independent Result Audit precedes any Human runtime gate.

Historical CD-C1 read-only plan returned `PLAN_EXIT=2`, exactly `5 add / 0 change /
0 destroy`; all 30 existing managed resources and outputs were no-op. Plan JSON
also reported one refresh-only difference on
`google_artifact_registry_repository.workout_journal.update_time`. The **locked
provider schema**, not latest Registry docs, confirmed `computed=true` with
neither `optional` nor `required`; all other before/after fields were identical.
This is recorded separately, not described as zero `resource_drift`. No saved plan
from source validation is authorized for apply; runtime work needs a fresh plan
and its own Human Gate.

## C4C nested Playwright authority remediation

Historical C4C implementation checkpoint: the failed run, then-current production
and source-only NOT-YET statements below are preserved. C4D records the later runtime result.

On 2026-09-21, merged source `719b22f246ed63f5512e9efff6773e6309dc0ad1` passed
[main CI 35557808342](https://github.com/tyosu131/Workout-Journal/actions/runs/35557808342),
attempt 1, and automatically triggered [CD 35557989507](https://github.com/tyosu131/Workout-Journal/actions/runs/35557989507),
`workflow_run`, attempt 1, on that exact source. Fresh GitHub job/step read-back
confirmed preflight and candidate SUCCESS, reusable credential-free preflight SUCCESS
and E2E WIF authentication SUCCESS. Automatic trigger, source/CI authority, Deploy
WIF/Build and paired candidate creation are runtime PROVEN for this run.

The safe E2E result independently reacquired from that run records
`SCENARIO_FAILED`, scenario FAIL, all eight steps NOT_RUN, HTTPS cookie false,
receipt PERSISTED, cleanup PROVEN_ZERO (auth/users/notes/user_tags all 0) and evidence
PASS. Verify and production were SKIPPED. Read-only Cloud Run traffic confirmed
the C3V pair `cd-35545739898-1` remains 100% on both services and the failed
`cd-35557989507-1` pair remains 0%; no recovery mutation is required.

**Root cause PROVEN:** C4B added required public authority checks, but the nested
`candidate-run.mjs` → Playwright `cleanEnv` omitted `CD_MODE`, `CD_SOURCE_SHA`,
`CD_CI_RUN_ID`, `CD_CI_RUN_ATTEMPT` and `E2E_SECRET_VERSION`. The Python parent already
forwarded them. Playwright config calls `browserBase` → `readCandidateManifest` →
`bindWorkflow` before test execution; the missing identity deterministically raises
`EXECUTION_IDENTITY_MISMATCH`. The controller suppresses child diagnostics and maps
the unsuccessful launch to SCENARIO_FAILED; no step report exists, producing eight
NOT_RUN entries. This is a nested process propagation defect, not an automatic
trigger, WIF, candidate-readiness, Secret Manager, cleanup or production defect.

C4C adds only those five names to the existing explicit public-metadata allowlist.
Values are copied from the validated parent, never recomputed. GitHub/Google/Admin
credentials remain excluded; existing synthetic-user login inputs and cleanup are
unchanged. The outer credential-free pre-auth gate is separately preserved.
An offline test executes the actual Python selector and Node launcher, intercepts
only external I/O, and loads real Playwright config with `--list`. The pre-fix
source fails the semantic propagation assertion; six omission mutants reproduce
the rejected child identity and NOT_RUN signature. No hosted browser test runs.

**Must 4 OPEN. Automatic runtime PARTIAL: trigger through E2E WIF PROVEN; full
E2E/release NOT YET.** This source fix has no new runtime proof. Do not rerun
`35557989507` or reuse its candidate ID. A separately approved fixed merge must
produce fresh main CI, automatic CD and a new candidate ID; production promotion
still requires its own Environment Human approval. No commit/push/PR, dispatch,
rerun or runtime mutation was performed in C4C implementation.

## C4D automatic production delivery runtime closure

On 2026-09-21, read-only GitHub and GCP reacquisition established **Must 4 Closed;
remaining gap None**. [PR #114](https://github.com/tyosu131/Workout-Journal/pull/114)
merged at `2026-09-21T07:25:42Z` as `03f45f3b7ba2d48040cffcb2130318717a1e9d09`.
[Main CI 35572912520](https://github.com/tyosu131/Workout-Journal/actions/runs/35572912520)
was `push`, main, attempt 1, completed/success, workflow ID `286209592`,
`.github/workflows/ci.yml`; required job `Lint, build, and test baseline`
(`106248199139`) succeeded. [Automatic CD 35573153822](https://github.com/tyosu131/Workout-Journal/actions/runs/35573153822)
was `workflow_run`, main, attempt 1, completed/success, `.github/workflows/cd.yml`.
The completed CI run reports `updated_at=07:28:50Z`; CD was created at `07:28:52Z`. Timing is corroboration;
the manifest's fixed CI ID/attempt provides the direct causal binding.

| Job | Job ID | Result |
| --- | --- | --- |
| preflight | `106248958626` | SUCCESS |
| candidate | `106248991045` | SUCCESS |
| candidate-e2e / e2e | `106250992925` | SUCCESS |
| verify-candidate | `106251358813` | SUCCESS |
| production | `106251581582` | SUCCESS |
| wif-control-negative | `106248959676` | SKIPPED |
| wif-positive | `106248959548` | SKIPPED |
| candidate-e2e / wif-proof | `106250994241` | SKIPPED |

Preflight outputs consumed by the later jobs record `mode=automatic-release`,
source `03f45f3b7ba2d48040cffcb2130318717a1e9d09`, CI ID `35572912520`, CI attempt `1`
and reviewed E2E version metadata `1`. The identical v2 manifest in E2E, verify
and production records `run.event=workflow_run`, `run.id=35573153822`,
`run.attempt=1`, `run.ciRunId=35572912520`, `run.ciRunAttempt=1`,
`run.workflowRef=tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main`
and `run.workflowSha=03f45f3b7ba2d48040cffcb2130318717a1e9d09`.
**Exact source binding PROVEN:** sourceSha = build.sourceSha = run.workflowSha =
CI head SHA = CD head SHA = freshly read main. No manual dispatch or CI reselection
is used as proof of this automatic run.

Build `b53e2ad8-8e66-4f98-a3f6-f4a380f383c8` was SUCCESS at that exact source.
Candidate identity is `cd-35573153822-1`; capture time was
`2026-09-21T07:36:34.512431+00:00`, `ttlMs=3600000`.

| Evidence | Backend | Frontend |
| --- | --- | --- |
| Revision | `workout-journal-backend-cd-35573153822-1` | `workout-journal-frontend-cd-35573153822-1` |
| Immutable digest | `sha256:3b35f794badf0ffe0efff96aa681a8cbf2115ca0ffc95ad67ede40087eabc047` | `sha256:5cdc518627ba9415b7312352d1b9802369613fbf99fcbd5e68b00e5d5478cd56` |
| Captured candidate traffic | 0% | 0% |
| Previous C3V revision at capture | `workout-journal-backend-cd-35545739898-1` / 100% | `workout-journal-frontend-cd-35545739898-1` / 100% |
| Fresh Current traffic | 100% | 100% |

Manifest capture and successful pre-production verify retained the prior 100% pair;
production traffic mutation before approval was **0**. The Frontend's manifest
pairing and fresh revision `BACKEND_INTERNAL_URL` both equal
`https://cd-35573153822-1---workout-journal-backend-cpbzb7lqza-an.a.run.app`.
Fresh service/revision reads in `workout-journal-506909`, `asia-northeast1`, matched
both manifest digests and the Current 100% pair. The previous C3V pair and failed
C4B pair `cd-35557989507-1` are each 0% on both services.

The independently reacquired safe E2E result is **PASS, 8/8 PASS**: login,
tag-create, note-create-save-read, tag-use, Calendar, Analytics, tag-delete, logout.
`httpsCookieVerified=true`, `localReceiptState=PERSISTED`, `evidenceState=PASS`;
auth/users/notes/user_tags are `0/0/0/0`, `cleanupState=PROVEN_ZERO`.
Manifest hash and E2E hash are both
`7048471087a6f88173106dd853186e30b66c216d0cd7f23d7bed29d8c62948df`.
Canonical manifest bytes independently hash to that value; verify-candidate SUCCESS
confirms equality and the re-read pair before production.

**Human approval is independently confirmed**, not inferred from an empty pending
deployment list: `GET /repos/tyosu131/Workout-Journal/actions/runs/35573153822/approvals`
returned `state=approved`, reviewer `tyosu131` (`User`), environment `production`
(`21297410440`). The exact workflow has `environment: production`; production ran
after verify and this Environment review. No automatic approval is claimed.
Backend then Frontend promotion and post-deploy verification passed. The production
log records `CD-C1: PASS / post-deploy-verification` and this fixed safe diagnostic:

```json
{"failureCode":null,"phase":"post-deploy-verification","promotionFailureCode":null,"promotionFailureStage":null,"result":"PASS","rollback":null,"rollbackFailureCode":null,"rollbackFailureStage":null,"runApiFailureKind":null,"runApiFailureStage":null,"runApiHttpStatus":null}
```

`CD_C1_ACTIVATION` freshly returned HTTP 404 / **UNCONFIGURED**. The automatic E2E
job's activation metadata was empty; automatic delivery succeeded without the manual
latch. Manual release retains its explicit activation/input contract. Production
approval remains required for future releases.

| Contract requirement | Evidence | Result |
| --- | --- | --- |
| main merge | PR #114 / `03f45f3b7ba2d48040cffcb2130318717a1e9d09` | PASS |
| CI success | `35572912520`, attempt 1; required job `106248199139` | PASS |
| automatic causal trigger | `workflow_run` `35573153822`; fixed manifest CI ID/attempt | PASS |
| OIDC / WIF | Candidate Deploy auth and E2E auth steps SUCCESS; source uses keyless WIF | PASS |
| Cloud Build | `b53e2ad8-8e66-4f98-a3f6-f4a380f383c8`, SUCCESS | PASS |
| immutable digests | Manifest digests above equal fresh revision read-back | PASS |
| Backend candidate | `workout-journal-backend-cd-35573153822-1`, captured 0% | PASS |
| exact Backend tagged URL | Manifest and fresh Frontend BACKEND_INTERNAL_URL equality | PASS |
| Frontend candidate | `workout-journal-frontend-cd-35573153822-1`, captured 0% | PASS |
| automated smoke | Eight named steps PASS; HTTPS cookie verified | PASS |
| cleanup | PROVEN_ZERO / 0/0/0/0; receipt PERSISTED | PASS |
| production approval | GitHub production Environment review: approved by `tyosu131` | PASS |
| Backend promotion | Production PASS and fresh 100% read-back | PASS |
| Frontend promotion | Production PASS and fresh 100% read-back | PASS |
| post-deploy verification | `CD-C1: PASS / post-deploy-verification` | PASS |

**C4C remediation source PROVEN; runtime PROVEN.** The formerly failing nested
authority boundary now passes all eight scenario steps and the complete release.
Historical C4B run `35557989507` remains FAILURE with its PROVEN propagation root
cause and PROVEN_ZERO cleanup. C3 runtime chain remains CLOSED; C3N/C3P historical
root cause remains STRONGLY_SUPPORTED_NOT_PROVEN, and C3G/C3K remain NOT PROVEN.

Rollback was **NOT EXECUTED** in C4D; no new rollback-success event is manufactured.
The existing bounded C3G restoration/smoke, C3K durable diagnostics and C3U rollback
Operation authorization evidence remains sufficient for the unchanged Completion
Contract. Other Musts are unchanged: 1 In progress, 2 Closed, 3 In progress,
5–8 Open. Must 3 monitoring/alert resources and Must 5 Observability remain future work.
C4D performs read-only evidence collection and docs synchronization only: no
dispatch/rerun/approval, cloud/traffic/IAM/Terraform/variable mutation, secret payload
access, Supabase mutation, commit, push or PR. Fresh Result Audit is next.

## OBS-B/C probe rollout source contract

OBS-B/C implements Backend process-only HTTP startup/liveness and a candidate-only
`/health` verification, with runtime proof **NOT YET**. Frontend keeps its existing
TCP startup probe. The old TCP production spec may transition only to the exact
approved HTTP probe configuration; this also permits a non-promoted approved
candidate to remain latest-ready. Unrelated spec changes remain rejected, and
actual full revision spec hashes retain probe fields. Manifest version remains 2.

Backend then Frontend promotion, Frontend then Backend rollback, original rollback
smoke, TTL, CAS, Operation polling, exact CI authority and Environment approval
remain unchanged. Old rollback revisions are not required to implement `/health`.
Monitoring Terraform is separately gated and NOT APPLIED; Must 3 remains In progress
and Must 5 Open. C4D's Must 4 closure and all earlier Historical C3/C4 evidence remain
unchanged. See [OBS verification](./verification.md#obs-bc-health-and-monitoring-implementation)
and [probe/inspection operations](./cloud-run-deployment-runbook.md#observability).
