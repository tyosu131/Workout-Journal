# CD-A: manual keyless submission proof

Status: **PE-P1C-01B Closed by CD-B2 runtime proof on 2026-09-06; Must 4 Open;
Must 3 In progress; WIF `ACTIVE` / `disabled = false`; production CD inactive.**
The two repository variables are configured and privately read-back verified.

CD-A supplied the `workflow_dispatch`-only implementation; CD-B1 prepared the
provider desired state. The separately Human-approved CD-B2 applied that exact
provider update and executed the workflow once. Merging CD-B1 alone was not
activation or proof. See the [Terraform activation record](../infra/terraform/README.md#completed-cd-b2-provider-activation).

The [workflow](../.github/workflows/cd.yml) and its
[standard-library Python controller](../.github/scripts/wif_submission.py) verified
this submission path in the recorded CD-B2 run:

```text
exact main SHA -> GitHub OIDC / WIF -> Deploy SA
-> source staging -> Cloud Build -> dedicated Build SA
-> two immutable image digests + unchanged Cloud Run
```

This is not full CD. There is no automatic trigger, candidate deployment, E2E job,
Environment approval job, promotion, post-deploy smoke or rollback automation.
The existing required [CI workflow](../.github/workflows/ci.yml) is unchanged.

## CD-B2 verified runtime proof

The successful job and Human-confirmed GitHub Job Summary jointly establish
`proof = PE-P1C-01B`, `result = PASS`. The Summary was not available through the
Check Run API; the Human read its exact JSON and confirmed identical before/after
snapshots. Independent operator read-back matched the run, Build identity,
source prefix/SHA, dedicated Build SA, both Artifact Registry digests and unchanged
Cloud Run. Closure uses both evidence sources, not job success alone.

| Evidence | Verified value |
| --- | --- |
| GitHub run / attempt | [34007295086](https://github.com/tyosu131/Workout-Journal/actions/runs/34007295086) / `1`; run and job `success` |
| GitHub SHA | `0f0a677f196f43681d55d90f93350dd83cff841d` |
| Project | `workout-journal-506909` |
| Authenticated Deploy SA | `workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com` |
| Actual Build SA | `projects/workout-journal-506909/serviceAccounts/workout-journal-build@workout-journal-506909.iam.gserviceaccount.com` |
| Cloud Build | `f7735982-2596-407d-bbe6-7c6d9c0adb50`; `SUCCESS`; `CLOUD_LOGGING_ONLY`; exact GitHub SHA as `COMMIT_SHA` |
| Source staging prefix | `gs://workout-journal-506909_cloudbuild/source/cd-a/34007295086-1/` |
| Backend immutable digest | `sha256:025314888aac4666c540bd247490c44c31594336b43050cd6aa2a1d4aee17d62` |
| Frontend immutable digest | `sha256:3d7c0bf0f5d97489a9e3949fccc816b827ea86d6f7f9057ccd7a52f5fc338163` |
| Provider | `ACTIVE` / `disabled = false`; trust condition, mapping, issuer and pool unchanged |
| Terraform post-apply plan | `0 add / 0 change / 0 destroy`; `resource_drift = 0`; 30 resources |
| Repository variables | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configured; exact private value comparison passed |
| Approved Supabase project ref | `krpnnkcipyeasddzbpma` |
| Public-config provenance | Production Build `75c83256-303d-47f7-b57b-c473983893d0` at SHA `4fdc8f597d96e580c6c2ed8850952e5aa15c1bfc`; values matched production Backend revision `workout-journal-backend-00003-luc`; values are not reproduced here |

Cloud Run before/after snapshots were identical, including generation `6`, latest
created/ready revisions, traffic and tags for both services:

| Pair | Backend revision | Frontend revision | Traffic per service | Shared tag |
| --- | --- | --- | --- | --- |
| Production | `workout-journal-backend-00003-luc` | `workout-journal-frontend-00003-xar` | 100% | `candidate-0829-923536` |
| Retained P2B | `workout-journal-backend-p2b-081adb25` | `workout-journal-frontend-p2b-081adb25` | 0% | `candidate-p2b-081adb25` |

The retained P2B revisions remained the latest created/ready revisions. These new
images are **submission-proof artifacts and were not deployed to Cloud Run**.
No candidate, promotion, E2E run or production runtime change occurred in CD-B2.

### CD-B2 mutation accounting

| Scope | Approved mutation performed |
| --- | --- |
| GitHub repository variables | Exactly the two named public-config variables created; read-back matched |
| Terraform / WIF | One in-place provider update: `disabled true -> false` and the reviewed neutral description; remote state updated; no IAM grant, trust, mapping, issuer or pool change |
| GitHub Actions | One manual dispatch, one run, attempt `1` |
| Cloud Build / Storage | One Build submission/run and its source staging under the recorded prefix |
| Artifact Registry | Backend and Frontend SHA-tagged submission-proof images, with the immutable digests above |

IAM grants, Service Accounts, Secret Manager IAM/payloads, GitHub repository and
Environment secrets, Environment configuration, Cloud Run revisions/tags/traffic
and production application state were not changed. Publishing this documentation
is a separate Git commit/push/PR operation; it does not repeat provider activation,
repository-variable updates, workflow dispatch, Build submission or Cloud Run operations.

PE-P1C-01B is Closed. Must 3 stays In progress for remaining identity/build
hardening. Must 4 stays Open: automatic main-merge + CI-success delivery,
candidate deployment and exact pairing, E2E integration, runtime Environment
approval, promotion, post-deploy verification and rollback/failure behavior still
require implementation and evidence. Production CD remains inactive.

## Inputs and trust boundary

- Trigger: `workflow_dispatch` only. The job rejects other repositories/refs by
  its condition; the controller also fails closed on event, repository, ref,
  workflow identity and SHA mismatch. A rejected job may be shown as *skipped* by
  GitHub; that is not proof. An old dispatch is rejected if `main` has since moved.
- Permissions: only `contents: read` and `id-token: write`.
- Project: `workout-journal-506909`; Artifact Registry/Cloud Run region:
  `asia-northeast1`; Cloud Build API region: `global`.
- Provider:
  `projects/437413312066/locations/global/workloadIdentityPools/github-actions/providers/workout-journal`.
- Deploy SA:
  `workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com`.
- Build SA:
  `workout-journal-build@workout-journal-506909.iam.gserviceaccount.com`.
- Required **repository variables**, created and verified by CD-B2:
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  The URL must be an HTTPS hosted Supabase project origin (no path/query); the
  key must be a current `sb_publishable_…` key, not an admin secret or legacy JWT.
  Missing/invalid values stop execution before authentication/submission. There
  are no defaults. Human Gate must confirm these are the approved public build
  values; syntactic validation alone cannot establish that operational choice.

The [WIF condition](../infra/terraform/workload_identity.tf), including numeric
owner/repository identity, exact `main` and exact `cd.yml` workflow ref, remains
the primary trust boundary. Repository checks are defense in depth, not a
substitute. No static SA key, Token Creator grant or token-format output is used.
The Google auth action creates an ephemeral external-account credential file,
not a Service Account private key. The controller checks its provider/impersonation
identity and the SDK's active account before any submission.

## Source, build and read-only comparison

1. Checkout `github.sha` with no persisted GitHub credential. Check HEAD, workflow
   SHA, current remote `main`, and tracked-file cleanliness.
2. Before auth, archive that exact Git object into a new `RUNNER_TEMP` directory.
   Refuse archive links/traversal/special files. Hash the staged tree and recheck
   it immediately before submission. The workspace is **never** the submitted
   directory: untracked dotenv, auth-generated `gha-creds-*.json`, local evidence
   and dependencies cannot enter this archive. The existing `.gcloudignore`
   continues to filter the clean staging directory.
3. Before submission, require the reviewed `cloudbuild.yaml` SHA-256:
   `0ff3a7a3c3dc95b73b48f48b04839e903be6ff3fcc506adffdab91d9f15e5a15`.
   These exact bytes select the dedicated Build SA, `CLOUD_LOGGING_ONLY`, two
   Docker build steps and two image pushes, with no Cloud Run step. **Any** config
   change, even formatting, stops this workflow until the contract and allowlist
   are freshly reviewed. The controller does not rewrite `cloudbuild.yaml`.
4. Read both existing Cloud Run services. Record only validated service/revision
   names, generation and traffic (including 0% tagged revisions); require observed
   readiness. Read the exact existing source bucket before submission; no missing
   bucket bootstrap or permission workaround is permitted.
5. Submit once with `gcloud builds submit --async --suppress-logs`, using
   `gs://workout-journal-506909_cloudbuild/source/cd-a/<run-id>-<attempt>/`, exact
   SHA substitutions and a 900-second Cloud Build timeout. Poll Build metadata
   for at most 20 minutes; do not stream Cloud Logging or retry the submission.
6. Verify actual Build ID/project, source bucket/run prefix, commit substitution,
   dedicated Build SA, logging mode and `SUCCESS`. Resolve both SHA-tagged images
   in Artifact Registry and require equality with the Build result digests.
   A missing digest or concurrent tag overwrite fails the proof.
7. In a `finally` path, repeat the read-only Cloud Run snapshot, including after
   submission/build/digest failure. Any difference or unavailable read-back fails
   the proof. There are no deploy/update/traffic/tag commands or compensating
   changes. A job cancellation/runner loss may prevent final read-back; an
   incomplete job is never closure evidence. Never redispatch blindly after a
   submission error: inspect the run/Build ID and actual state first.

Current Terraform's resource-scoped `roles/run.developer` grants include
`run.services.get`; source-bucket `roles/storage.bucketViewer` includes
`storage.buckets.get`. The P1C-B IAM layer was read back during implementation
without changes. CD-B2 verified its sufficiency under **actual GitHub WIF
execution** for this submission path. Any future permission failure must still
stop the proof rather than add IAM, impersonation grants or secret access.

## Evidence and secret safety

Closure requires **both** a successful job and Step Summary
`PE-P1C-01B` result `PASS`. The controller emits an allowlisted JSON block there:
run ID/attempt, SHA, project, authenticated Deploy SA, Build ID/result/actual SA,
Backend/Frontend digests, sanitized Cloud Run before/after, unchanged flag and
proof result. Failures contain fixed codes, never raw SDK exceptions/responses.
Auth/setup/preflight failures also leave a fixed *FAIL / incomplete* summary.

No artifact upload, trace, token output, raw build log or credential dump is added.
Supabase values, OIDC/access tokens, credential JSON and secret payloads are not
included in the evidence. Public build values are rotation-capable configuration,
not secrets: they can be visible in Actions input metadata and the compiled
Frontend. The publishable key is additionally masked after controller input;
this is not a promise that a repository variable is secret storage. Never put an
admin key into these variables. Subprocess output is captured privately; the
auth action removes its generated credential in post-job cleanup.

The durable CD-B2 record above includes the actual successful run URL and sanitized
identities. Workflow existence or offline unit-test PASS alone does not establish
PE-P1C-01B closure.

The P2B candidate runner currently receives its Admin credential through private
stdin. Deploy SA has **no Secret Manager payload access**. Delivery of that
credential in future CD is an unresolved, separate Human Decision after this
submission proof. CD-A does not add secretAccessor, repository/Environment secrets,
new SAs or Token Creator, and does not decide that delivery mechanism.

## Follow-up Should: publishable-key log hygiene

Human inspection of run `34007295086` found that the preflight step's initial runner
env metadata displayed the repository-variable publishable key once, before the
controller's masking took effect. This is browser-visible Supabase public
configuration, not a secret or private-credential exposure. It does not block
PE-P1C-01B closure and does not require key rotation.

Record this as a logging-hygiene improvement candidate before full CD: reduce
unnecessary public-config values in runner metadata, including the interval before
controller masking. This docs closure does not change the workflow or the key.

## Action selection and offline validation

Official release/tag refs and action inputs were checked on 2026-09-05:

| Action | Release | Immutable commit |
| --- | --- | --- |
| [actions/checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [google-github-actions/auth](https://github.com/google-github-actions/auth/releases/tag/v3) | v3 | `7c6bc770dae815cd3e89ee6cdf493a5fab2cc093` |
| [google-github-actions/setup-gcloud](https://github.com/google-github-actions/setup-gcloud/releases/tag/v3.0.1) | v3.0.1 | `aa5489c8933f4cc7a4f7d45035b3b1440c9c10db` |

All use the Node 24 action runtime. Immutable pins avoid floating action-tag
changes. Google-maintained WIF actions provide the supported external-account
credential path without custom token handling; see the
[auth contract](https://github.com/google-github-actions/auth) and
[setup-gcloud requirements](https://github.com/google-github-actions/setup-gcloud).
The SDK constraint `>= 416.0.0` permits current supported WIF-capable SDKs (the SDK
itself is not an immutable pin). Future action/config upgrades require review.
The controller/tests use Python 3's standard library on the hosted Ubuntu runner;
no application dependency or required-CI change is needed.

Offline checks (no authentication or Cloud Build submission):

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s .github/scripts -p 'test_*.py' -v
actionlint .github/workflows/cd.yml
git diff --check
```

Tests mock every external command and exercise input/source/config rejection,
credential identity, exact digests, changed traffic, failed/timeout submissions,
independent final read-back and secret-marker exclusion from Step Summary. Shell
steps and YAML/action inputs also require static validation. Local lint/build/Jest
remain the regression gates; none substitute for runtime evidence such as the
separately approved CD-B2 GitHub OIDC/WIF proof recorded above.
