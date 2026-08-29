# Portfolio Infrastructure Ownership

- **Decision status:** Approved for Portfolio Finish P1
- **Implementation status:** P1B existing-production adoption complete; remote GCS state contains the eight approved resources and the post-import plan is zero-drift
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
| Deploy Service Account `workout-journal-deploy` | Future Terraform ownership | P1C future work; not defined or created |
| Build Service Account `workout-journal-build` | Future Terraform ownership | P1C future work; not defined or created |
| WIF pool `github-actions` and provider `workout-journal` | Future Terraform ownership | P1C future work; not defined or created |
| Cloud Run services, image, revision, env, secret-version refs, tags, and traffic | CD Owns | No Terraform resource or import |
| Candidate creation, promotion, post-deploy verification, and rollback pair | CD / runbook Owns | Must preserve the current paired-release contract |
| Human Owner bindings and Google-managed service agents | External / Manually Managed | Terraform must not adopt them |
| Supabase infrastructure | External / Manually Managed | Outside Terraform scope |
| GitHub Environment and branch protection | External / Manually Managed | Future GitHub governance work; not changed in P1B |
| Secret versions, values, and payloads | Do Not Manage | Never enter Terraform configuration, plan, or state |
| Compute default Service Account | Do Not Manage | P1C migration/hardening target only; no role cleanup has occurred |
| Legacy Cloud Build Service Account | Do Not Manage | Not an adoption target |
| Service Account keys and long-lived GCP JSON credentials | Do Not Manage | Keyless federation is required |
| Monitoring and alert resources | Future / Pending | Not implemented; deferred to Must 5 design |

The current remote state contains exactly eight resources: the state bucket, Artifact Registry repository, two runtime Service Accounts, two Secret Manager metadata resources, and two additive Backend `secretAccessor` IAM members. P1B imported these existing objects without creating, updating, destroying, or replacing application infrastructure. New deploy/build/WIF resources and their IAM belong to P1C and are not Current.

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

## Approved P1C identity work (Future)

None of the identities, federation resources, or IAM grants in this section has been implemented by P1B.

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

The Environment and branch protection were not created in P1B. Their future implementation must be verified from actual GitHub settings, not inferred from workflow files. See GitHub's official documentation for [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Dedicated build identity decision

A dedicated build Service Account is approved. The future custom build identity should own the least-privilege Artifact Registry write and Cloud Logging write path; the deploy identity should be able to invoke builds and act as that build identity only as required. The exact permissions must be reviewed against the final `cloudbuild.yaml` and Google's [user-specified Cloud Build Service Account guidance](https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts) before creation.

Compute default Service Account Editor removal is **not** part of initial creation. Any removal requires all three gates:

```text
dedicated build succeeds
+ dependency audit confirms no other required use
+ separate Human Gate
```

P1B created no new IAM binding and changed no existing cloud IAM policy. It adopted only the two previously verified additive Backend `secretAccessor` members. Dedicated deploy/build identity IAM and any Compute default Service Account cleanup remain P1C future work.

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

Remote state now contains exactly the eight approved resources. No secret values entered configuration, plan output, or state. No hardening, new identity, WIF, or IAM redesign was mixed into the adoption.

PE-1 is Closed by the successful eight-resource import and post-import zero-drift plan. PE-2 is Closed by the successful bucket bootstrap, exact property read-back, state-bucket import block, and initialized GCS backend.

## Human gates and deferred risk

| Action | Risk | Required gate / status |
| --- | --- | --- |
| State bucket bootstrap and first remote state | High | P1B complete: read-back verified, backend initialized, and zero-drift confirmed |
| Existing resource and IAM-member import | High | P1B complete: eight imports, no resource mutation, and zero-drift confirmed |
| WIF attribute mapping and trust condition | High | Numeric/name/ref/workflow claim review |
| Dedicated deploy/build SA and IAM creation | High | Least-privilege permission review |
| Compute default SA role removal | High | Successful dedicated build, dependency audit, separate Human Gate |
| Production CD activation | High | Protected `main`, required CI, automated candidate E2E, Environment approval |
| Cloud Run ownership change | High | Not approved; would require a new owner decision |
