# Portfolio Infrastructure Ownership

- **Decision status:** Approved for Portfolio Finish P1
- **Implementation status:** P1B existing-production adoption, P1C-A disabled-WIF foundation, P1C-B operational least-privilege IAM, and P1C-C dedicated Build execution complete; remote GCS state contains 30 resources and the current Terraform plan is zero-drift
- **Scope ceiling:** [Portfolio Completion Contract Must 3 and Must 4](./portfolio-completion-contract.md)
- **Production contract:** [Cloud Run deployment runbook](./cloud-run-deployment-runbook.md)

## Core ownership rule

Terraform and CD must not compete for the same mutable production state.

**Cloud Run services themselves remain CD-owned.** The application image, revision template, environment/runtime configuration, Secret Manager version references, candidate tag, traffic allocation, promotion, and rollback pair form one mutable delivery contract already governed by CD and the runbook. Terraform therefore does not define or import `google_cloud_run_v2_service`, and broad `ignore_changes` is not the selected design.

## Approved ownership matrix

| Resource or state | Ownership | Current status and boundary |
| --- | --- | --- |
| Dedicated GCS Terraform state bucket | Terraform Owns | Manually bootstrapped, verified, imported, and used by the initialized GCS backend |
| Artifact Registry repository `workout-journal` | Terraform Owns | Imported into remote state; zero-drift verified |
| Backend and Frontend runtime Service Accounts | Terraform Owns | Both existing runtime identities are in remote state; zero-drift verified |
| Secret Manager secret metadata | Terraform Owns | Two metadata-only resources are in remote state; secret versions and values remain excluded |
| Backend runtime access to the two secrets | Terraform Owns | Two exact additive `secretAccessor` members are in remote state; zero-drift verified |
| IAM, Cloud Resource Manager, IAM Credentials, and STS APIs | Terraform Owns | Four prerequisite `google_project_service` resources are enabled and protected from disable-on-destroy |
| Deploy Service Account `workout-journal-deploy` | Terraform Owns | Keyless identity with exact P1C-A impersonation and P1C-B operational additive members; provider remains disabled |
| Build Service Account `workout-journal-build` | Terraform Owns | Keyless identity with exact P1C-B build permissions; P1C-C runtime-verified its repository build, two image pushes, and Cloud Logging path |
| WIF pool `github-actions` and provider `workout-journal` | Terraform Owns | Pool is `ACTIVE` / `FEDERATION_ONLY`; provider resource is `ACTIVE` but remains `disabled = true` |
| Deploy-SA WIF impersonation member | Terraform Owns | Exact additive `roles/iam.workloadIdentityUser` member scoped to repository ID `790375516` |
| P1C-B operational IAM members | Terraform Owns | Exactly 13 additive members are in remote state and actual IAM; zero-drift verified |
| Cloud Run services, image, revision, env, secret-version refs, tags, and traffic | CD Owns | No Terraform resource or import |
| Cloud Build source bucket body `workout-journal-506909_cloudbuild` | External / Manually Managed | Terraform owns only the three exact P1C-B additive bucket IAM members, not the bucket body or legacy members |
| Candidate creation, promotion, post-deploy verification, and rollback pair | CD / runbook Owns | Must preserve the current paired-release contract |
| Human Owner bindings and Google-managed service agents | External / Manually Managed | Terraform must not adopt them |
| Supabase infrastructure | External / Manually Managed | Outside Terraform scope |
| GitHub Environment and branch protection | External / Manually Managed | Future GitHub governance work; not changed in P1B |
| Secret versions, values, and payloads | Do Not Manage | Never enter Terraform configuration, plan, or state |
| Compute default Service Account | Do Not Manage | P1C migration/hardening target only; no role cleanup has occurred |
| Legacy Cloud Build Service Account | Do Not Manage | Not an adoption target |
| Service Account keys and long-lived GCP JSON credentials | Do Not Manage | Keyless federation is required |
| Monitoring and alert resources | Future / Pending | Not implemented; deferred to Must 5 design |

The current remote state contains exactly 30 resources: the eight-resource P1B foundation, the nine-resource P1C-A identity foundation, and the 13-resource P1C-B operational IAM layer. The reviewed P1C-B apply added 13 resources without changing or destroying existing infrastructure, actual IAM read-back matched every member, and the post-apply plan is zero-drift.

## CD-owned delivery contract

Terraform does not own any step below:

```text
main merge
-> CI success
-> GitHub OIDC / GCP WIF authentication
-> Cloud Build invocation
-> immutable Backend and Frontend digest resolution
-> new CANDIDATE_ID
-> Backend 0% candidate deployment
-> exact Backend tagged URL capture and verification
-> Frontend 0% candidate deployment with that exact URL
-> automated production-like E2E smoke
-> production Environment approval
-> Backend promotion
-> Frontend promotion
-> post-deploy verification and evidence
-> paired rollback by recorded revision names when required
```

