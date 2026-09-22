# CD-C3: candidate incident and E2E recovery contract

Current status (PF-F1, 2026-09-22): **C3 runtime chain CLOSED; authorization defect CLOSED;
Must 4 Closed; `CD_C1_ACTIVATION` UNCONFIGURED**. The current production pair is
`cd-35737278328-1`, each at 100%, freshly read back in [PF-F1](./portfolio-finalization.md#current-production).
Must 3 and Must 5 are Closed; safe structured failure runtime, Backend incident
OPEN/CLOSED and Human firing/recovery email delivery are PROVEN. OBS-D2A's
`cd-35675050740-1` remains Historical previous-production evidence. The Historical [C4D closure](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure)
records automatic CI/CD, E2E 8/8 PASS, PROVEN_ZERO cleanup, Human production approval
and post-deploy PASS. The previous C3V and failed C4B pairs remain 0%.
[C4C](./cd-c1-candidate-delivery.md#c4c-nested-playwright-authority-remediation)
preserves the earlier nested metadata failure and its now runtime-proven fix.
No recovery mutation is required. Recovery/cleanup semantics and historical
classifications below are unchanged.
Isolated WIF remains
[R8 CLOSED / PASS](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure).
CD-C3C source remediation is merged via [PR #106](https://github.com/tyosu131/Workout-Journal/pull/106)
at main `a332289c95b846aed10c6f9d31c9339e7fc279ed`; required post-merge
[CI run 35418949564](https://github.com/tyosu131/Workout-Journal/actions/runs/35418949564)
passed. C3D separately closed current historical-run residual uncertainty:
**HISTORICAL_RESIDUAL_PROVEN_ZERO under verified current schema contract**.
C3F subsequently proved the C3C successful candidate/E2E/cleanup path at runtime.
C3G restored the previous production pair after promotion failed; the technical
root cause remains **NOT PROVEN**. Later
[C3K evidence and C3M API provenance](./cd-c1-candidate-delivery.md#c3k-incident-and-c3m-api-failure-diagnostics)
runtime-prove C3I's observed promotion/rollback failure diagnostics. C3K root cause
remains **NOT PROVEN**. Later [C3N / C3O / C3P evidence](./cd-c1-candidate-delivery.md#c3n-runtime-evidence-c3o-diagnosis-and-c3p-http-status)
runtime-proves C3M's observed `HTTP_STATUS / OPERATION_GET` classification; C3N's
HTTP integer was not captured. At C3O, root cause was PENDING_EVIDENCE. Subsequent
C3P proved numeric 403 and C3R2 proved missing effective allow. C3U applied only
`run.operations.get` and verified both exact Operations GRANTED; C3V succeeded.
**Current missing-allow defect: PROVEN and CLOSED. Historical C3N/C3P incident
root cause: STRONGLY_SUPPORTED_NOT_PROVEN.** The closure record explains the
continuity evidence and remaining historical request/HTTP limits. This does not
assign the same cause to C3G/C3K or recover their missing diagnostics. The previous pair
at 100% is the historical C3N terminal state, superseded by C3V. No release retry
or other runtime operation is authorized by this documentation closure.

## C3F / C3G incident and C3H diagnosis

[Run 35421684166](https://github.com/tyosu131/Workout-Journal/actions/runs/35421684166)
used main `8ac592abcfeee607229fada3f5685e8c1630ddef`, attempt 1, with required
[CI 35421082860](https://github.com/tyosu131/Workout-Journal/actions/runs/35421082860)
SUCCESS. The following records come from C3F/G/H evidence; C3I does not repeat
runtime probes, cloud reads, Secret Manager access or E2E.

| Evidence | Established outcome |
| --- | --- |
| C3F preflight / candidate / candidate-e2e / verify-candidate | All PASS; Build `aa228d36-0631-4e9d-b6d1-c23e1c149b13`; candidate `cd-35421684166-1` |
| Candidate scenario | All eight steps PASS; `httpsCookieVerified: true` |
| Cleanup / evidence | PROVEN_ZERO; auth/users/notes/user_tags = 0/0/0/0; localReceiptState PERSISTED; evidenceState PASS |
| C3G approval / production job | One approval; [job 105841544261](https://github.com/tyosu131/Workout-Journal/actions/runs/35421684166/job/105841544261) failed; safe log `CD-C1: FAIL / promotion` |
| Backend writes | Promotion UpdateService SUCCESS, then rollback UpdateService SUCCESS; candidate 0% → 100% → 0% |
| Frontend writes | Successful UpdateService not observed; candidate final 0%. This does not prove no request was sent |
| Actual restored pair | Backend `workout-journal-backend-00003-luc` and Frontend `workout-journal-frontend-00003-xar`, each 100% |
| Post-rollback probes | Frontend `/login` 200, `/api/auth/session` 401; Backend `/` 404 |
| Workflow-recorded rollback field | NOT PROVEN: Checks output.summary/text null; step summary not programmatically available |
| Activation | Deleted once after terminal C3G; read-back UNCONFIGURED; freshly confirmed before C3I edits |

C3H localized failure no further than **P1 post-send handling, P3, P4, or P5
pre-send / failed-response boundary**. The Cloud Run reconciliation hypothesis
remains a future investigation topic, not a proven cause. Restored runtime state
does not prove the missing workflow field was `EXACT_PREVIOUS_PAIR_VERIFIED`.
The historical source did prove a separate **Must diagnostic durability defect**:
promotion exceptions were replaced by `RELEASE_NOT_VERIFIED` after rollback, and
rollback exceptions were discarded behind `HUMAN_DECISION_REQUIRED`.

## C3I source contract: durable promotion diagnostics

[`cd_release.py`](../.github/scripts/cd_release.py) preserves fixed allowlisted
`promotionFailureCode` and `promotionFailureStage` before attempting rollback.
Rollback independently retains `rollbackFailureCode` and `rollbackFailureStage`.
Unused fields, including `rollback` when not attempted, are explicitly null.
The existing top-level `RELEASE_NOT_VERIFIED`, coarse phase, pair summary and
pre-write failure boundary remain compatible. Only listed GateError codes are
published; unlisted GateError values and arbitrary exceptions become
`CD_CONTROLLER_FAILED`, without exception text or traceback.

Stages are assigned immediately before their operation:

- Promotion: `pre-promotion-recheck`; Backend/Frontend `pre-update-recheck`,
  `traffic-update`, `post-update-recheck`; `post-deploy-smoke`, `post-deploy-final-recheck`.
- Rollback: `rollback-state-read`, `rollback-state-recheck`; Frontend/Backend
  `rollback-precheck`, `rollback-update`; `rollback-final-recheck`, `rollback-smoke`,
  `rollback-post-smoke-recheck`.

The existing `GITHUB_STEP_SUMMARY` record retains the pair metadata. A single
canonical `CD-C1 diagnostic: {...}` stdout line for the promote command contains
only result, phase, failureCode, promotionFailureCode, promotionFailureStage,
rollback, rollbackFailureCode and rollbackFailureStage, plus the C3M fixed-enum
runApiFailureKind and runApiFailureStage fields and C3P's integer-or-null
runApiHttpStatus. These three API fields belong to the same first failure;
only HTTPError status integers 400–599 are retained (bool is rejected).
It contains no pair,
manifest, URL, revision payload or raw exception. Successful rollback records
`EXACT_PREVIOUS_PAIR_VERIFIED` with null rollback diagnostics; failed rollback
records `HUMAN_DECISION_REQUIRED` with its own fixed code/stage, preserving the
promotion diagnosis.

This is **diagnostic durability remediation**, with local offline validation in
the [C3I verification record](./verification.md#cd-c3i-promotion-diagnostic-durability-validation).
It adds no sleep, convergence polling, retry, PATCH resend or timeout change;
CAS, recheck, traffic comparison and Backend→Frontend promotion / Frontend→Backend
rollback ordering remain unchanged. **C3G technical root cause: NOT PROVEN.**
C3K runtime-proved the observed C3I promotion/rollback diagnostics. This does not
retroactively recover the lost C3G error. C3N later runtime-proved the observed
C3M HTTP kind/stage; C3P later runtime-proved numeric 403. The
[C3U/C3V closure](./cd-c1-candidate-delivery.md#c3u-and-c3v-runtime-closure)
supplies the subsequent authorization remediation and successful release evidence.

## Historical C3A execution record

[Run 35414003825](https://github.com/tyosu131/Workout-Journal/actions/runs/35414003825)
used source `ea3d0919eba549538da2346001ba45409e4a9465`, `main`,
`workflow_dispatch`, mode `release`, attempt 1, conclusion **failure**.
Preflight and candidate succeeded. Cloud Build
`1779ed1f-4c87-46b0-8983-3633121708d6` succeeded, produced immutable Backend/Frontend
images, and the paired candidates were created at 0%. The failed step was
`Exact secret read, private stdin, candidate scenario and exact-user cleanup`
in `candidate-e2e / e2e`: **cleanup / E2E_CLEANUP_UNPROVEN**.
`verify-candidate` and `production` were skipped; approval and promotion did not run.

| Incident question | Evidence boundary |
| --- | --- |
| Scenario success or failure | NOT PROVEN / UNKNOWN |
| Cleanup proof | FAILED / UNPROVEN |
| Cleanup API failure | NOT PROVEN |
| Actual residual at C3A | UNKNOWN; the diagnostic did not prove residuals existed; current C3D outcome is recorded below |
| Previous synthetic UUID / random P2B runId | NOT AVAILABLE from permitted durable evidence |
| Durable exact recovery handle | LOST / `CURRENT_RUN_EXACT_RECOVERY_HANDLE_MISSING` |

At the incident source, a child exception, nonzero residual, invalid cleanup response
or local receipt persistence failure could all yield exit 21. The parent interpreted
that exit before retaining child sub-results and discarded both streams. The random
UUID/runId, receipt, counts and safe evidence JSON were runner-local; the completed
run had no artifacts. The loss of result transport and exact recovery evidence is
a **Must source defect under Must 4** identified in C3B and remediated in C3C,
independently of the then-unknown remote data state.

C3C did not infer or search for the historical random identity and performed no
Supabase discovery or cleanup. C3D used a separate, one-time Human authorization
for read-only discovery; it did not use the new UUIDv5 locator for the old v1
random identity. The deterministic scheme cannot retroactively locate that UUID.

## C3D current residual closure

On 2026-09-19, the separately authorized C3D read-only investigation covered
Run `35414003825`, attempt 1, candidate `cd-35414003825-1`, historical source
`ea3d0919eba549538da2346001ba45409e4a9465`. C3D freshly confirmed the main/PR/CI
authority above and activation **UNCONFIGURED**. This C3E documentation closure
uses that investigation and the supplied closure evidence; it performs no new
Supabase, Secret Manager, Cloud Run or Cloud Build access.

| Evidence / outcome | C3D result |
| --- | --- |
| Dedicated E2E secret version 1 | SUCCESS / exactly one bounded runtime access |
| Auth discovery | Complete read-only pagination through the terminal empty page; exact historical ownership matches **0** |
| Synthetic public profile corroboration | Historical synthetic namespace and incident execution window; candidates **0** |
| Auth residual | **0**, directly established by complete discovery |
| users / notes / user_tags residual | **0 / 0 / 0 under verified current schema contract**; no recovered UUID, so no exact-UUID application counts were performed |
| Classification | **HISTORICAL_RESIDUAL_PROVEN_ZERO** |
| Residual Pending Evidence | **CLOSED** for the current residual/data-hygiene concern |

The Auth predicate required repository `tyosu131/Workout-Journal`, purpose
`portfolio-p2b`, exact candidate/source above, identity version 1, old runId format,
and consistent runId epoch / metadata createdAt / synthetic email. The bounded
window was `2026-09-19T02:00:59.793Z` inclusive to `2026-09-19T02:01:36Z` exclusive,
based on the command-start log and failed-step end; no extra clock tolerance was
used. Public corroboration required the old synthetic email shape and an embedded
epoch in that same window. Only aggregate evidence is retained here.

The [current migration](../supabase/migrations/20260724000000_create_workout_journal_schema.sql),
[Supabase documentation](../supabase/README.md) and
[production release evidence](./releases/workout-journal-v1.md) consistently establish:

- `public.users.uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- `notes.userid REFERENCES public.users(uuid) ON DELETE CASCADE`
- `user_tags.user_id REFERENCES public.users(uuid) ON DELETE CASCADE`

C3D freshly confirmed the production Backend Supabase destination was consistent
with the investigation target. Live DDL was **not freshly re-read**; no contradictory
drift evidence was observed. The conclusion is therefore **PROVEN_ZERO under
verified current schema contract**, not a claim about all historical DB states.

Historical scenario remains **NOT PROVEN** and historical cleanup execution proof
remains **UNPROVEN**. C3D reconstructed neither browser step results nor execution-time
cleanup success; do not report cleanup PASS. The scenario limitation remains a
historical execution record, not a current residual blocker.

Secret payload was not emitted or stored; no recovered UUID/email was emitted and
no raw Auth/profile list was saved. Secret handling remained process-private;
destructive operations were **0**. Candidate traffic stayed 0% and production
traffic stayed 100% as listed below. C3E performs documentation edits only: dispatch,
rerun, Supabase access/mutation, Cloud Run, Cloud Build, GitHub settings, Terraform
and IAM/WIF operations are all **0**.

## Fail-closed state and retained candidates

The explicit C3C Human authorization allowed one repository-variable deletion.
On 2026-09-19, `CD_C1_ACTIVATION` was read as `approved`, deleted once from
`tyosu131/Workout-Journal`, then read back **UNCONFIGURED** at `02:30:05Z`.
This closes the release latch; it is distinct from production Environment approval.
No other runtime mutation is authorized or performed in C3C.

Historical C3C/D read-only Cloud Run checks retained both service generations at 7, the original
traffic entries/tags/URLs, and these revisions:

| Service | Retained C3A candidate / traffic | Production / traffic |
| --- | --- | --- |
| Backend | `workout-journal-backend-cd-35414003825-1` / 0% | `workout-journal-backend-00003-luc` / 100% |
| Frontend | `workout-journal-frontend-cd-35414003825-1` / 0% | `workout-journal-frontend-00003-xar` / 100% |

Neither the C3A pair nor older retained candidates were deleted or changed in
C3C/D. The later C3F/G pair and restoration are recorded above.

## Future source contract: deterministic identity and ownership

New CD v2 manifests explicitly require `e2eIdentityVersion: 2`. The locator uses
standard [UUIDv5 (RFC 9562 §5.5 and Appendix A.4)](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.5)
with the URL namespace `6ba7b811-9dad-11d1-80b4-00c04fd430c8` and exact UTF-8 name:

```text
https://github.com/tyosu131/Workout-Journal/candidate-e2e/cd-<GitHub Run ID>-<attempt>
```

`candidateUuid(repository, candidateId)` in
[`candidate-identity.mjs`](../e2e/candidate-identity.mjs) rejects foreign repository
names, malformed IDs, leading zeroes and IDs outside the release length limit.
The RFC known vector and different candidate/process/host tests fix interoperability.
The UUID is a locator, not a secret or authorization decision. Changing the mapping
requires a new identity version; it must not silently reinterpret past evidence.

Auth `app_metadata.p2b` binds repository, purpose, candidateId, source SHA, original
GitHub Run ID/attempt and identity version. Creation timestamp/expiry, nonce and
creator PID/host remain. Same-run cleanup requires the private receipt, current
PID/host and exact server metadata/nonce. It deletes only the exact UUID after
ownership matches; there is no table DELETE or list fallback.

Before creation, exact Auth UUID read and exact `users.uuid`, `notes.userid` and
`user_tags.user_id` counts must all prove zero. The queries select only the identity
column and at most one row, using
[PostgREST `count=exact` / Content-Range](https://docs.postgrest.org/en/v12/references/api/pagination_count.html#exact-count).
Any existing row/user gives `PREEXISTING_SYNTHETIC_IDENTITY_REFUSED`, without POST
or cleanup DELETE. An unavailable count stays null and refuses creation. If the
subsequent create response is uncertain, cleanup still requires the exact nonce
and ownership metadata; a collision never authorizes deleting someone else's user.

`inspectCandidateRecovery(reviewedOriginalManifest, secret)` in
[`candidate-client.mjs`](../e2e/candidate-client.mjs) is a separate **read-only source
contract for a future Human Gate**. It reconstructs the locator and checks Auth
metadata without requiring the current PID/host or local receipt. It validates the
original manifest at its capture time; it does not refresh its release TTL or permit
another scenario. The caller must authenticate the original manifest/source/run
evidence before supplying it. Old manifests without identity version 2 are refused.
Only exact Auth/table GETs exist in this API; it is not wired to an automatic job
or deletion CLI. If Auth is absent, table counts alone do not establish missing Auth
ownership metadata or authorize deletion. `candidate-cleanup.mjs` remains a historical
P2B v1 tool and explicitly refuses CD v2. Any future destructive recovery requires
its own reviewed Human Gate and exact ownership proof.

Local 0600 receipts remain useful for same-run claims and crash windows. They are
no longer the only locator. No UUID/email receipt is uploaded to GitHub artifacts;
no bucket, secret, database table or credential-bearing recovery storage is added.

## Future source contract: safe durable result

Before launching the child, Python flushes a public recovery handle containing
candidateId, source SHA, GitHub run/attempt and manifest hash. It pre-creates a private
0600 result file. Child stdout/stderr remain discarded, not parsed or forwarded.
The child writes a bounded JSON envelope; the parent reads it even on a nonzero exit,
rejects missing/corrupt/oversized/duplicate-key/unknown-field results, and verifies
exact candidate/source/run/attempt/hash binding. The file must remain the same owned
0600 regular inode, without symlinks or extra hard links.

[`candidate-result-contract.json`](../e2e/candidate-result-contract.json) defines the
shared step and fixed diagnostic enums. Only the validated envelope goes to the
GitHub log and step summary, providing durable evidence after the runner ends:

- Identity: version, candidateId, sourceSha, githubRunId, githubRunAttempt, manifestHash.
- Scenario: PASS / FAIL / NOT_RUN / UNKNOWN; the eight fixed Must 2 step results and
  HTTPS-cookie verification.
- Cleanup: nullable exact auth/users/notes/user_tags counts; PROVEN_ZERO / RESIDUAL /
  UNPROVEN; independent localReceiptState and evidenceState.
- Failure: allowlisted failureCode / failureOperation or null, and
  `DETERMINISTIC_CANDIDATE_ID` recoveryHandle containing only candidateId.

No synthetic UUID, email, password, Supabase secret, token, Authorization header,
browser auth state, arbitrary exception, URL or HTTP response is admitted. The
parent emits an E2E success hash only after the complete success contract passes.
This is metadata binding, not a signature against a malicious trusted child.

| Observation | Result |
| --- | --- |
| Scenario PASS, remote cleanup zero, evidence valid | Exit 0; success hash eligible |
| Scenario FAIL, remote cleanup zero | Scenario FAIL preserved; exit 20 |
| Cleanup read/delete/query failure | Fixed operation code; affected/unread counts null; exit 21 |
| Positive residual count | RESIDUAL plus exact observed counts; exit 21 |
| Remote counts all zero, only local receipt write fails | PROVEN_ZERO + local receipt FAILED; exit 22, not cleanup-residual failure |
| Result file missing or invalid | E2E_RESULT_UNAVAILABLE; scenario UNKNOWN, all counts null; known recovery handle retained |
| Child exit disagrees with envelope or is interrupted | Fixed mismatch/interruption diagnostic; validated sub-results retained; no success hash |

A forced kill before the result write cannot manufacture scenario/count proof.
The already flushed deterministic handle remains useful. GitHub log/summary
retention still limits evidence availability; the UUID itself is reconstructible
from the known repository/candidate ID without credentials. No automatic retry,
generic discovery or destructive fallback is added.

## Completion boundary

C3C improves recovery safety; C3D closes the historical incident
for current residual/data-hygiene concerns only. Scenario NOT PROVEN and cleanup
execution UNPROVEN remain historical limitations. Must 3 is now Closed
(OBS-D1/D2A/B Monitoring apply, read-back, uptime and no-drift PROVEN);
Must 4 is now Closed by C4D. C3F closes the successful candidate
E2E/cleanup/re-verification portion; C3G proves approval integration and actual
previous-pair restoration after failed promotion. C3K supplies observed failure
diagnostics, C3P proves numeric 403, C3U closes the IAM defect, and C3V proves
successful production promotion/post-deploy verification. C3W synchronizes
documentation; **C3 runtime chain is CLOSED**. The combined rollback evidence and
its historical limits are assessed in the [closure record](./cd-c1-candidate-delivery.md#c3u-and-c3v-runtime-closure),
without a new C3V rollback. **C4D closes Must 4 with the fixed automatic E2E/verify
path, Human production approval, promotion and post-deploy verification**; no new
rollback event is claimed. C3F successful result
transport is not runtime failure-injection or cross-run recovery evidence.

C3I implementation stopped before commit/push/PR at **READY FOR FRESH RESULT AUDIT**.
The subsequent [Fresh Result Audit](./verification.md#cd-c3i-fresh-result-audit-and-pre-pr)
passed source acceptance; C3K later proved the observed C3I failure diagnostics.
C3I/C3M/C3P source implementation runtime mutation is **NONE**. No release retry, activation, production approval or promotion
is authorized by this remediation or audit.


## Fresh Result Audit and Pre-PR

First Pass completed on 2026-09-19 **before any audit edit, staging, commit, push
or PR creation**: **PASS — Must 0 / Should 0 / Pending Evidence 0 / Decision Needed 0**.
The starting artifact was 16 modified and 11 new files on detached HEAD
`ea3d0919eba549538da2346001ba45409e4a9465`, with an empty index. The review-input
SHA-256 (sorted path + NUL + content + NUL) was
`9f1a0580670c6a17f1a67d638c19665269b0699f352bcb08b9f563149e8851a0`.

The auditor re-read local Source Map/Core/Router/Review/Pre-PR Harness, actual
working files, exact pre-remediation GitHub source, C3B investigation evidence,
incident metadata/jobs and the fixed diagnostic from GitHub run logs. Harness
files are local references excluded by `.git/info/exclude`, not GitHub-tracked
source. Job-log CLI output was rejected for terminal escapes; the run-log ZIP was
instead parsed in memory, exposing only the allowlisted diagnostic. No raw log,
credential, old UUID or arbitrary child output was published or saved.

Fresh read-backs confirmed main remained the fixed baseline, activation was
UNCONFIGURED, incident attempt 1 failed at the recorded cleanup boundary, artifacts
were zero, and verify/production were skipped. Both service generations remain 7;
C3A candidates remain 0% and the production pair remains 100%. Audit runtime
mutation is **NONE**. The prior authorized deletion remains one implementation
operation; this audit did not repeat it. The old scenario/residual/identity
uncertainty was a separate incident issue at this audit, not a reopened
source-remediation finding. C3D subsequently closed only current residual uncertainty.

The review verified all release-manifest bindings before API use; exact columns
against repository migrations (`users.uuid`, `notes.userid`, `user_tags.user_id`);
nonce/metadata/current-process same-run ownership; and separate metadata-bound,
read-only cross-run inspection. No listing, SQL, wildcard lookup, automatic recovery
or new destructive entry point exists. UUIDv5 matched RFC 9562's external vector
and Python standard-library `uuid.uuid5` independently for four synthetic candidate
inputs. Process and host changes preserve the locator, while ownership requires
server metadata beyond the UUID.

The private result file is exclusively created by the parent; inode/owner/mode,
regular-file, hard-link, size and symlink checks are enforced. A single JSON
snapshot is read after child completion; duplicate keys, concatenated documents,
partial writes and unknown fields fail closed. The child has one final write site;
0600 and metadata hashes are not claimed to isolate a malicious process running
as the same trusted runner user. Failed or interrupted exits retain validated
sub-results; missing results publish UNKNOWN/null with the known recovery handle.
Remote PROVEN_ZERO survives local persistence failure. Raw process output and
credentials remain outside the public schema.

Fresh validation reproduced **85 Python / 65 offline E2E / 46 Jest suites, 403
tests**, actionlint **1.7.12**, diff checks and **63 local documentation links**.
The nine documented source mutants were independently re-executed in disposable
copies and detected by assertions, not syntax/import failures. Three additional
query mutants (wrong column, wrong UUID, missing exact filter) were also rejected.
Additional IPC probes rejected concatenated/truncated JSON and extra hard links.
Node **24.18.0** follows root engines and CI/reusable-workflow setup-node contracts;
the default Homebrew Node still fails to load a shared library and was not repaired.
No semantic source/test fix was needed after First Pass. The staged diff check
then found one extra EOF blank line in the new `release-fixture.mjs`; it was removed
and the staged check rerun. Audit status/records were also updated.

### Per-file scope classification

A = semantic controller; B = E2E/recovery contract; C = tests; D = documentation.
All 27 files are accounted for: **A 3 / B 9 / C 7 / D 8 / unrelated 0**.

| Path | Relation to defect closure | Classification |
| --- | --- | --- |
| `.github/scripts/candidate_e2e.py` | Collect and publish validated partial results before interpreting exit status | A / required |
| `.github/scripts/candidate_result.py` | Strict bounded Python IPC validation and public allowlist | A / required |
| `.github/scripts/cd_release.py` | Bind new manifests to deterministic identity version | A / required |
| `e2e/candidate-identity.mjs` | Standard UUIDv5 locator and immutable ownership fields | B / required |
| `e2e/candidate-client.mjs` | Exact zero gate, ownership checks, classified cleanup and read-only recovery | B / required |
| `e2e/candidate-result-contract.json` | Shared fixed diagnostics and step names | B / required |
| `e2e/candidate-result.mjs` | Child envelope validation, state separation and private writer | B / required |
| `e2e/candidate-run.mjs` | Preserve scenario/cleanup outcomes and emit the structured result | B / required |
| `e2e/candidate-user.mjs` | Route CD v2 to the new contract while retaining historical v1 | B / required |
| `e2e/candidate-target.mjs` | Include identity version in receipt/manifest identity | B / derived |
| `e2e/release-contract.mjs` | Reject old identity manifests and remove obsolete exit semantics | B / required |
| `e2e/candidate-cleanup.mjs` | Prevent historical destructive CLI from accepting CD v2 | B / derived |
| `.github/scripts/test_cd_release.py` | Exercise existing parent gates with structured child results | C / required |
| `.github/scripts/test_candidate_result.py` | IPC, binding, partial outcomes and output-marker regressions | C / required |
| `.github/scripts/test_candidate_detection.py` | Execute the nine requested faulty implementations in temporary copies | C / required |
| `e2e/candidate-recovery.test.mjs` | Independent UUID vector, exact queries, ownership and cleanup tests | C / required |
| `e2e/candidate-lifecycle.test.mjs` | Run actual child control flow with offline external adapters | C / required |
| `e2e/release-fixture.mjs` | Share synthetic manifests without duplicating the release fixture | C / derived |
| `e2e/release.test.mjs` | Adopt identity version and retain release/v1 compatibility coverage | C / derived |
| `docs/cd-c3-e2e-recovery-contract.md` | Specify incident limits, recovery contract and independent audit | D / required |
| `docs/cd-c1-candidate-delivery.md` | Correct Current incident, activation and failure semantics | D / required |
| `docs/e2e-smoke-runbook.md` | Distinguish historical v1 cleanup from future CD v2 recovery | D / required |
| `docs/cloud-run-deployment-runbook.md` | Replace source-only candidate claim with C3A partial runtime evidence | D / derived |
| `docs/portfolio-completion-contract.md` | Add partial evidence without closing Must 3/4 or incident cleanup | D / derived |
| `docs/portfolio-infra-ownership.md` | Update CD dependency evidence without changing infrastructure ownership | D / derived |
| `docs/verification.md` | Record actual validation, audit and runtime boundaries | D / required |
| `infra/terraform/README.md` | Preserve no-new-plan/IaC boundary alongside later CD incident state | D / derived |

Local Pre-PR passed: the final effective diff, scope, documentation, 63 local
links and credential safety were rechecked. Credential-pattern matches were only
the two explicit offline test markers. Changes after these source/test results
were audit documentation and the non-semantic fixture EOF cleanup;
application source, workflows, Terraform `.tf` and IAM/WIF remain unchanged.
PR CI success is evidence for the source change, not candidate E2E runtime success.
