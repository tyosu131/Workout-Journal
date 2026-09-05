# CD-A: manual keyless submission proof

Status: repository implementation only. **PE-P1C-01B remains Open; Must 4 remains
Open; WIF is `ACTIVE` / `disabled = true`; production CD is inactive.** This phase
has **not** dispatched the workflow, activated the provider, created repository
variables or executed Cloud Build; those actions remain separately Human-gated.

The CD-A workflow is now on `main` (`workflow_dispatch` only). Subsequent
[CD-B1 desired-state preparation](../infra/terraform/README.md#cd-b1-desired-state--pending-cd-b2-apply)
sets repository provider `disabled = false`, with one intentional in-place update
pending CD-B2 apply. Actual GCP / remote state still report `disabled = true`;
merging that desired-state change alone is not activation or runtime proof.
Repository variables are still unconfigured; PE-P1C-01B and Must 4 remain Open.

The [workflow](../.github/workflows/cd.yml) and its
[standard-library Python controller](../.github/scripts/wif_submission.py) prepare
one separately Human-gated proof:

```text
exact main SHA -> GitHub OIDC / WIF -> Deploy SA
-> source staging -> Cloud Build -> dedicated Build SA
-> two immutable image digests + unchanged Cloud Run
```

This is not full CD. There is no automatic trigger, candidate deployment, E2E job,
Environment approval job, promotion, post-deploy smoke or rollback automation.
The existing required [CI workflow](../.github/workflows/ci.yml) is unchanged.

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
- Required **repository variables**, not created by CD-A:
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
without changes. Its sufficiency under **actual GitHub WIF execution** is still
the point of PE-P1C-01B; any permission failure stops the proof rather than adding
IAM, impersonation grants or secret access.

## Evidence and secret safety

The successful future run must have **both** a successful job and Step Summary
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

Record the actual successful run URL and sanitized identities in durable Current
documentation under the later evidence-closure gate; workflow existence or offline
unit-test PASS does not close PE-P1C-01B.

The P2B candidate runner currently receives its Admin credential through private
stdin. Deploy SA has **no Secret Manager payload access**. Delivery of that
credential in future CD is an unresolved, separate Human Decision after this
submission proof. CD-A does not add secretAccessor, repository/Environment secrets,
new SAs or Token Creator, and does not decide that delivery mechanism.

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
remain the regression gates; none are a substitute for the separately approved
future GitHub OIDC/WIF runtime proof.