Each release attempt gets a never-reused `CANDIDATE_ID`. A Backend tag referenced by a known-good or rollback-eligible Frontend revision is not moved or removed. Rollback restores the compatible revision pair recorded by the runbook; Terraform does not reconstruct or reconcile it.

## Completed P1C-A identity foundation and P1C-B operations

P1C-A created and verified the identity foundation in Terraform. Its GitHub provider is explicitly disabled, and its only new IAM grant is the additive repository-ID-scoped `roles/iam.workloadIdentityUser` member on the dedicated deploy Service Account. No operational deploy/build role is part of P1C-A.

Future GitHub Actions authentication is keyless Service Account impersonation:

```text
GitHub Actions OIDC
-> workload identity pool github-actions
-> provider workout-journal
-> repository/branch/workflow-constrained principal
-> workout-journal-deploy Service Account impersonation
```

The provider maps:

```text
google.subject                = assertion.sub
attribute.repository_owner_id = assertion.repository_owner_id
attribute.repository_id       = assertion.repository_id
attribute.repository_owner    = assertion.repository_owner
attribute.repository          = assertion.repository
attribute.ref                 = assertion.ref
attribute.workflow_ref        = assertion.workflow_ref
```

The provider trust condition requires all of:

```text
repository_owner_id == 95160728
repository_id       == 790375516
repository_owner    == tyosu131
repository          == tyosu131/Workout-Journal
ref                 == refs/heads/main
workflow_ref        == tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main
```

Numeric owner/repository IDs are the stable trust anchors; name checks provide defense in depth and make intent reviewable. P1C-A owns `roles/iam.workloadIdentityUser` on the deploy Service Account, limited to repository ID `790375516` through the mapped repository principal. The provider resource state is `ACTIVE`, but `disabled = true` remains the authentication gate until a later activation review. P1C-B owns only the exact additive permissions needed to invoke Cloud Build and perform the approved Cloud Run delivery contract, including `actAs` only for the dedicated build and approved runtime Service Accounts. It grants no Secret Manager payload access.

