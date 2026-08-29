# Portfolio Infrastructure Ownership

- **Decision status:** Approved for Portfolio Finish P1
- **Implementation status:** P1A baseline configuration only; no Terraform state or cloud mutation exists yet
- **Scope ceiling:** [Portfolio Completion Contract Must 3 and Must 4](./portfolio-completion-contract.md)
- **Production contract:** [Cloud Run deployment runbook](./cloud-run-deployment-runbook.md)

## Core ownership rule

Terraform and CD must not compete for the same mutable production state.

**Cloud Run services themselves remain CD-owned.** The application image, revision template, environment/runtime configuration, Secret Manager version references, candidate tag, traffic allocation, promotion, and rollback pair form one mutable delivery contract already governed by CD and the runbook. Terraform therefore does not define or import `google_cloud_run_v2_service`, and broad `ignore_changes` is not the selected design.

## Approved ownership matrix

| Resource or state | Ownership | P1A status and boundary |
| --- | --- | --- |
| Dedicated GCS Terraform state bucket | Terraform Owns after manual bootstrap and import | Desired resource is defined; bucket does not yet exist |
| Artifact Registry repository `workout-journal` | Terraform Owns after import | Existing-resource import baseline defined |
| Backend and Frontend runtime Service Accounts | Terraform Owns after import | Only the two existing runtime identities are defined |
| Secret Manager secret metadata | Terraform Owns after import | Automatic replication metadata only |
| Backend runtime access to the two secrets | Terraform Owns after import | Exact additive `secretAccessor` members only |
| Deploy Service Account `workout-journal-deploy` | Terraform Owns | Approved Next Work; not defined or created in P1A |
| Build Service Account `workout-journal-build` | Terraform Owns | Approved Next Work; not defined or created in P1A |
| WIF pool `github-actions` and provider `workout-journal` | Terraform Owns | Approved Next Work; not defined or created in P1A |
| Cloud Run services, image, revision, env, secret-version refs, tags, and traffic | CD Owns | No Terraform resource or import |
| Candidate creation, promotion, post-deploy verification, and rollback pair | CD / runbook Owns | Must preserve the current paired-release contract |
| Human Owner bindings and Google-managed service agents | External / Manually Managed | Terraform must not adopt them |
| Supabase infrastructure | External / Manually Managed | Outside Terraform scope |
| GitHub Environment and branch protection | External / Manually Managed | Future GitHub governance work; not changed in P1A |
| Secret versions, values, and payloads | Do Not Manage | Never enter Terraform configuration, plan, or state |
| Compute default Service Account | Do Not Manage | Migration target only until dedicated build verification succeeds |
| Legacy Cloud Build Service Account | Do Not Manage | Not an adoption target |
| Service Account keys and long-lived GCP JSON credentials | Do Not Manage | Keyless federation is required |
| Monitoring and alert resources | Deferred / Pending | Deferred to Must 5 design |

“Terraform Owns” above is the approved target ownership. Existing objects do not become Terraform-managed until the P1B import plan is reviewed and applied. New deploy/build/WIF resources belong to a later, separately reviewed P1 plan and must not be mixed into the initial adoption plan.

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

## Approved next identity work

Future GitHub Actions authentication is keyless Service Account impersonation:

```text
GitHub Actions OIDC
-> workload identity pool github-actions
-> provider workout-journal
-> repository/branch/workflow-constrained principal
-> workout-journal-deploy Service Account impersonation
```

The provider must map at least:

```text
google.subject                = assertion.sub
attribute.repository_owner_id = assertion.repository_owner_id
attribute.repository_id       = assertion.repository_id
attribute.repository_owner    = assertion.repository_owner
attribute.repository          = assertion.repository
attribute.ref                 = assertion.ref
attribute.workflow_ref        = assertion.workflow_ref
```

The provider trust condition must require all of:

```text
repository_owner_id == 95160728
repository_id       == 790375516
repository_owner    == tyosu131
repository          == tyosu131/Workout-Journal
ref                 == refs/heads/main
workflow_ref        == tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main
```

Numeric owner/repository IDs are the stable trust anchors; name checks provide defense in depth and make intent reviewable. The future `roles/iam.workloadIdentityUser` grant belongs on the deploy Service Account and must be limited to the mapped repository principal. The deploy identity receives only the permissions needed to invoke Cloud Build and perform the approved Cloud Run delivery contract, including `actAs` only for the dedicated build and approved runtime Service Accounts. It does not need Secret Manager payload access merely to deploy a revision that references existing secret versions.

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

The Environment and branch protection are not created in P1A. Their future implementation must be verified from actual GitHub settings, not inferred from workflow files. See GitHub's official documentation for [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Dedicated build identity decision

A dedicated build Service Account is approved. The future custom build identity should own the least-privilege Artifact Registry write and Cloud Logging write path; the deploy identity should be able to invoke builds and act as that build identity only as required. The exact permissions must be reviewed against the final `cloudbuild.yaml` and Google's [user-specified Cloud Build Service Account guidance](https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts) before creation.

Compute default Service Account Editor removal is **not** part of initial creation. Any removal requires all three gates:

```text
dedicated build succeeds
+ dependency audit confirms no other required use
+ separate Human Gate
```

P1A changes no IAM binding.

## State ownership and adoption gate

The candidate bucket is `workout-journal-506909-tfstate`; global availability is Pending Evidence. Because a GCS backend requires a pre-existing bucket, P1B must use this exact Human-gated order:

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

If any read-back property differs, stop before adding or executing the state bucket import, backend initialization, any Terraform plan, or any Terraform import/apply operation. `force_destroy = false` and `prevent_destroy = true` are Terraform configuration protections rather than remote bucket properties and are not part of the read-back.

The adoption gate is an imports-only plan followed by a baseline plan of:

```text
0 to add
0 to change
0 to destroy
```

No hardening, new identity, WIF, or IAM redesign may be mixed into that first baseline. State and plan design contains no secret values.

Provider refresh/import zero-drift remains PE-1. State bucket global availability, manual bootstrap, actual property read-back, its import block, and backend initialization remain PE-2. This P1A documentation does not close either Pending Evidence item.

## Human gates and deferred risk

| Future action | Risk | Required gate |
| --- | --- | --- |
| State bucket bootstrap and first remote state | High | Post-bootstrap read-only property verification before import/backend initialization, then reviewed imports-only plan |
| Existing resource and IAM-member import | High | Exact identifiers and zero-change post-import plan |
| WIF attribute mapping and trust condition | High | Numeric/name/ref/workflow claim review |
| Dedicated deploy/build SA and IAM creation | High | Least-privilege permission review |
| Compute default SA role removal | High | Successful dedicated build, dependency audit, separate Human Gate |
| Production CD activation | High | Protected `main`, required CI, automated candidate E2E, Environment approval |
| Cloud Run ownership change | High | Not approved; would require a new owner decision |
