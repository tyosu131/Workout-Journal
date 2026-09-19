# CD-C3: candidate incident and E2E recovery contract

Current status: **full candidate delivery FAIL / incomplete; Must 4 Open;
production CD inactive; `CD_C1_ACTIVATION` UNCONFIGURED**. Isolated WIF remains
[R8 CLOSED / PASS](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure).
CD-C3C source remediation passed Fresh Result Audit and local Pre-PR gates on
2026-09-19. It is not a new runtime proof, merged release, current-incident recovery
or authorization to retry.

## Historical C3A incident, still pending evidence

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
| Actual residual | UNKNOWN; the diagnostic does not prove residuals exist |
| Previous synthetic UUID / random P2B runId | NOT AVAILABLE from permitted durable evidence |
| Durable exact recovery handle | LOST / `CURRENT_RUN_EXACT_RECOVERY_HANDLE_MISSING` |

At the incident source, a child exception, nonzero residual, invalid cleanup response
or local receipt persistence failure could all yield exit 21. The parent interpreted
that exit before retaining child sub-results and discarded both streams. The random
UUID/runId, receipt, counts and safe evidence JSON were runner-local; the completed
run had no artifacts. The loss of result transport and exact recovery evidence is
a **Must source defect under Must 4**, independently of the unknown remote data state.

C3C does not infer or search for the historical random identity. No Supabase Admin
listing, SQL/Auth inspection, public-table scan, Dashboard search, current-run exact
recovery or destructive cleanup is performed. Any historical recovery needs a
separate Human Gate; this new deterministic scheme cannot locate an old random UUID.

## Fail-closed state and retained candidates

The explicit C3C Human authorization allowed one repository-variable deletion.
On 2026-09-19, `CD_C1_ACTIVATION` was read as `approved`, deleted once from
`tyosu131/Workout-Journal`, then read back **UNCONFIGURED** at `02:30:05Z`.
This closes the release latch; it is distinct from production Environment approval.
No other runtime mutation is authorized or performed in C3C.

Read-only Cloud Run checks retain both service generations at 7, the original
traffic entries/tags/URLs, and these revisions:

| Service | Retained C3A candidate / traffic | Production / traffic |
| --- | --- | --- |
| Backend | `workout-journal-backend-cd-35414003825-1` / 0% | `workout-journal-backend-00003-luc` / 100% |
| Frontend | `workout-journal-frontend-cd-35414003825-1` / 0% | `workout-journal-frontend-00003-xar` / 100% |

Neither the C3A pair nor older retained candidates are deleted or changed.

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

C3C improves future retry/recovery safety only. The historical incident stays
Pending Evidence. Must 3 remains In progress (monitoring/alert resources deferred
to Must 5 design); Must 4 remains Open. Remaining CD work includes successful
dynamic candidate E2E/cleanup and candidate re-verification, approval/promotion,
post-deploy/failure/rollback verification, automatic main-merge + CI-success
triggering, and separately authorized production activation. Build and candidate
creation have C3A runtime evidence; the whole chain is not proved.

The implementation stopped at **READY FOR FRESH RESULT AUDIT**. The separate
audit below permits commit/push/PR and required CI verification only. Merge is a
Human action; post-merge CI and an old-incident residual-policy Human Decision must
precede any consideration of another release. No release retry is authorized.


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
uncertainty is a separate incident issue, not a reopened source-remediation finding.

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
