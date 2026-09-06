# CD-C1: dedicated candidate E2E and gated delivery

Status: **Repository desired state / Pending Human Gate.** Must 3 is **In progress**,
Must 4 **Open**, production CD **inactive**. Existing Deploy WIF is Current and
runtime proven by [CD-B2 / PE-P1C-01B](./wif-submission-proof.md#cd-b2-verified-runtime-proof).
The new E2E identity has not been applied. The dedicated Supabase E2E key is
**NOT YET CREATED**; E2E WIF runtime proof and full automatic CD proof are **OPEN**.
Source implementation, offline tests and a Terraform plan are not runtime proof.

## Identity and credential ownership

| Identity | Desired permissions and responsibility |
| --- | --- |
| Existing Deploy SA | Existing build/candidate/promotion/rollback grants unchanged; no privileged Supabase payload access |
| Existing Build SA | Existing dedicated Cloud Build execution grants unchanged |
| New `workout-journal-e2e` | Only `secretAccessor` on `workout-journal-e2e-supabase-secret-key` |

The E2E SA has no project-level IAM grant, Build/Run/Artifact Registry/Storage role,
Service Account User, Token Creator, JWT secret access, Backend Supabase secret
access, key or Editor/Owner role. Terraform adds metadata, never a secret version
or payload. Key creation and exact-version population remain separate Human work;
do not duplicate this key into GitHub secrets or use the Backend key instead.

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
The new provider remains `disabled = true` in desired state.

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

`cd.yml` has only `workflow_dispatch`, not `workflow_run`. It also refuses execution
unless repository variable `CD_C1_ACTIVATION` equals `approved`; that variable is
**not configured** in CD-C1. It is an activation latch, not a production approval.
A later Human Gate must review source, apply/activate the E2E provider, create
the dedicated key/version and approve activation-setting changes and dispatch.

Dispatch must use the exact current main SHA and exact `cd.yml` workflow SHA.
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

## Dynamic candidate provenance

The active path builds a v2 manifest from Build and Cloud Run read-back, binding:

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
desired state adds five resources (eventual total 35); actual baseline remains 30.
Existing resources/grants must not change. No apply/import/state mutation, Cloud
Build, dispatch, Supabase key creation or Cloud Run mutation is authorized by
source validation. Fresh independent Result Audit precedes any Human runtime gate.

The CD-C1 read-only plan returned `PLAN_EXIT=2`, exactly `5 add / 0 change /
0 destroy`; all 30 existing managed resources and outputs were no-op. Plan JSON
also reported one refresh-only difference on
`google_artifact_registry_repository.workout_journal.update_time`. The **locked
provider schema**, not latest Registry docs, confirmed `computed=true` with
neither `optional` nor `required`; all other before/after fields were identical.
This is recorded separately, not described as zero `resource_drift`. No saved plan
from source validation is authorized for apply; runtime work needs a fresh plan
and its own Human Gate.
