# CD-C1: dedicated candidate E2E and gated delivery

Status: **CD-C1 merged; CD-C2A/B runtime complete; CD-C2C source pending review.** Must 3 is **In progress**,
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
remains enabled. E2E provider is **Current / ACTIVE lifecycle / disabled=true**.
CD-C2C changes its **desired** state to `disabled=false`, **Pending reviewed apply**;
the source change does not activate it. `CD_C1_ACTIVATION` is **UNCONFIGURED**.
Neither CD-C2A nor CD-C2B dispatched CD, submitted a Build, created a Run revision,
changed traffic or published an image. Their runtime completion does not close
Must 3 or Must 4. Do not repeat their provisioning or secret-version insertion.

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
The provider remains `disabled = true` in actual runtime; CD-C2C proposes
`disabled = false` without changing mapping, condition, pool or IAM.

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

## Isolated WIF proof (CD-C2C source; runtime OPEN)

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
discarded without resource access. Output and step summary contain only source
SHA, run ID/attempt, provider role, target SA, expected outcome and PASS/FAIL.
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
state is 35; CD-C2C's expected plan is **0 add / 1 change / 0 destroy**, only E2E
provider `disabled: true -> false` and pending-to-neutral description. All other
resources/grants must be no-op. No apply/import/state mutation, Cloud
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
