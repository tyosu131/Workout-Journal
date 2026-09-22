# Verification

This project uses Node 24 and separate dependency sets for the root workspace, frontend, and backend. Install each one before running local verification.

Current production and final Must 5 evidence: [OBS-D3F closure](#obs-d3f-final-observability-documentation-closure).
**Must 3, Must 4 and Must 5: Closed.** Current production is `cd-35684518093-2`,
100% on both services. [OBS-D2A/B](#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure)
retains Monitoring apply/no-drift and the Historical previous production pair.
C4D retains the automatic-delivery proof that closed Must 4; C3 runtime chain
remains CLOSED. Dated source/runtime sections retain their phase-local NOT-YET
results and do not override the final runtime record.

## OBS-D3F Final Observability Documentation Closure

**Current evidence owner: OBS-D3F, 2026-09-22. Phase: Final Runtime Evidence
Documentation Closure.** Source Map v3.1, Core Harness v3.2 and Workflow Router
v3.2 route production facts to fresh GitHub/Cloud Run read-back, the Must 5
boundary to the actual Completion Contract, and email receipt to Human evidence.
OBS-D3D supplies the attempt 2 runtime proof; OBS-D3E establishes incident recovery,
both Human email receipts and Must 5 closure. OBS-D3F durably records that evidence
and the subsequent promoted pair, without executing another failure request.

### Final authority and current production

Fresh read-only authority and Cloud Run read-back completed at
**2026-09-22T06:03:15Z**, after production completed at `2026-09-22T05:53:00Z`.

| Evidence | Accepted value |
| --- | --- |
| Remote main / local HEAD | `05d68feecb1b251f996a0e15e1f2ae6cc6fa136b` |
| Main CI | [35684377945](https://github.com/tyosu131/Workout-Journal/actions/runs/35684377945), push, SUCCESS, attempt 1, exact main SHA |
| Automatic CD | [35684518093](https://github.com/tyosu131/Workout-Journal/actions/runs/35684518093/attempts/2), workflow_run, SUCCESS, attempt 2, exact main SHA |
| Production job | [106625522700](https://github.com/tyosu131/Workout-Journal/actions/runs/35684518093/job/106625522700), SUCCESS |
| Post-deploy | PASS; accepted OBS-D3F Human handoff and successful production job/verification step |
| Rollback | NOT EXECUTED; accepted OBS-D3F Human handoff; no new rollback proof claimed |
| Candidate ID / current production | `cd-35684518093-2` |
| Backend production revision / traffic | `workout-journal-backend-cd-35684518093-2` / 100% / Ready |
| Frontend production revision / traffic | `workout-journal-frontend-cd-35684518093-2` / 100% / Ready |
| Backend image digest | `sha256:defec94aac491a731f3035e75a9c92599b90bd79a92b76b43179eba89c847bea` |
| Frontend image digest | `sha256:5a0bf570f86270245dc1a8229a0f225d21532407e35b7a91e4711cfc10098d96` |
| Exact Backend tag / Frontend BACKEND_INTERNAL_URL | `https://cd-35684518093-2---workout-journal-backend-cpbzb7lqza-an.a.run.app`; tag resolves to the paired Backend revision |
| Historical previous production | `cd-35675050740-1`; its original 100%/100% evidence remains in OBS-D2A/B below |

Cloud Run `trafficStatuses`, both revision Ready conditions, immutable tag targets
and Frontend's exact Backend URL agree. This is post-promotion read-back, not an
inference from main or latest-ready. OBS-D3D/E's earlier 0% candidate / previous
pair 100% observations remain phase-local history.

### Health and availability evidence

| Signal | Evidence | Result |
| --- | --- | --- |
| Backend `/health` | OBS-D2A GET 200 with exact `{"status":"ok"}`; attempt 2 candidate health/verify succeeded before promotion | PROVEN |
| Backend startup probe | OBS-D3F deployed HTTP `/health`:8080; delay 0, timeout 2s, period 5s, failure threshold 24 | PROVEN |
| Backend liveness probe | OBS-D3F deployed HTTP `/health`:8080; delay 0, timeout 2s, period 30s, failure threshold 3 | PROVEN |
| Frontend availability | OBS-D2A managed USA uptime: 36/36 true samples across Iowa, Oregon and Virginia; attempt 2 post-deploy PASS | PROVEN |

API-omitted initial probe delay uses default 0. Frontend retains TCP startup on
8080, timeout/period 240s, failure threshold 1. Historical uptime sample times and
managed check identity remain in OBS-D2A/B. OBS-D3F sent no application requests.

### Structured failure runtime: separate attempt records

**Historical supporting evidence — OBS-D3B, 2026-09-22, attempt 1 only:**
`cd-35684518093-1` produced **1** safe structured `server_failure` and **1**
candidate 5xx; Backend incident **NONE**. These counts are excluded from the
attempt 2 totals and are not used to prove alert delivery.

**Authoritative runtime proof — OBS-D3D, 2026-09-22, attempt 2:**
Human executed exactly **2 controlled requests**, HTTP **500 / 500**, against the
exact tagged Backend candidate `workout-journal-backend-cd-35684518093-2`.
At the exercise, both attempt 2 candidates were 0%, the previous production pair
was 100%/100%, and production approval was waiting. The malformed-JSON requests
to the non-application route used no credentials or application data. No retries
or Supabase mutations were part of the exercise.

Cloud Logging query scope was project `workout-journal-506909`,
`resource.type="cloud_run_revision"`, service `workout-journal-backend`, exact
attempt 2 revision, `jsonPayload.event="server_failure"`, and interval
`2026-09-22T05:15:39.225052Z`–`2026-09-22T05:36:48.500248Z`.

| Attempt 2 evidence | Accepted result |
| --- | --- |
| Controlled HTTP request count / status | 2 / 500, 500 |
| Structured event count | 2 |
| Event timestamps | `2026-09-22T05:29:21.939205Z`, `2026-09-22T05:29:25.043219Z` |
| Severity / event / operation | ERROR / server_failure / server_handler |
| Safe schema | PASS, both events; only allow-listed severity/event/operation/error fields, finite error name and optional integer status |
| Forbidden payload | ABSENT; no raw message, stack, request URL/body, credentials, user identity, dependency payload or config values |
| Candidate 5xx metric | 2; `run.googleapis.com/request_count`, response_code_class=5xx, exact attempt 2 revision |
| Candidate positive metric interval | `2026-09-22T05:29:00.001Z`–`2026-09-22T05:30:00Z`, count 2 |
| Service-wide aligned value | 2; 300s / ALIGN_SUM / REDUCE_SUM, grouped by project/location/service |
| Service-wide aligned interval | `2026-09-22T05:28:58.127166Z`–`2026-09-22T05:33:58.127166Z`, value 2 |
| Structured logging runtime | PROVEN |

All positive service-wide 5xx in the inspected attempt 2 window came from that
candidate. Attempt 1 is excluded by the window and revision attribution. The
policy reduces revisions to a service-level incident; it does not label the
incident as production-only. These are sanitized evidence facts, not raw logs.

### Backend alert and Human notification receipt

| Evidence | Accepted value |
| --- | --- |
| Policy | `projects/workout-journal-506909/alertPolicies/16194106629321602210` |
| Metric scope | Backend service-wide 5xx in `asia-northeast1`, including tagged 0% candidates |
| Condition | 300s / ALIGN_SUM / REDUCE_SUM / COMPARISON_GT 1 / duration 60s |
| Incident | `projects/workout-journal-506909/alerts/0.ocx5ovcnnr5d` |
| OPEN | `2026-09-22T05:35:20Z` |
| CLOSED | `2026-09-22T05:39:14Z` |
| Backend alert runtime | PROVEN |
| Alert firing email | RECEIVED — Human confirmation accepted in OBS-D3E and reaffirmed in OBS-D3F handoff |
| Recovery email | RECEIVED — Human confirmation accepted in OBS-D3E and reaffirmed in OBS-D3F handoff |
| Notification delivery | PROVEN |
| Notification destination exposed | NO |

Receipt timestamps are not supplied; incident OPEN/CLOSED times are not email
receipt times. OBS-D3D's `WAITING_FOR_HUMAN_EMAIL_CONFIRMATION` and OBS-D3E's
`READY_FOR_PRODUCTION_APPROVAL` are **Historical intermediate states**, superseded
by Human receipt and the successful promoted attempt 2. They are not Current gates.

### Exact Must 5 requirement mapping

Re-read [Completion Contract Must 5](./portfolio-completion-contract.md#must-5-observability):
its six requirements are unchanged and map one-to-one as follows.

| Must 5 requirement | Evidence | Result |
| --- | --- | --- |
| application and service health inspection | OBS-D2A + attempt 2 runtime health/verification | PASS |
| a Cloud Run health probe | Deployed startup/liveness read-back in OBS-D3F | PASS |
| sanitized structured failure logging | OBS-D3D attempt 2: two safe structured events | PASS |
| frontend availability monitoring | OBS-D2A managed USA uptime runtime | PASS |
| an actionable server-side failure alert | Attempt 2 incident OPEN/CLOSED + Human firing/recovery email delivery | PASS |
| a documented inspection and recovery procedure | [Observability and paired recovery runbook](./cloud-run-deployment-runbook.md#observability) | PASS |

**Must 3: Closed. Must 4: Closed. Must 5: Closed. Remaining Must 5 gap: None.**
This does not close other Portfolio Musts or claim the separate Final Portfolio Audit.

### Future final-docs merge and private-evidence retention

**Future operational plan, not executed in OBS-D3F:** merging the final docs-only
PR will again trigger automatic CD. Allow main CI, candidate, E2E and verify to
run; **DO NOT approve production; cancel at the production approval wait** in the
later merge phase. Preserve workflow behavior. The intended production pair
remains `cd-35684518093-2`, 100%/100%; do not promote merely because docs changed.

Keep the private OBS-D1 saved-plan directory until the final documentation PR is
merged and this durable evidence is verified; delete it only after those conditions
are met. This final retention condition supersedes the earlier OBS-D2B timing.
No deletion occurs in OBS-D3F. Reconstructing the closure requires only this record,
its dated linked evidence and the named GitHub/GCP identities; no private local
path, notification destination, raw log payload or Terraform sensitive value is
required.

### OBS-D3F documentation validation and handoff

| Offline closure check | Result |
| --- | --- |
| `git diff --check` | PASS |
| Existing relative-link validation | 238 PASS: 221 outgoing + 17 inbound |
| Existing anchor validation | 153 PASS |
| Existing added-content sensitive-pattern validation | PASS; 0 sensitive-pattern hits and 0 real notification/personal email addresses in the entire diff |
| Current/Historical contradiction validation | 38 technical documents searched; 38 status/identity occurrences classified: Current 15 / Historical 20 / Future 3 / stale Current 0; multiline stale-claim check and explicit Current production/runtime owner review PASS |
| Existing historical/preservation validation | PASS; all 40 legacy occurrences remain Historical; original Must requirements, Must 3/4 matrix rows, all 42 resource rows, C4D evidence identities, P2B/R1–R7 proof bodies and deployment/rollback commands preserved |
| OBS-D1/D2 evidence integrity | Technical evidence body unchanged except its table's Historical classification label; dated phase wrapper clarifies supersession |
| Canonical completeness | Required authority, pair, request/event/metric, incident and Human receipt facts recorded without private local evidence dependencies |
| Scope | 10 documentation files only; README inspected and unchanged; index empty; no new repository files; private OBS-D1 evidence retained |

Current matches identify the promoted pair; Historical matches retain OBS-D2,
separate attempts and superseded OBS-D3D/E gates; Future matches describe the
later final-docs merge plan. The existing broader legacy-value audit also passes.
These local checks prepare a **READY_FOR_FRESH_RESULT_AUDIT** handoff; they do not
claim that the separate Fresh Result Audit has run.

Application, Terraform `.tf`, workflow and tests are unchanged. Runtime mutation,
failure requests, workflow dispatch/rerun/cancel, production approval, staging,
commit, push and PR are NOT EXECUTED. The future merge plan above is not
authorization to execute those actions in this phase.

## OBS-D2A post-apply runtime evidence and OBS-D2B closure

**Historical OBS-D2A/B evidence, 2026-09-22, final read-back at
02:44:39 UTC.** All production, Current, Open and NOT-YET statements in this
section describe that checkpoint; [OBS-D3F](#obs-d3f-final-observability-documentation-closure) owns the final production pair and Must 5 closure. OBS-D2B records the accepted evidence below and closes the
remaining Must 3 documentation gap. This documentation phase performs only
local edits and offline validation; it does not repeat Terraform operations,
cloud reads, deployment, alert tests or notification tests. The earlier OBS-B/C,
C3 and C4 records retain their phase-local evidence and limitations.

### Authority and production identity

| Evidence | Accepted value |
| --- | --- |
| Main / HEAD / origin/main | `c7848a566aeff35f7424f745086b3c969dd3f881`; clean at OBS-D2A |
| Required CI | [35674841432](https://github.com/tyosu131/Workout-Journal/actions/runs/35674841432), SUCCESS, attempt 1 |
| Automatic CD | [35675050740](https://github.com/tyosu131/Workout-Journal/actions/runs/35675050740), `workflow_run`, SUCCESS, attempt 1 |
| Production candidate ID | `cd-35675050740-1` |
| Backend production revision / traffic | `workout-journal-backend-cd-35675050740-1` / 100% |
| Frontend production revision / traffic | `workout-journal-frontend-cd-35675050740-1` / 100% |
| Build | `bdf6b3ef-00b3-4f2d-9577-1e5c97782f48` |
| Backend digest | `sha256:f0af556c30f5dacc09d9f2aafd736f72ce40bf44aaf6455666ebe18ebb61b374` |
| Frontend digest | `sha256:f90a65723fc497036007ce8b6bd82d0996a2c5933a78ead738c51eb3b033543c` |

Main, CI/CD and the 100% production pair were freshly verified in OBS-D2A;
Build/digest identity is supplied by the Human for OBS-D2B. C4D's
`cd-35573153822-1` remains Historical previous-production and Must 4 proof,
not the current pair. No new production approval is claimed by this docs pass.

### Terraform apply, state and ownership

The Human applied the reviewed OBS-D1 saved plan from exact merged main:
**1 imported / 4 added / 0 changed / 0 destroyed**. OBS-D2A freshly pulled
remote state and matched the GCS object: **42 managed resources / 42 instances**,
serial **10** (advanced from pre-apply 9), lineage
`66945691-ab92-e20a-4bc1-badb121e7ab4`, generation **`1790044105183280`**,
last modified `2026-09-22T02:28:25.195Z`. All prior 37 resources remained;
there were no unexpected resources. State generation and serial were unchanged
by OBS-D2A verification.

| Added state address | Actual resource ID / ownership |
| --- | --- |
| `google_project_service.monitoring` | `workout-journal-506909/monitoring.googleapis.com`; adoption/import of an already-enabled API |
| `google_monitoring_notification_channel.email` | `projects/workout-journal-506909/notificationChannels/15537125297799228363` |
| `google_monitoring_uptime_check_config.frontend` | `projects/workout-journal-506909/uptimeCheckConfigs/workout-journal-frontend-availability-7P9o3fVTdC0` |
| `google_monitoring_alert_policy.frontend_availability` | `projects/workout-journal-506909/alertPolicies/4008158550272286687` |
| `google_monitoring_alert_policy.backend_server_errors` | `projects/workout-journal-506909/alertPolicies/16194106629321602210` |

`monitoring.googleapis.com` is ENABLED and Terraform-owned by adoption, not a
newly created API. The reviewed import action was no-op; Service Usage change
Audit Logs in the inspected apply window contained zero events.
`logging.googleapis.com` remains ENABLED / externally owned. Cloud Run services,
revisions, probes, images, tags and traffic remain **CD-owned**; there is no
`google_cloud_run_v2_service` in state and no ownership conflict.

A normal post-apply plan with **refresh enabled and locking enabled** returned
**0 add / 0 change / 0 destroy, exit 0**. Detailed machine JSON showed all
**42 resources `actions=["no-op"]`**. The four Monitoring resources had only
`user_labels` representation differences during refresh; each planned action
remained no-op. **Semantic drift: NONE.** No change plan was saved or applied;
the temporary no-op archive used for JSON inspection was removed. Terraform
monitoring desired/actual agreement and post-apply no-drift are **PROVEN**.

### Monitoring configuration and uptime runtime

Fresh API inventory: **1 uptime check, 2 alert policies, 1 notification channel**.
The channel above has display name `Workout Journal Alerts`, type `email`,
`enabled=true`, and **destination match: YES** against the privately supplied
execution variable. `verificationStatus` was absent from the API response and
is not treated as a failure. Both policies reference this exact channel.
The private destination is never reproduced here. Its presence in Terraform
state is the explicitly accepted personal-metadata design; it is not a secret
payload and does not relax the exclusion of credentials or Secret Manager values.

The managed uptime check uses `uptime_url`, host
`workout-journal-frontend-cpbzb7lqza-an.a.run.app`, **HTTPS / port 443 / GET
`/login` / 200 only / SSL validation true / period 300s / timeout 10s / USA**.
A direct GET `/login` returned 200. Monitoring query
`monitoring.googleapis.com/uptime_check/check_passed`, filtered by the actual
managed `check_id` and `resource.type="uptime_url"`, inspected
**2026-09-22 02:20:57–02:40:57 UTC**: **36 samples, all boolean true**.

| Emitted checker location | Latest observed PASS on 2026-09-22 (UTC) |
| --- | --- |
| `usa-iowa` | 02:38:10 |
| `usa-oregon` | 02:40:40 |
| `usa-virginia` | 02:38:30 |

All three currently emitted USA locations had recent PASS evidence; no polling
extension was needed. **Frontend availability monitoring: PROVEN.**

| Policy read-back | Frontend availability | Backend server errors |
| --- | --- | --- |
| Enabled / severity | true / ERROR | true / WARNING |
| Metric | `monitoring.googleapis.com/uptime_check/check_passed` | `run.googleapis.com/request_count` |
| Exact resource scope | `uptime_url`, project `workout-journal-506909`, managed `check_id=workout-journal-frontend-availability-7P9o3fVTdC0` | `cloud_run_revision`, project `workout-journal-506909`, location `asia-northeast1`, service `workout-journal-backend`, `response_code_class=5xx` |
| Aggregation | 600s / `ALIGN_NEXT_OLDER` / `REDUCE_COUNT_FALSE` | 300s / `ALIGN_SUM` / `REDUCE_SUM` |
| Condition | `COMPARISON_GT` 1 / duration 300s | `COMPARISON_GT` 1 / duration 60s |
| Missing data | INACTIVE | INACTIVE |
| Managed notification channel binding | YES | YES |
| Active incident at read-back | NONE | NONE |

The Backend filter includes **all Backend revisions, including tagged
zero-traffic candidates**. It is not production-only. Project-wide active
incident count was zero. Healthy-state configuration and wiring do not prove
incident creation or notification delivery.

### Application health and remaining Must 5 evidence

Backend production `GET /health` returned **200**, with exact body
`{"status":"ok"}`. Both HTTP probes target `/health` on port 8080:
startup **delay 0 / timeout 2 / period 5 / failureThreshold 24**, liveness
**delay 0 / timeout 2 / period 30 / failureThreshold 3**. API-omitted initial
delay uses the default 0. Frontend retains its existing TCP startup on port
8080 (timeout 240 / period 240 / failureThreshold 1), equal to the prior revision.

| Must 5 requirement | Historical OBS-D2A classification |
| --- | --- |
| Application/service health inspection | PROVEN |
| Cloud Run health probe | PROVEN |
| Sanitized structured failure logging | Source implementation and deployment PROVEN; Cloud Logging structured failure event NOT YET |
| Frontend availability monitoring | PROVEN, three-location uptime PASS |
| Actionable server-side failure alert | Configuration PROVEN; end-to-end Backend incident/notification NOT YET |
| Inspection/recovery procedure | IMPLEMENTED in the [runbook](./cloud-run-deployment-runbook.md#observability) |

Cloud Logging inspection of the current Backend revision from creation
`2026-09-22T01:20:55.067485Z` through `02:40:24Z` found **0** natural
`jsonPayload.event="server_failure"` events. No private payload was printed;
zero events do not establish runtime ingestion or schema proof. A future observed
event must contain only `severity`, `event`, `operation`, `error.name`, and
optional `error.status`, with the finite values defined by the deployed logger.

**Must 3: Closed. Remaining gap: None.** Existing Artifact Registry, Service
Accounts, IAM, WIF and Secret Manager metadata evidence plus OBS-D1/D2A now
satisfies the exact remaining Monitoring scope; this durable record closes its
documentation requirement. **Must 5: Open**, with exactly two runtime gaps:

1. Observe a safe structured `server_failure` event in Cloud Logging.
2. Prove a Backend alert incident and actual notification email receipt.

The email channel and policy wiring are PROVEN; actual email receipt is **NOT
YET**. No alert/failure injection or notification test occurred in OBS-D2A/B.
The later separate Human Gate and fresh-candidate preconditions are defined in
[Observability](./cloud-run-deployment-runbook.md#observability). Merging this
documentation later is expected to trigger automatic CD after successful main
CI; CD trigger rules are unchanged and no dispatch or approval occurs in OBS-D2B.

### Sensitive evidence retention

`/private/tmp/obs-d1-fresh-wre47nvq` remains retained. It contains the actual
notification destination in saved plan/JSON and must not be copied into docs,
logs or review output. Delete it only after this durable evidence is merged
**and** local saved-plan re-read is no longer required for audit. OBS-D2B neither
reads private values from that directory nor deletes it. The durable evidence
above does not require access to those private values.

### OBS-D2B offline documentation validation

| Closure check | Result |
| --- | --- |
| `git diff --check` | PASS |
| Existing relative-link validation | 224 PASS: 207 outgoing + 17 inbound |
| Existing anchor validation | 139 PASS |
| Existing added-content sensitive-pattern validation | PASS; 0 sensitive-pattern hits, 0 personal email addresses added |
| Current/Historical review | 34 local technical Markdown documents searched; 40 residual legacy-value matches classified as Historical; stale Current claims 0 |
| Completion and ownership preservation | Original Must requirements unchanged; current inventory exactly matches 42 source resource addresses; all prior 37 table rows retained |
| Historical proof preservation | C4D literal evidence identities retained; P2B and R1–R7 proof bodies unchanged; deployment/rollback command blocks unchanged |
| Scope | 10 documentation files only; application, Terraform desired state, workflow/CD and tests unchanged; no staged files |

These are local documentation checks, not fresh runtime verification or the
separate Fresh Result Audit. OBS-D2B performs no Terraform plan/apply/import,
GCP/runtime mutation, alert/failure/notification test, dispatch or production
approval. Commit/push/PR are NOT EXECUTED. Handoff: **READY_FOR_FRESH_RESULT_AUDIT**.

## OBS-B/C health and monitoring implementation

**Historical OBS-B/C source/offline checkpoint**, superseded for current runtime
by [OBS-D3F](#obs-d3f-final-observability-documentation-closure).
All NOT-YET statuses, state counts and production identities in this section
belong to the source-validation phase.

2026-09-22 source/offline verification, based on main
`518104a5c5c788b1f1e73de3e77b59024870d2a3`, branch
`feat/obs-health-monitoring`. OBS-A's design and the subsequent Human decision
authorize a Terraform-owned email channel. The real destination is supplied only
through the sensitive, no-default `monitoring_notification_email` variable at a
later Human plan/apply Gate. It is **stored in Terraform state**, an accepted
privacy tradeoff; it is not committed, returned in outputs or needed for mock tests.

| Source contract | Offline result / boundary |
| --- | --- |
| Backend health | GET `/health` returns exactly `{"status":"ok"}`; HEAD 200; POST/PUT/PATCH/DELETE 405. Routing precedes JSON/cookie/auth/application middleware; poisoned-body health tests prove zero Supabase calls |
| Failure logs | One JSON stderr line, fixed ERROR/server_failure, 16 finite operations (otherwise unknown_operation), finite error names and optional integer status 400–599; no arbitrary code/message/stack/request/dependency values |
| Public failures | One signup and seven note 500 responses no longer expose internal messages; fixed status/success/validation behavior retained, including weekly-summary validation.errors |
| Backend probes | HTTP `/health`:8080 startup 0/2/5/24 and liveness 0/2/30/3 (delay/timeout/period/failures); Frontend existing/default TCP unchanged |
| Configuration | Only old Backend TCP → exact approved HTTP probes is an allowed transition; capacity and manifest reject unrelated differences. Full actual spec configHash includes probes. Candidate health check does not change old-revision rollback smoke |
| Monitoring | Existing API import, email channel, Frontend HTTPS `/login` 200-only uptime, two-checker availability alert, service-wide Backend 5xx alert; no Cloud Run Terraform service or Logging API ownership change |

Runtime failure inventory: Backend handlers now use the shared logger. Expected
token rejection is not logged by the token utility; a caller returning 500 logs
once at its boundary. Normal startup info and build-time syntax-check output stay.
The only remaining `details` response is the safe weekly-summary validation list.
No notification address or privileged payload is introduced. The authUtils unit
mock drops its old virtual-module flag so importing the real Express app cannot
make installed-jsonwebtoken mock resolution depend on test order.

Validation used Node 24, Terraform 1.16.0 and locked google provider 7.45.0:

| Check | Result |
| --- | --- |
| Full root Jest (`npm test -- --runInBand`) | 49 suites / 435 tests PASS, including 13 Backend suites / 131 tests |
| Backend syntax build | PASS (34 runtime files) |
| Python unittest discovery, bytecode disabled | 159 PASS; real workflow semantics, provider-mocked HCL/graph and detection suites included |
| `npm run e2e:test` | 69 PASS; existing two-hop and cleanup contracts unchanged |
| Terraform fmt / validate / mock tests | PASS; existing IAM and new Monitoring contracts evaluated without applying/importing |
| actionlint 1.7.12 | ci.yml, cd.yml and candidate-e2e.yml PASS; workflow sources unchanged |
| Health/logger detection | 8 required / 8 detected / 8 semantic |
| CD/probe detection | 7 required / 7 detected / 7 semantic |
| Monitoring detection | 10 required / 10 detected / 10 semantic |
| Detection credit | 0 schema-only; 0 syntax/import/runtime-only; every valid-source mutant follows a passing baseline |
| Documentation validation | 197 relative links (165 outgoing / 32 inbound), 117 anchors PASS; diff whitespace and sensitive-pattern checks PASS |

Detection uses disposable copies and actual Jest handlers, Python candidate
contracts, or evaluated Terraform mock plans/dependency graphs. It covers removed
health isolation, unsafe log/response values, missing/arbitrary/ignored probes,
unrelated config allowance, hash omission, incorrect uptime/filter/threshold,
disconnected channel/API, a literal destination and added Cloud Run ownership.
Existing C4B 19/19 and C4C 6/6 semantic detection remain passing.
Thirty existing CD functions are AST-identical to baseline, including authority,
CI pinning, traffic parsing, CAS, Operation polling, promotion/rollback, existing
smoke, TTL rechecks and diagnostics. Build submission, E2E/cleanup implementation,
workflow permissions and production Environment source are unchanged. The eight
documentation updates correct source/runtime status and safe-error claims; the
C3 recovery document only updates its Current Must 3 remaining gap.

**Source-validation plan: AUDIT EVIDENCE ONLY, never apply.** A fresh normal-refresh,
normally locked plan at `2026-09-22T00:24:30Z` used only a synthetic destination from
the mock fixture. It reported **1 import / 4 add / 0 change / 0 destroy / 0 replace**.
The import is `workout-journal-506909/monitoring.googleapis.com`; the four additions
are the channel, uptime check and two policies. Existing resources remain no-op.
Plan SHA-256: `085d483ab1c81162234ce12f2ed7b5a5119f6882f629463338ba0884f5387a9c`.

Refresh reported Artifact Registry `update_time` and three existing project IAM
member `etag` changes. Both fields were independently verified in provider schema
as computed=true, optional=false, required=false; all four planned actions are
no-op. No unrelated semantic drift was found. At OBS-B/C, remote state stayed **37 resources,
serial 9**, lineage `66945691-ab92-e20a-4bc1-badb121e7ab4`, GCS generation
`1789947297225011`. Repeated pulls differed only in check_results ordering; the
state object was last updated `2026-09-20T23:34:57Z`, before this plan. The then-approved target was 42 resources; OBS-D1/D2A later applied and verified it.

At OBS-B/C, Monitoring was **NOT APPLIED**. Deployed health/probes/structured logs, uptime,
alert runtime and notification receipt were **NOT YET**. Must 3 was **In progress**;
Must 5 remained **Open**. C4D's **Must 4 Closed**, then-current production
`cd-35573153822-1`, and Historical C3/C4 evidence are preserved. A fresh merged-source
plan with the privately supplied real destination, exact Human apply approval,
separately approved deployment and notification receipt evidence were still needed at that checkpoint.
No runtime mutation, apply, dispatch, production approval, secret payload access,
Supabase mutation, commit, push or PR occurred in OBS-B/C.

Operational details: [Observability inspection/recovery](./cloud-run-deployment-runbook.md#observability),
[Terraform state privacy](../infra/terraform/README.md#obs-monitoring-applied-and-runtime-verified),
and [CD probe provenance](./cd-c1-candidate-delivery.md#obs-bc-probe-rollout-source-contract).
External behavior was checked against Google's [Cloud Run health checks](https://docs.cloud.google.com/run/docs/configuring/healthchecks),
[structured logging](https://docs.cloud.google.com/run/docs/logging#write-structured-logs),
[uptime alert example](https://docs.cloud.google.com/monitoring/alerts/policies-in-json#uptime-check-policy),
and [uptime region API](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.uptimeCheckConfigs#UptimeCheckRegion).

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
closed PE-P1C-01B and confirmed WIF `ACTIVE` / `disabled = false`; Must 4 was still
Open and production CD inactive at CD-B2. C4D now closes Must 4 with the full
automatic delivery proof below. The production Environment was separately
[configuration-verified](./portfolio-infra-ownership.md#production-environment-and-activation-dependency);
runtime deployment-approval integration was later exercised in C3G and the full
production path succeeded in C3V, not in P2B.

## CD-C3I Promotion Diagnostic Durability Validation

C3I starts from clean main `8ac592abcfeee607229fada3f5685e8c1630ddef` and fresh
GitHub main / activation read-backs (same SHA / UNCONFIGURED). The
[C3F/G/H incident record](./cd-c3-e2e-recovery-contract.md#c3f--c3g-incident-and-c3h-diagnosis)
preserves candidate delivery PASS, C3G promotion FAIL, actual previous-pair
restoration and post-rollback smoke PASS. **Technical root cause: NOT PROVEN.**
The original promotion GateError was lost after rollback; that independent Must
source defect was the sole C3I implementation target. At that Historical C3I
checkpoint, Must 3 was In progress, Must 4 Open and production CD inactive/fail-closed.

The [controller](../.github/scripts/cd_release.py) now retains separate allowlisted
promotion and rollback failure codes/stages in the step summary and a fixed-field
canonical stdout line. Existing pair evidence and top-level failure compatibility
are retained. Promotion, CAS, traffic comparisons, rollback, timing and
reconciliation behavior are unchanged. This is local source validation only;
no runtime remediation result is claimed.

Validation on 2026-09-19 uses installed Node 24.18.0 through a per-command PATH:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -q
actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml
git diff --check
```

Results: **94 Python tests PASS**, actionlint **1.7.12 PASS**, diff check PASS.
Actionlint was invoked from the existing local tool installation; no dependency
or host configuration was changed. All **52** relative documentation links/anchors
and changed-file credential-pattern inspection passed. AST comparison with the
baseline confirmed **29 existing functions/classes unchanged** and identical
promotion control flow after removing diagnostic assignments/capture; all **102**
existing fixed GateError codes are included in the diagnostic allowlist.
No browser E2E or unrelated
application build/test was run for this Python controller/docs change.

[`test_cd_diagnostics.py`](../.github/scripts/test_cd_diagnostics.py) injects
Backend post-update, Frontend precheck/update, post-deploy smoke, rollback
read/precheck/update/final-check/smoke failures, arbitrary exceptions and unlisted
GateError values. It checks both error identities, operation stages, restoration,
write order, success-path null diagnostics and stdout/stderr/summary safety.
The existing post-deploy rollback test is strengthened; partial/uncertain update,
external-change refusal, ETag and no-retry safety tests remain in force.

[`test_cd_diagnostic_detection.py`](../.github/scripts/test_cd_diagnostic_detection.py)
uses disposable offline copies, following the existing detection-test pattern.
Fresh detection after normal validation: **required 6; detected 6/6**, each by
semantic AssertionError, with no syntax/import/runtime-error credit:

| Wrong implementation | Detecting contract |
| --- | --- |
| Original promotion code replaced | Exact original code survives successful rollback |
| Stage always generic promotion | Exact Backend post-update stage |
| Rollback overwrites promotion failure | Original promotion code remains in the final record |
| Rollback failure code lost | Both distinct failures retained with their stages |
| Arbitrary exception text emitted | Fixed generic code and forbidden-marker exclusion across output/summary |
| Backend/Frontend stage reversed | Exact side-specific update stage assertions |

C3I implementation runtime mutation: **NONE**. No dispatch, rerun, activation/approval,
cloud write, secret access, Supabase, Terraform or IAM/WIF operation. The implementation
stage performed no commit, push or PR and stopped at **READY FOR FRESH RESULT AUDIT**. Diagnostic
runtime verification and the unknown technical root cause remain future work.

## CD-C3I Fresh Result Audit and Pre-PR

First Pass on 2026-09-19 completed **before edits, staging, commit, push or PR**:
**PASS — Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0** for C3I
source acceptance. Local main/HEAD/origin and freshly read remote main were
`8ac592abcfeee607229fada3f5685e8c1630ddef`; activation was UNCONFIGURED. The index
was empty, with exactly the reported eight files. Their sorted path + NUL +
content + NUL SHA-256 was
`58696d8a4c0dc7785c8fbcd262864203408c2362ab0ecd39347e7733f08a7341` and remained
unchanged throughout First Pass.

The auditor read Source Map/Core/Router/Review/Pre-PR Harness and compared actual
files with the exact GitHub baseline source. Fresh GitHub metadata confirmed
run `35421684166`, attempt 1: pre-production jobs succeeded, production failed;
required baseline CI `35421082860` succeeded. Only the fixed
`CD-C1: FAIL / promotion` line was extracted from the in-memory run-log archive.
Checks summary/text were both null. C3G/H traffic restoration and smoke remain
historical evidence; no cloud access or runtime probe was repeated.

Independent AST comparison confirmed unchanged existing control constants and
29 functions/classes, plus identical promotion operations, ordering and conditions
after removing only diagnostic capture. Recheck/CAS/smoke, timeouts, operation
polling, single PATCH behavior and safe reverse-order rollback remain unchanged.
All 102 current fixed codes survive normalization; arbitrary types, multiple
exception arguments and non-string payloads normalize safely. No source fix was
needed; post-First-Pass edits only record audit closure in the existing documents.

Fresh validation: **94 Python tests PASS; 6/6 mutants detected by semantic
AssertionError; actionlint 1.7.12 PASS; diff check PASS; 52 relative links/anchors
PASS** on the initial artifact. After recording this audit, the same checks passed
again with **53 links/anchors**. Added-content inspection found no credential
payload or runtime synthetic identity; the UUID-shaped addition is the public
Build ID and the email-shaped addition is an offline exception test marker.
Captured stdout/stderr/summary safety passed. New test files separate result/output
contracts from disposable-copy mutation detection; standard CI discovers both.

Pre-PR scope is the same eight files; runtime mutation is **NONE**. This audit
authorizes the requested branch/commit/push/PR workflow only. Human merge and
post-merge required CI precede any separate runtime Human Gate. Technical root
cause remains **NOT PROVEN**, new diagnostic runtime proof **NOT YET**, Must 3
**In progress**, Must 4 **Open**, and production CD **inactive/fail-closed**.

## CD-C3M Cloud Run API Failure Diagnostic Validation

Baseline: clean local `main`, HEAD and origin/main
`ba9ddf34b401355fa9ab98d87dec054ca4c8165f`. C3M reads repository source and saved
historical evidence only; it performs no fresh GitHub/cloud runtime read or mutation.
The earlier C3I sections above retain their historical implementation/audit status.

Historical [C3K run `35442981748`](https://github.com/tyosu131/Workout-Journal/actions/runs/35442981748)
passed candidate/E2E/cleanup/verify but failed production. C3I's durable fields
survived: top-level `RELEASE_NOT_VERIFIED`, promotion `RUN_API_FAILED` at
`backend-traffic-update`, rollback `HUMAN_DECISION_REQUIRED` with `RUN_API_FAILED`
at `backend-rollback-update`. Thus **C3I promotion/rollback diagnostic durability
is runtime proven for the observed failures**. C3K's underlying technical root
cause remains **NOT PROVEN**; C3M does not infer a historical HTTP status or cause.

The [C3M source contract](./cd-c1-candidate-delivery.md#c3k-incident-and-c3m-api-failure-diagnostics)
adds only allowlisted `runApiFailureKind` / `runApiFailureStage` to the safe log and
summary. The first Cloud Run API failure survives rollback and the generic final
exception. Existing failure code/stage meanings remain unchanged. Cloud Run HTTP
error responses are closed without reading bodies so resource warnings cannot
print their exception text; close failure cannot replace the original diagnosis.

Validation on 2026-09-19 used Node 24.18.0 through a per-command PATH and the
existing actionlint 1.7.12 binary; no dependency or host configuration was changed:

```bash
python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -v
actionlint
git diff --check
```

Results: **108 Python tests PASS**, actionlint **PASS**, diff check **PASS**.
[`test_cd_run_api_diagnostics.py`](../.github/scripts/test_cd_run_api_diagnostics.py)
runs real HTTP wrapper, Cloud Run wrapper, CAS update and promotion controller
code against mock transport. It covers HTTP 403, direct/wrapped timeout and
connection errors, invalid JSON/encoding, unknown exception, oversized response,
service GET (`OTHER`), PATCH and operation GET, first-failure retention during
rollback, pre-write/main capture, enum rejection, and unchanged non-Run errors.
Existing success/null-diagnostic and promotion/rollback ordering tests still pass.

Sensitive-marker assertions inspect **stdout, stderr and GITHUB_STEP_SUMMARY**;
HTTP exception messages, response/request markers, Authorization, token,
credential, URL and synthetic email fixtures are absent from public evidence.
Finalization and close-error paths are covered. Changed-content credential-pattern
inspection and relative documentation link/anchor validation also pass.

[`test_cd_run_api_detection.py`](../.github/scripts/test_cd_run_api_detection.py)
detects **8/8** independently mutated implementations in disposable offline copies.
Each fails a semantic assertion; syntax/import/runtime errors receive no credit:

| Mutation | Detecting assertion |
| --- | --- |
| Wrapper drops caller stage | Exact PATCH / OPERATION_GET stage in final evidence |
| Failure kind removed | Exact kind retained in safe log and summary |
| Raw exception printed | Captured output structure and forbidden-marker exclusion |
| Operation GET mislabeled PATCH | Distinct stage after successful PATCH |
| Timeout labeled CONNECTION | Direct and wrapped timeout both yield TIMEOUT |
| Rollback overwrites first API failure | Original kind/stage survives distinct rollback failure |
| Capture removed before generic promotion exception | API provenance survives RELEASE_NOT_VERIFIED |
| HTTP error response left open | Response closed without reading; no finalization warning |

The existing C3I **6/6** diagnostic mutations also remain detected. AST comparison
against the baseline confirms **27 existing functions/classes unchanged**. The
five modified functions (`http`, `cloud_run`, `cas_traffic`, `promote`, `main`) have
identical control flow after removing the new diagnostic handling/parameters;
request construction, body, headers and timeout are unchanged. Existing constants
are unchanged except the diagnostic field list. Behavioral tests additionally
verify Backend→Frontend promotion, Frontend→Backend rollback, zero retry, unchanged
PATCH count/ETag/traffic/tag targets, and the existing two-second poll interval.
No polling deadline, CAS, traffic logic, IAM/WIF or workflow changes were made.

Review scope is API failure provenance only. C3K root cause remains **NOT PROVEN**;
C3M API diagnostic runtime proof remains **NOT YET**. No browser E2E, cloud API,
Secret/Supabase access, dispatch, rerun, approval, traffic change, Terraform or
IAM/WIF operation was performed. Runtime mutation: **NONE**. No commit, push or PR.
Implementation stops at **READY FOR FRESH RESULT AUDIT**; this record does not
claim completion of that separate audit or successful production promotion.

## CD-C3P HTTP Status Diagnostic Validation

Historical source-validation record. Subsequent C3P runtime and C3R2 diagnosis
are recorded in [C3P / C3R2 evidence](./cd-c1-candidate-delivery.md#c3p-runtime-c3r2-authorization-proof-and-c3s-desired-state);
the NOT YET/PENDING classifications below describe that earlier phase.

Baseline: `5586ca9fafa7b9b42170cf261e49a9d24bdd8023`; required
[CI `35488494492`](https://github.com/tyosu131/Workout-Journal/actions/runs/35488494492)
SUCCESS was read back. Implementation branch: `fix/cd-c3p-http-status`, created
from that exact SHA with a clean working tree. Changes remain uncommitted for a
separate Fresh Result Audit.

[Historical C3N / C3O evidence and C3P contract](./cd-c1-candidate-delivery.md#c3n-runtime-evidence-c3o-diagnosis-and-c3p-http-status)
separate these conclusions: C3N runtime-proved `HTTP_STATUS / OPERATION_GET` for
run `35490314562`, but did not capture its HTTP integer; C3O root cause remains
**PENDING_EVIDENCE**, with exact historical effective permission UNKNOWN; C3P
adds numeric HTTP status in source only, **runtime NOT YET**. The prior C3M
validation section above remains a historical implementation record.

`runApiHttpStatus` retains only exact Python integers 400–599 from `HTTPError.code`.
All other values, including bool and all non-HTTP failure kinds, become null.
Constructor and capture both sanitize. Kind/stage/status belong to the same
first API failure; later rollback failures retain their separate existing
code/stage without replacing that first API diagnostic.

Offline validation on 2026-09-20:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -q
actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml
git diff --check
```

Results: **121 Python tests PASS**, including C3P **10/10**, existing C3M **8/8**
and C3I **6/6** semantic mutation detections; actionlint **1.7.12 PASS**.
The default PATH Node initially failed to start due to its missing shared
library. The successful run used the existing Node **24.18.0** through a per-command
PATH and the existing actionlint binary; no dependency or host configuration changed.

[`test_cd_run_api_diagnostics.py`](../.github/scripts/test_cd_run_api_diagnostics.py)
independently tests 403, 404, 409, 429, 500 and 503 through the real controller
with mock transport, plus accepted endpoints 400/599. PATCH 409 and successful
PATCH followed by Operation GET 403 preserve exact stage/status. Promotion
Operation GET 403 followed by rollback Operation GET 500 retains 403 and the
existing rollback failure code/stage; a distinct rollback PATCH stage is also
covered. A first timeout retains null even after a later HTTP failure.

Invalid inputs `True`, `False`, `"403"`, `403.0`, `399`, `600` and `None` yield
null at the wrapper, constructor and capture boundaries. Timeout, connection,
JSON parse and unknown failure paths retain null. Success retains null diagnostics.
Leakage assertions cover stdout, stderr, GITHUB_STEP_SUMMARY and canonical
diagnostic JSON with synthetic secret/token/credential/URL/reason/header/body
markers. HTTPError bodies remain unread and are closed; close failures and
finalization cannot publish raw exceptions.

[`test_cd_run_api_detection.py`](../.github/scripts/test_cd_run_api_detection.py)
adds ten disposable-source mutants covering all eight required categories:

| Mutation category | Variants / semantic detection |
| --- | --- |
| Status field removed | Fixed public JSON field assertion |
| Constant 403 | Other independent HTTP integers must remain exact |
| Stage/status provenance mixed | PATCH 409 and Operation GET 403 must retain their own status |
| Rollback overwrites only status | First 403 survives later 500 with kind/stage unchanged |
| Non-HTTP status retained | Separate constructor and altered-attribute capture mutants |
| Bool accepted | Explicit null assertions for both boolean values |
| Out-of-range integer accepted | Null assertions for 399/600 |
| Raw exception/body leaked | Separate exception-print and body-read/print mutants |

Every mutant compiles and fails semantic assertions; syntax/import/runtime errors
receive no detection credit. Final test output contains no private fixture markers
or ResourceWarning. Changed-content credential-pattern inspection, relative docs
links/anchors and diff checks pass.

AST comparison with the exact baseline found **32 existing definitions unchanged**.
The four changed definitions (`RunApiFailure`, `capture_run_api_failure`, `http`,
`promote`) match after removing only status handling. `cas_traffic`, `recheck`,
`expected_traffic`, `cloud_run` and `main` are unchanged. Promotion including its
rollback path differs only in diagnostic initialization. Request construction,
headers/body/authentication, PATCH count, retry, sleep, polling/deadline, CAS,
traffic destinations and Backend→Frontend / Frontend→Backend ordering are unchanged.
Workflow YAML, IAM/WIF and Terraform are unchanged.

Runtime mutation **NONE**; no dispatch, rerun, approval, Cloud Run/IAM mutation,
Terraform apply, Secret access, Supabase mutation or activation creation.
No commit, push or PR. This implementation stops at **READY FOR FRESH RESULT AUDIT**;
it does not claim that the separate audit or production runtime verification passed.

## CD-C3S Least-Privilege IAM Validation

Historical source-validation record. Its 35-resource / apply-NOT-YET statements
describe C3S before merge and are preserved below. At C3U, state was **37 resources**
after C3U; remediation is runtime PROVEN and C3V production succeeded. See
[C3W closure verification](#cd-c3w-runtime-closure-documentation-validation).

Authority: main / HEAD / `origin/main`
`e922feab245546fb308621782dc7d067eb469833`, required CI `35495319133` SUCCESS.
Implementation branch: `fix/cd-c3s-operation-iam`, started clean from that SHA.
The [C3P / C3R2 evidence](./cd-c1-candidate-delivery.md#c3p-runtime-c3r2-authorization-proof-and-c3s-desired-state)
owns **403 / OPERATION_GET runtime PROVEN**, **current missing effective allow
PROVEN**, and **historical root cause STRONGLY_SUPPORTED_NOT_PROVEN**.

C3S adds only a project custom role containing `run.operations.get` and an
additive Deploy SA project IAM member. [Design comparison and eligibility](../infra/terraform/README.md#cd-c3s-operation-iam-applied-and-runtime-verified)
record why broader project Developer/Viewer roles were rejected. Existing
service-level Developer grants and all CD controller/workflow behavior remain
unchanged. `ci.yml` only adds Terraform `1.16.0` and backend-disabled initialization
of the locked Google `7.45.0` provider so the existing Python discovery runs the
new tests without cloud credentials or a backend connection.

Validation on 2026-09-20:

```bash
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -q
actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml
git diff --check
```

Results: **123 Python tests PASS**, Terraform fmt/validate PASS, actionlint
**1.7.12 PASS**. The existing Node `24.18.0` was selected through per-command PATH;
no dependency or host configuration was changed.

[`test_cd_operation_iam.py`](../.github/scripts/test_cd_operation_iam.py) evaluates
the actual Terraform HCL using a Google mock provider and plan-only test runs in
disposable roots without backend/import blocks. It inspects evaluated permission
sets, principals, resource scopes and all project IAM grants; it does not merely
check that new source strings exist. Both service grants must remain present.

The initial implementation's **16/16 mutants were detected: 15 by semantic
assertions and 1 at schema level**: permission removal;
operation list/delete or unrelated Run permission addition; substitution with
project Developer/Admin; wrong principal; wrong custom-role/member project;
authoritative project binding/policy; removal of either service grant; and extra
project Developer/Admin/Viewer grants. The empty permission set is rejected by
the locked provider's minimum-item schema validation; the other 15 produce
plans rejected by contract assertions. Syntax/plugin failures receive no credit.

The Fresh Result Audit identified a missing CI assertion: replacing the custom
role reference with its correct literal name preserved evaluated IAM values but
removed Terraform's creation dependency. The tests now also inspect Terraform's
dependency graph and include that regression case: **17 mutants, comprising 16
semantic assertion cases and 1 schema-level case**. Graph/startup failures are
errors, not mutation-detection credit. The actual IAM source retains the `.name`
reference and required implicit ordering.

Backend preflight confirmed the dedicated GCS bucket/project/location, uniform
bucket-level access, public-access prevention and versioning, workspace `default`,
and remote state **35 resources / serial 8**. No secret-version resource exists.
The saved plan at **2026-09-20T08:59:48Z** used normal locking, `-lock-timeout=60s`,
default refresh, `-input=false`, `-detailed-exitcode` and `-out`; exit **2**.
Plan JSON machine verification through `assert_saved_plan` passed:

- exactly two `create` actions, only
  `google_project_iam_custom_role.deploy_run_operation_reader` and
  `google_project_iam_member.deploy_run_operation_reader`;
- all 35 existing resources and outputs no-op; zero update/delete/replace/import;
- permissions exactly `["run.operations.get"]`, exact Deploy SA and project;
- member role expression references the new custom role's `.name`. That value is
  computed until apply; project/role ID, dependency and the mock-evaluated role
  name agree on `projects/workout-journal-506909/roles/workoutJournalRunOperationReader`.

`resource_drift` has **one** refresh-only entry:
`google_artifact_registry_repository.workout_journal.update_time`, from
`2026-09-06T02:50:20.126882Z` to `2026-09-20T07:17:50.427208Z`. The locked provider
schema confirms `computed=true / optional=false / required=false`; no other
attribute changed and the planned action is no-op. This follows the existing
computed-only drift rule; **semantic unrelated drift: NONE**. It is not described
as zero refresh drift, and `-refresh=false` was not used.

**At C3S validation: remote state 35; planned +2. Apply NOT YET. C3S runtime NOT YET.**
Saved plans remain local, ignored source-validation evidence. **No C3S saved
plan may be applied after commit, PR or merge.** A future apply must use merged
exact source, fresh current remote state and a new saved plan approved through
a separate Human Gate.
Policy Troubleshooter remains enabled outside Terraform; C3S API mutation is 0
and cleanup/codification is deferred. Runtime mutation **NONE**: no apply, IAM,
Cloud Run, release/approval/rerun, activation, Secret payload or Supabase operation.
No commit, push or PR. Stop at **READY FOR FRESH RESULT AUDIT**, then require a
separate Human-gated apply and control/Operation authorization proof before release.

## CD-C3W Runtime Closure Documentation Validation

On 2026-09-21, C3W applied the current Source Map, Core Harness and Workflow Router
to documentation closure only. Local preflight was clean `main`; HEAD and
`origin/main` were `cc608aa5f2edbd81952024d497bdc5838b796599`. Fresh GitHub reads
confirmed main at that SHA, required CI `35507087914` SUCCESS / attempt 1 and
release `35545739898` SUCCESS / attempt 1 / workflow_dispatch / exact source.
All five release jobs, including production, were SUCCESS. Activation GET
returned HTTP 404 / UNCONFIGURED.

Fresh GCP metadata reads independently confirmed Build
`cebec13a-f307-43f9-95d6-3071b83dcadb` SUCCESS with exact source and digests,
the `cd-35545739898-1` revision pair at 100% each, the previous production pair at
0%, and the Frontend's exact immutable Backend tagged URL. Policy Troubleshooter
API remains enabled and outside Terraform ownership. No Secret payload was read.

The [durable C3U/C3V closure record](./cd-c1-candidate-delivery.md#c3u-and-c3v-runtime-closure)
contains all identifiers, digests, the owner-supplied C3V safe E2E/cleanup/hash and
post-deploy diagnostic, and retained C3U apply/state/authorization evidence.
C3W did not download raw job logs or rerun E2E, Terraform or Troubleshooter.
The evidence classes are explicit: fresh read-back, retained runtime proof and
owner-supplied safe release evidence.

Current classifications: **C3 runtime chain CLOSED; C3S runtime PROVEN;
authorization defect CLOSED; historical C3N/C3P root cause
STRONGLY_SUPPORTED_NOT_PROVEN; C3V production SUCCESS; Must 4 OPEN for automatic main-merge + required-CI-success
triggering**. C3G/C3K root causes remain Historical / NOT PROVEN. Prior 30/35-resource
and NOT-YET source-validation records are not rewritten as historical mistakes.
Rollback restoration, diagnostic and permission evidence remain separate;
no C3V rollback is claimed. Monitoring/alert scope and other Portfolio Musts are unchanged.

Documentation validation **PASS**: `git diff --check`; 122 outgoing relative
links plus 9 inbound references from other documents; 78 anchors checked with
zero broken targets; added-text credential-pattern inspection with zero matches;
full diff/scope review confirming only 9 Markdown files, unstaged. The Terraform
managed-resource table has exactly 37 rows. Byte comparisons against HEAD preserve
the canonical R1–R7 history, C3K/C3N diagnostics, C3F/G/H evidence, C3A/D and recovery
contract, P2A/P2B and CD-B2 runtime evidence, Portfolio Must conditions/non-goals, and
deployment/rollback command contracts.

No dedicated docs validator is configured in repository scripts/CI; standard-library
checks introduced no repository tooling. Application tests/build and Terraform
commands are unnecessary for these Markdown-only changes.

Runtime mutation **NONE**; application/workflow/script/Terraform desired-state
mutation **NONE**. No commit, push or PR. Handoff stops at
**READY FOR FRESH RESULT AUDIT**, without claiming that separate audit has passed.

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
0%, production 100%; at that Historical C3D checkpoint, Must 3 was In progress
and Must 4 Open.

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
the isolated proof; it did not prove the full release delivery path. At R9, Must 3 was
**In progress** (monitoring/alert resources deferred to Must 5 design), Must 4
**Open** (full delivery runtime proof, automatic triggering and production
activation). Production CD was **inactive**; R9 read back `CD_C1_ACTIVATION`
**UNCONFIGURED**. No R9 cloud state read-back is claimed. The later C3W record
above supersedes those remaining-runtime-proof statements.

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
rollback runtime proofs required separate Human Gates at that checkpoint. The
later C3W closure records the executed manual release evidence; at that checkpoint,
Must 3 stayed In progress and Must 4 Open for automatic triggering. C4D closes the
latter gap. The existing required CI job runs both offline test
commands; its check name is unchanged. These tests never authenticate to Google
or Supabase.

## Test Candidates

- Expand coverage for `shared/utils/calendarUtils.ts` and `shared/utils/validationUtils.ts`.
- Add DB-backed/custom exercise catalog exploration, expanded effort trend charts if needed, optional weekly summary persistence/cache design, and external AI integration only after core analytics signals and the mocked frontend/backend flow are stable.
- Expand API client tests for retry limits and non-401 error paths.
- Expand route/service tests for notes and auth Supabase success/error paths.
- Resolve or document the remaining Google Fonts download warning if the build environment cannot reach Google Fonts.
- Add backend unit tests or integration tests; the current backend build checks syntax only.

## CD-C4B Automatic Trigger Offline Validation

On 2026-09-21, Source Map / Core Harness / Workflow Router were applied to the
High-risk implementation. The clean starting branch was `docs/cd-c3w-runtime-closure`,
HEAD `db6169d287c01561a6350a1f5ffa4398e30e141e`. Fetch, switch to main and fast-forward
normalization established exact baseline `e9fed298821cc3e729ef7a481ef24305b8ff8510`;
remote main and [required CI 35550903984](https://github.com/tyosu131/Workout-Journal/actions/runs/35550903984)
were freshly read as exact SHA / push / SUCCESS / attempt 1. Implementation branch:
`feat/cd-c4b-automatic-trigger`. No commit, push, PR or runtime operation was executed.

The [authority contract](./cd-c1-candidate-delivery.md#activation-and-source-authority)
now supports qualified `workflow_run` plus both manual routes. Actual event JSON,
REST CI workflow identity and fixed attempt-specific required job are independently
validated; normalized outputs bind every release checkout and E2E invocation.
Manifest v2 retains e2eIdentityVersion 2 and now requires `run.ciRunAttempt`.
Automatic version metadata is exactly `1`; manual activation/input remain required.
Production Environment approval and stale-source rejection remain mandatory.

Offline commands/results (Node 24; no hosted browser scenario; results below include
the Fresh Result Audit fix):

| Check | Result |
| --- | --- |
| `PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s .github/scripts -p 'test_*.py' -q` | **148 tests PASS** |
| `npm run e2e:test` | TypeScript contract compilation + **66 Node tests PASS** |
| `actionlint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/candidate-e2e.yml` | **PASS**, existing actionlint 1.7.12 |
| Parsed workflow graph | Trigger, qualification, exact checkouts/outputs, reusable modes, least privilege, Environment dependencies and pre-approval command boundaries PASS |
| C4B independent detection mutants | **19 required / 19 detected; 19 semantic assertion detections / 0 schema-only** |
| `git diff --check` | **PASS** |
| Existing local Markdown link/anchor inspection | **139 links PASS** (130 outgoing + 9 inbound), **87 anchors PASS** |
| Added-content sensitive-pattern inspection | **PASS**, including the two new test files; no credential payloads |

The initial default Node binary could not load a local library; validation used
repository-required Node 24. The existing Terraform IAM tests use isolated temporary
roots, mock provider and plan-only execution. Their provider process was sandbox-blocked;
the successful full suite ran outside that restriction without credentials, remote
state, cloud API or apply. No Terraform source/provider upgrade was performed.

C4B mutation coverage uses disposable source copies. Every row below is a semantic
mutation, detected by the stated assertion: **semantic YES / detected YES /
syntax-import-runtime-error-only NO** for each of the 19. The harness requires
`AssertionError` and `FAILED (failures=...)` without test errors; Python mutants also
compile before execution. No schema-only rejection is counted.

| Independent mutant | Specific detection assertion |
| --- | --- |
| Remove successful conclusion | Failed event must raise before API/cloud |
| Allow upstream PR | PR event must raise before API/cloud |
| Remove main branch requirement | Feature event must raise before API/cloud |
| Remove current-main equality | Stale preflight/candidate/promotion must raise before API/cloud/traffic |
| Checkout main instead of S | Parsed candidate/verify/production refs must equal preflight source |
| Remove CI workflow-ID verification | Wrong REST workflow ID must raise |
| Reselect CI in later phases | No workflow-run discovery endpoint may be called |
| Ignore CI attempt mismatch | Changed REST attempt must raise |
| Accept automatic latest | Non-numeric automatic constant must raise |
| Bypass manual activation | Missing/unapproved activation must raise |
| Remove production Environment | Parsed production Environment must equal `production` |
| Promote in candidate job | Candidate commands must remain prepare/candidate only |
| Drop CI attempt from producer | Produced `ciRunAttempt` must equal `1`, with schema validator stubbed |
| Allow workflow SHA different from source | Mismatched environment SHA must raise |
| Remove YAML success guard | Parsed job guard must reject failed/cancelled/skipped completion |
| Give invalid event the shared pending slot | Parsed concurrency result must equal isolated CD run ID |
| Remove reusable exact caller guard | Parsed E2E guard must reject another caller in both release modes |
| Remove reusable pre-auth step | Exactly one mandatory preflight must precede auth |
| Skip reusable preflight validation | CLI preflight must fail for unbound caller/metadata/hash |

Positive/negative contracts additionally cover cancelled/skipped/failed CI, wrong
repository/head repository/owner, workflow name/path, malformed/missing event JSON
fields, invalid SHA/IDs/attempts, payload/API mismatch, required job missing/failed/
wrong source, exact automatic secret version, preserved isolated WIF proof and both
manual release activation outcomes. Node validation independently rejects missing
CI attempt and cross-event/source metadata; the detection count above is not inflated
by these schema tests.

Behavior comparison against the exact baseline used Python ASTs. All 27 unchanged
CD helper functions match, including traffic parsing, service/configuration reads,
CAS and operation polling, smoke, hashing and diagnostics. Candidate code matches
after only authority-handoff normalization. The complete promotion/rollback body
after the authority guard is unchanged: Backend then Frontend promotion, Frontend
then Backend rollback, no changed retry behavior. Shared Build prepare/prove bodies
after context selection are identical; their existing source cleanliness, public
configuration and build-config hash guards remain. E2E controller, exact secret read,
private result transport and cleanup logic are unchanged. Child authority metadata
is added; the audit fix also runs the existing manifest/source checks before E2E
authentication and repeats them before secret access. The controller body after
credential validation and its failure handling match baseline ASTs exactly.
WIF proof changes only its internal normalized mode constant.
TTL remains 3,600,000 ms. No application or frontend/backend dependency changed,
so unrelated application builds/tests were not repeated.

The four canonical CD/completion/verification/runbook docs were updated, with minimal
Current cross-reference corrections in E2E, WIF, recovery and infrastructure docs.
Historical C3 evidence, P2B/R8 proof scope and 30/35-resource snapshots remain historical.
At C4B source validation, production remained the C3V pair from prior runtime evidence, Terraform 37,
C3 runtime chain CLOSED, current authorization defect CLOSED; historical C3N/C3P
root cause remains STRONGLY_SUPPORTED_NOT_PROVEN and C3G/C3K NOT PROVEN.

**Must 4 OPEN; source IMPLEMENTED / offline verified; automatic runtime NOT YET.**
Later acceptance needs reviewed merge, successful main required CI, causally linked
automatic CD run with fixed CI attempt/source, actual OIDC/WIF and Build/candidate/
E2E/verify success, production waiting, separate Human approval, promotion/post-deploy
verification and docs closure. No forced failed main CI or production failure is
required; negative contracts are offline and PR non-trigger behavior can be observed
without dispatch.

### C4B Fresh Result Audit

The read-only First Pass independently reproduced 144 Python tests, 66 Node tests,
16 semantic detections, actionlint, 139 links and 87 anchors. Remote main and baseline
CI matched the implementation authority. The attempt-specific GitHub jobs response
also confirmed actual `head_sha`, `run_id` and `run_attempt` fields; mocks were not
the sole evidence. Main protection and the production Environment reviewer were
read back without changes. The reviewed scope was 25 unstaged files, with no CI
workflow, Terraform desired-state or application change.

**First Pass: Must 1 / Should 0 / Pending Evidence 0 / Decision Needed 0.** M1:
the reusable E2E guard admitted an unrelated caller, while Python caller/manifest/
source validation ran after `google-github-actions/auth`. The existing WIF provider
would reject that caller and the controller would reject before secret access;
this did not demonstrate a secret-access bypass. It nevertheless violated the
required validation-before-OIDC ordering.

Only M1 was fixed after First Pass: an exact CD caller guard plus a credential-free
`candidate_e2e.py preflight` step before Google authentication. It validates the
actual event, manifest/hash, source and fixed CI inputs, then reads current main;
the trusted caller already performed the REST CI/job verification. Normal execution
repeats the checks before secret access. Four regression tests and three independent
mutants cover both modes, forged metadata/caller, stale main and removal/bypass of
the pre-auth gate. No new permissions, runtime operations or secret reads were used.

After the fix, the full validation above passed: 148 Python tests, 66 Node tests,
19 semantic detections and no schema-only detections. Final findings are
**Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**. Fresh Result Audit:
**PASS — MERGE_READY** for source review only; automatic runtime remains NOT YET.
Commit, push, PR, merge and runtime verification remain separate gates.

## CD-C4C Nested E2E Authority Propagation

On 2026-09-21, Source Map / Core Harness / Workflow Router were applied to this
source-only remediation. Remote main was freshly confirmed at
`719b22f246ed63f5512e9efff6773e6309dc0ad1`; CI `35557808342` was SUCCESS, push/main,
attempt 1, exact SHA. The clean prior implementation tree was identical to this
merge tree; fetch and branch creation established
`fix/cd-c4c-nested-e2e-authority` on the actual merged commit without reset/rebase.

[CD run 35557989507](https://github.com/tyosu131/Workout-Journal/actions/runs/35557989507)
was independently read as workflow_run, attempt 1, exact source, FAILURE. Its
preflight/candidate and reusable E2E pre-auth/authentication steps succeeded.
The safe E2E JSON was reacquired without publishing raw logs: SCENARIO_FAILED,
FAIL, eight NOT_RUN steps, HTTPS cookie false, receipt PERSISTED, cleanup
PROVEN_ZERO with all four counts 0, evidence PASS. Verify/production were skipped.
Read-only Cloud Run traffic confirmed C3V pair `cd-35545739898-1` at 100% each and
failed pair `cd-35557989507-1` at 0%. No recovery action was needed or executed.

The [C4C diagnosis](./cd-c1-candidate-delivery.md#c4c-nested-playwright-authority-remediation)
is PROVEN by source and semantic reproduction. The Python selector forwards five
normalized fields that the nested Node launcher dropped. Real `browserBase`/
`bindWorkflow` rejects the missing identity during Playwright config loading.
Before changing production source, the new two-hop test failed in both manual and
automatic modes with `Playwright hop: CD_MODE` (undefined). After adding only the
five field names to the existing allowlist, both modes pass real Playwright
`--list` discovery (one test, one file), without running a browser or hosted scenario.

`candidate-authority.test.mjs` executes the actual Python `child_environment` and
actual Node controller with external I/O adapters. It inspects the environment
passed to Playwright, validates the real private manifest/hash, and checks exact
equality of all 13 identity values across both hops. Every new field's omission
and mutation is rejected; wrong source, CI attempt and event/mode remain rejected.
Private canaries are independently injected before each boundary. GH_TOKEN,
Google credential paths, impersonation, Authorization and privileged Supabase/E2E
values are absent from the captured browser environment. Existing synthetic-user
login inputs are unchanged.

Detection force: **6 required / 6 detected / 6 semantic / 0 schema-only**. One mutant
removes all five propagated fields (the production defect); five remove one field
each. Every mutated controller reaches the intercepted launcher without import or
syntax failure, fails an exact-value semantic assertion, rejects real child
authority and reproduces SCENARIO_FAILED / eight NOT_RUN / cleanup PROVEN_ZERO.
Schema rejection alone is not counted. Existing C4B detection remains **19/19
semantic**, including the separate outer pre-auth M1 boundary.

| Check | C4C result |
| --- | --- |
| Full Python unittest discovery | **148 PASS**, including workflow semantics and C4B detection |
| `npm run e2e:test` | TypeScript check + **69 PASS**, including two-hop discovery and six mutants |
| actionlint on CI/CD/reusable E2E | **PASS** |
| `git diff --check` | **PASS** |
| Existing relative-link/anchor checks | **144 links PASS** (135 outgoing + 9 inbound), **92 anchors PASS** |
| Added-content sensitive-pattern inspection | **PASS**, including the new test; no credential payloads |

Only `candidate-run.mjs` changes execution behavior: direct copying of public
metadata, no credential inheritance and no new helper/authority inference.
Removing that allowlist addition reproduces the baseline launcher bytes. Python
controllers, workflows (including M1), manifest validators/schema, Build/readiness,
user ownership/cleanup, TTL/CAS/polling, promotion/rollback and diagnostics remain
byte-identical to merged C4B. No application or Terraform desired-state changes.
The three canonical docs record this result; six additional Current summaries
had stale automatic-WIF/trigger NOT-YET claims and receive only status corrections.
Historical C3/P2B/R8 and dated C4B source-only evidence retain their phase scope.

**Must 4 OPEN; automatic runtime PARTIAL — trigger through E2E WIF PROVEN; full
E2E/release NOT YET.** The fix is offline verified only. A later approved merge
must create fresh main CI, automatic CD and a new candidate ID. C4C performed no
commit/push/PR, dispatch, rerun, approval, secret payload access or runtime mutation.

## CD-C4D Automatic Delivery Runtime Verification

**Historical C4D proof, 2026-09-21.** Production, Terraform and Must status
statements in this section describe that checkpoint. Current production is owned by [OBS-D3F](#obs-d3f-final-observability-documentation-closure);
Monitoring apply/no-drift evidence remains in [OBS-D2A/B](#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure).

Recorded 2026-09-21. **Must 4 Closed; remaining gap None.** This is fresh read-only
verification of an already successful release, followed by documentation closure.
The exact requirement mapping, job IDs, digests and sanitized diagnostic are owned
by [C4D canonical delivery evidence](cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure).
The [Completion Evidence Matrix](portfolio-completion-contract.md#5-completion-evidence-matrix)
closes only Must 4. Earlier C4B/C4C sections above remain Historical checkpoints;
their failed run and then-pending runtime proof are not rewritten.

The clean repository was fast-forwarded to `main` at
`03f45f3b7ba2d48040cffcb2130318717a1e9d09`; HEAD, origin/main and freshly read remote
main matched before documentation edits. Read-only GitHub API evidence established:

| Evidence source | Independently observed result |
| --- | --- |
| `repos/tyosu131/Workout-Journal/pulls/114` | Merged; merge SHA `03f45f3b7ba2d48040cffcb2130318717a1e9d09` |
| `actions/runs/35572912520` | CI workflow ID `286209592`, `.github/workflows/ci.yml`, push/main, exact merge SHA, attempt 1, completed/success |
| CI attempt-specific jobs | `Lint, build, and test baseline`, job `106248199139`, completed/success, exact merge SHA |
| `actions/runs/35573153822` | `.github/workflows/cd.yml`, workflow_run/main, exact merge SHA, attempt 1, completed/success |
| CD jobs | preflight, candidate, candidate-e2e / e2e, verify-candidate, production all SUCCESS; three proof-only jobs SKIPPED |
| `actions/runs/35573153822/approvals` | `approved` by `tyosu131` (User), Environment `production`, ID `21297410440` |
| `actions/variables/CD_C1_ACTIVATION` | HTTP 404 / UNCONFIGURED |

The run and job paths above are relative to `repos/tyosu131/Workout-Journal/`.
Required-job evidence used `actions/runs/35572912520/attempts/1/jobs`; CD job
evidence used `actions/runs/35573153822/jobs`. Safe fields were parsed from
`gh run view 35573153822 --repo tyosu131/Workout-Journal --job <job-id> --log`
for candidate, E2E, verify and production only. Raw logs, credentials and browser
login inputs are not reproduced here.

The preflight authority consumed downstream is `automatic-release`, source
`03f45f3b7ba2d48040cffcb2130318717a1e9d09`, CI `35572912520`, attempt `1`, E2E version
metadata `1`. Identical manifests across E2E/verify/production record CD ID
`35573153822`, attempt `1`, event `workflow_run`, fixed CI ID/attempt and the exact
CD workflow SHA. Source SHA = Build source SHA = workflow SHA = CI/CD head SHA =
main: **PASS**. This verifies the causal link independently of workflow timing.

Build `b53e2ad8-8e66-4f98-a3f6-f4a380f383c8` is SUCCESS. Manifest capture at
`2026-09-21T07:36:34.512431+00:00` recorded new candidate `cd-35573153822-1` at 0% on
both services and previous C3V production `cd-35545739898-1` at 100% each.
Verify SUCCESS preserved that pair before production. E2E returned **8/8 PASS**
(login, tag-create, note-create-save-read, tag-use, Calendar, Analytics, tag-delete,
logout), HTTPS cookie true, receipt PERSISTED, evidence PASS and cleanup
auth/users/notes/user_tags `0/0/0/0` / PROVEN_ZERO.

Manifest and E2E hash both equal
`7048471087a6f88173106dd853186e30b66c216d0cd7f23d7bed29d8c62948df`;
the parsed canonical manifest also independently hashes to that value. Production
Environment approval is supported by the approved Human review above and exact
workflow `environment: production`, not an empty pending-deployment list.
Backend then Frontend promotion passed. The production diagnostic is
`CD-C1: PASS / post-deploy-verification`, with all failure fields and rollback null.
No new successful rollback event is claimed.

Fresh GCP reads used project `workout-journal-506909`, region `asia-northeast1`:

```bash
gcloud run services describe <service> \
  --project=workout-journal-506909 --region=asia-northeast1 \
  --format='json(status.traffic)'
gcloud run revisions describe <current-revision> \
  --project=workout-journal-506909 --region=asia-northeast1 \
  --format='json(metadata.name,status.imageDigest)'
```

Both `workout-journal-backend-cd-35573153822-1` and
`workout-journal-frontend-cd-35573153822-1` have **100%** traffic. The previous C3V
pair and failed C4B pair `cd-35557989507-1` have **0% / 0%**. Fresh revision digests
match the manifest: Backend
`sha256:3b35f794badf0ffe0efff96aa681a8cbf2115ca0ffc95ad67ede40087eabc047`, Frontend
`sha256:5cdc518627ba9415b7312352d1b9802369613fbf99fcbd5e68b00e5d5478cd56`.
Frontend environment names were inspected first; after verifying that the sole
entry was `BACKEND_INTERNAL_URL`, only that non-secret value was read:
`https://cd-35573153822-1---workout-journal-backend-cpbzb7lqza-an.a.run.app`.
It equals the manifest pairing. No secret environment value or Secret Manager
payload was accessed.

**C4C source remediation PROVEN; runtime remediation PROVEN.** The fresh automatic
run passed the previously failing Playwright boundary and the full production
path. C4B failure `35557989507`, its PROVEN propagation root cause and cleanup
PROVEN_ZERO remain Historical evidence. C3 classifications and bounded rollback
evidence are preserved. Other Must statuses and Terraform's 37-resource C3U
evidence are unchanged; no new Terraform-state verification is claimed here.

C4D changed documentation only. No application/workflow/controller/E2E/Terraform
desired-state change, runtime mutation, dispatch, rerun, approval, variable
mutation, secret payload access, commit, push or PR occurred in this phase.
Fresh Result Audit remains the next gate.

| C4D documentation validation | Result |
| --- | --- |
| `git diff --check` | PASS |
| Existing relative-link checks | 148 PASS: 139 outgoing + 9 inbound |
| Existing anchor checks | 96 PASS |
| Added-content sensitive-pattern inspection | PASS; no credential payloads |
| Current/Historical contradiction review | Stale Current claims 0; Historical phase values retained |
| Scope and index | Nine documentation files only; no staged files |

The original Must requirements, major Historical proof sections, P2B/R8 scope,
deployment/rollback command contracts and 37-row Terraform resource table were
checked for preservation. C4D does not rerun application or workflow implementation
tests for this documentation-only change.
