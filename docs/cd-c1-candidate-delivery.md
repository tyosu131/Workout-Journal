# CD-C1: dedicated candidate E2E and gated delivery

Status: **CD-C1 merged; CD-C2A/B complete; CD-C2C provider activation COMPLETE;
CD-C2D-R6 failed at A / P1 path guard; R7 removes the undocumented fixed path suffix in source, runtime verification pending, WIF proof OPEN.** Must 3 is **In progress**,
Must 4 **Open**, production CD **inactive**. Existing Deploy WIF is Current and
runtime proven by [CD-B2 / PE-P1C-01B](./wif-submission-proof.md#cd-b2-verified-runtime-proof).
CD-C1 merged at `b73e2461de363f00fb01e5620cf3fe7288078a37`.
E2E positive/negative WIF and full CD runtime proofs remain **OPEN**.
Source implementation, offline tests and a Terraform plan are not runtime proof.

## Current CD-C2A/B runtime record

CD-C2A is **COMPLETE**: the separately approved five-resource apply provisioned
the E2E SA, secret container, exact-secret Accessor, disabled provider and mapped
WorkloadIdentityUser member. Terraform contains **35 resources**; the subsequent
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
| Existing Deploy SA | Existing build/candidate/promotion/rollback grants unchanged; no privileged Supabase payload access |
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
positive/negative federation tests remain OPEN.

Primary contracts: [GitHub reusable-workflow OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows),
[Google mappings and conditions](https://docs.cloud.google.com/iam/docs/reference/rest/v1/projects.locations.workloadIdentityPools.providers),
and [Google pool-collision guidance](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation).
Google generally recommends separate pools to avoid subject collisions; this
Task's preferred same-pool design explicitly separates subjects and grant attributes.

## Activation and source authority

`cd.yml` has only `workflow_dispatch`, not `workflow_run`. CD-C2C adds a `mode`
choice: **`wif-proof` (default)** or `release`. Only release requires repository
variable `CD_C1_ACTIVATION == approved`; it remains **UNCONFIGURED**. The variable
is an activation latch, not a production approval. Release also requires an exact
numeric `e2e_secret_version`, checked by preflight before Google authentication.
A later Human Gate must review/merge source, freshly plan and approve provider
activation, then separately approve proof dispatch. Full release activation and
credential consumption remain later gates; key/version creation is already complete.

Release dispatch must use the exact current main SHA and exact `cd.yml` workflow SHA.
The controller independently queries successful main **push** CI and its required
`Lint, build, and test baseline` job. Its `head_sha` is the release authority. A
future automatic adapter must use `workflow_run.head_sha`, validate the same CI
identity and check out that SHA, not an arbitrary env SHA or newer default-branch
commit. No PR-controlled source executes in an OIDC/secret-bearing job.

All Actions in the CI trust root and privileged delivery jobs are immutable-SHA
pinned, and checkout does not persist credentials. CI explicitly has only
`contents: read`. Delivery default permissions are empty;
`id-token: write` is limited to Google-authenticated jobs; only CI inspection jobs
receive `actions: read`. E2E is a same-repository, same-commit reusable call.

## Isolated WIF proof (CD-C2D failed at A; runtime OPEN)

`mode=wif-proof` does not need a manifest, secret version or activation variable.
It has exactly this dependency chain, with no production Environment:

| Check | Provider / target | Required outcome |
| --- | --- | --- |
| A control | Deploy provider `workout-journal` / Deploy SA | STS federation and SA access-token generation succeed |
| B isolation | The **same A federated token** / E2E SA | IAM Credentials HTTP 403, error code 403 and `PERMISSION_DENIED` |
| C positive | E2E provider `workout-journal-e2e` / E2E SA | Federation and SA access-token generation succeed inside `candidate-e2e.yml` |

A/B run in `wif-control-negative`; only its success permits `wif-positive`, which
calls the existing reusable workflow with `mode=wif-proof`. B does not reuse the
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
requires activation, manifest and hash, then retains existing manifest validation,
exact secret read, private stdin, scenario and cleanup. Proof performs **no Secret
Manager access, E2E/Playwright, Cloud Build, Cloud Run or production operation**.
The shared concurrency group also serializes proof runs behind an outstanding
release/approval wait; this deliberately trades convenience for a single queue.

API contracts: [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc),
[STS token exchange](https://docs.cloud.google.com/iam/docs/reference/sts/rest/v1/TopLevel/token)
and [IAM access-token generation](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken).
Offline tests mock all authentication endpoints; actual A/B/C proof is **OPEN**.

## Dynamic candidate provenance

The release path builds a v2 manifest from Build and Cloud Run read-back, binding:

- repository, source/workflow SHA, caller, run ID/attempt and CI run ID;
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

P2B's `APPLICATION_SHA`, fixed production names/tag and v1 builder remain solely
as the historical manual proof oracle. GitHub Actions rejects v1 manifests.
CD-C1 does not use that builder's fixed SHA, Build ID, digests or pair.

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

The v2 E2E controller distinguishes scenario failure (exit 20), cleanup unproven
(21), and evidence rejection (22). Interrupted or unknown child exits also mean
cleanup unproven. The Python parent reports only allowlisted phase/status codes
and emits no approval hash on failure; child streams and raw exceptions remain
private. Historical P2B v1 retains its 0/1 exit contract.

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

Use [offline validation](./verification.md#cd-c1-offline-validation). Terraform
state is 35; after completed CD-C2C activation the expected plan is
**No changes / exit 0**. All resources/grants must be no-op. No apply/import/state mutation, Cloud
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