Google requires mappings for claims used in provider conditions and recommends restricting a shared GitHub issuer with an attribute condition. GitHub documents `repository_owner_id`, `repository_id`, `repository_owner`, `repository`, `ref`, and `workflow_ref` as OIDC token claims. See [Google Cloud deployment-pipeline federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) and the [GitHub OIDC claim reference](https://docs.github.com/en/actions/reference/security/oidc).

## Production Environment and activation dependency

The future GitHub Environment decision is:

| Setting | Approved value |
| --- | --- |
| Environment | `production` |
| Required reviewer | Repository owner / `tyosu131` |
| Prevent self-review | `false` |
| Administrator bypass | Disabled |
| Deployment branch | `main` after `main` is protected |

This is an explicit owner release checkpoint for a solo project, not independent four-eyes approval.

Production CD must not be activated while `main` remains unprotected. The required sequence is:

```text
Terraform/WIF foundation
-> main branch protection + required CI checks
-> automated candidate E2E
-> CD activation
```

The Environment and branch protection were not created by P1C-A. Their future implementation must be verified from actual GitHub settings, not inferred from workflow files. See GitHub's official documentation for [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Dedicated build identity decision

The dedicated build Service Account has the exact P1C-B Artifact Registry writer, Cloud Logging writer, and source-object viewer members. P1C-C runtime-verified that role set for the repository build path. The deploy Service Account has the exact build invocation, Service Usage, resource-scoped Artifact Registry/Cloud Run/Storage, and three `actAs` members required by the approved hypothesis, but its submission path under WIF remains unproven.

P1C-B correction closure: future `gcloud builds submit` runs as the dedicated deploy Service Account and stages local source into `workout-journal-506909_cloudbuild`. The current 13-member layer therefore includes deploy `roles/storage.objectCreator` and `roles/storage.bucketViewer` on that exact bucket, plus project `roles/serviceusage.serviceUsageConsumer` for `serviceusage.services.use`. The previous `10 add` and intermediate `12 add` expectations are historical and obsolete.

P1C-C selected `projects/workout-journal-506909/serviceAccounts/workout-journal-build@workout-journal-506909.iam.gserviceaccount.com` in `cloudbuild.yaml` and preserved `CLOUD_LOGGING_ONLY`. Human-gated build `44a37101-eb7c-4f12-8901-5b3854afd7ae` completed with `SUCCESS` from exact tested commit `709c55a934783917184d09831facc085e7bc19c9`; build metadata confirmed that dedicated Build Service Account as the actual execution identity and the logs were readable.

`PE-P1C-01A — Dedicated Build execution` is Closed by that build. The verified scope is repository source build, Backend and Frontend Docker builds, Backend and Frontend Artifact Registry pushes, and Cloud Logging. The exact-SHA verification artifacts resolve to immutable digests:

- Backend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-backend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:a36a6e9ee78ab59c8de5eccd1595bb740342e31b896acea0cb20aed1d8614c04`
- Frontend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-frontend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:d65af4c241e31658d684191f1d831b79d9bb6bd5b0043ea315affcd1ed0d7ea6`

They are P1C-C verification artifacts, not production-deployed images. Backend and Frontend Cloud Run state remained unchanged, and there was no Cloud Run Admin Activity during the build execution window.

`PE-P1C-01B — Deploy submission / WIF path` remains Open. The successful build was submitted by the current human operator and does not independently prove that the dedicated Deploy Service Account under intended GitHub WIF credentials can stage source, invoke Cloud Build, attach the Build Service Account, or complete the submission path. The provider remains disabled, production CD is not active, and no Service Account Token Creator grant may be added merely to simulate this evidence.

Compute default Service Account Editor removal is **not** part of initial creation. Any removal requires all three gates:

```text
dedicated build succeeds
+ dependency audit confirms no other required use
+ separate Human Gate
```

P1C-C satisfies only `dedicated build succeeds`. The dependency audit and separate Human Gate remain required, so the Compute default Service Account remains Do Not Manage and its Editor role has not been removed.

P1B created no new IAM binding and changed no existing cloud IAM policy. It adopted only the two previously verified additive Backend `secretAccessor` members. P1C-A added one additive, repository-scoped impersonation member. P1C-B added exactly 13 additive operational IAM members without taking authoritative ownership of any policy. Human members and legacy bucket IAM remain external; any Compute default Service Account cleanup remains future, separately gated work.

## Completed P1B state ownership and adoption record

In P1A, `workout-journal-506909-tfstate` was a candidate whose global availability was Pending Evidence. P1B confirmed availability by creating the dedicated bucket through its Human Gate, verified the complete bootstrap contract, and completed the following adoption sequence:

1. Verify the candidate bucket name is globally available.
2. With Human approval, manually bootstrap the bucket once using the approved settings.
3. Before adding the import block or initializing the backend, retrieve the actual bucket metadata with the read-only command below.
4. Confirm that every read-back property exactly matches the approved contract.
5. Stop if any property is absent or differs.
6. Add the state bucket import block.
7. Initialize the GCS backend.
8. Produce an imports-only plan for the bucket plus the seven verified existing targets.
9. Stop for the Human Gate and review the complete plan.
10. Apply only the reviewed eight imports.
11. Require a second plan of `0 to add, 0 to change, 0 to destroy`.

```bash
gcloud storage buckets describe \
  gs://workout-journal-506909-tfstate \
  --raw \
  --format=json
```

The read-back contract uses the actual raw API fields: `name` must be `workout-journal-506909-tfstate`; `projectNumber` must be `437413312066`, which is the approved project `workout-journal-506909`; `location` must be `ASIA-NORTHEAST1`, the API representation of `asia-northeast1`; `iamConfiguration.uniformBucketLevelAccess.enabled` must be `true`; `iamConfiguration.publicAccessPrevention` must be `enforced`; and `versioning.enabled` must be `true`. A successful create command alone does not pass this gate.

The read-back matched every required property before import and backend initialization. `force_destroy = false` and `prevent_destroy = true` are Terraform configuration protections rather than remote bucket properties and were not part of the read-back.

The reviewed imports-only plan and the import apply both reported no resource create, update, destroy, or replacement. The required post-import baseline plan reported:

```text
0 to add
0 to change
0 to destroy
```

At P1B closure, remote state contained exactly the eight approved resources. No secret values entered configuration, plan output, or state. No hardening, new identity, WIF, or IAM redesign was mixed into that adoption.

PE-1 is Closed by the successful eight-resource import and post-import zero-drift plan. PE-2 is Closed by the successful bucket bootstrap, exact property read-back, state-bucket import block, and initialized GCS backend.

## Human gates and deferred risk

| Action | Risk | Required gate / status |
| --- | --- | --- |
| State bucket bootstrap and first remote state | High | P1B complete: read-back verified, backend initialized, and zero-drift confirmed |
| Existing resource and IAM-member import | High | P1B complete: eight imports, no resource mutation, and zero-drift confirmed |
| Disabled WIF foundation and exact trust condition | High | P1C-A complete: actual mapping/condition verified, provider disabled, and zero-drift confirmed |
| Dedicated deploy/build SA creation | High | P1C-A complete: both identities exist with zero user-managed keys and no operational roles |
| P1C-B operational IAM | High | Complete: exact 13-member additive matrix applied, actual read-back matched, and zero-drift confirmed |
| P1C-C dedicated Build execution | High | Complete: build `44a37101-eb7c-4f12-8901-5b3854afd7ae` succeeded from exact commit `709c55a934783917184d09831facc085e7bc19c9` using the dedicated Build Service Account; Cloud Run remained unchanged |
| Compute default SA role removal | High | Successful dedicated build, dependency audit, separate Human Gate |
| Production CD activation | High | Protected `main`, required CI, automated candidate E2E, Environment approval |
| Cloud Run ownership change | High | Not approved; would require a new owner decision |
