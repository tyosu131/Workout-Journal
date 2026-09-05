# Workout-Journal Terraform baseline

## Purpose and boundary

This root manages the approved Terraform foundation for project `workout-journal-506909` in `asia-northeast1`.

- **P1A (Historical):** Created the configuration-only existing-infrastructure adoption baseline. At that point no backend initialization, state, import, plan, apply, IAM change, or cloud resource creation had been performed.
- **P1B (Current):** Manually bootstrapped and verified the dedicated state bucket, initialized the GCS backend, and imported all eight approved existing resources into remote state. The reviewed import apply reported `8 imported, 0 added, 0 changed, 0 destroyed`, and the post-import second plan reported no changes.
- **P1C-A (Current):** Applied and verified the additive, initially inert identity foundation: four prerequisite APIs, dedicated deploy/build Service Accounts, one federation-only pool, one disabled GitHub OIDC provider, and one repository-ID-scoped impersonation member. The reviewed apply reported `9 added, 0 changed, 0 destroyed`, and the post-apply plan reported no changes.
- **P1C-B (Current):** Applied and verified exactly 13 additive operational IAM members for the approved deploy/build command path. The reviewed apply reported `13 added, 0 changed, 0 destroyed`, bringing remote state to 30 resources; the post-apply plan reported no changes.
- **P1C-C dedicated Build execution (Current / Complete):** Human-gated build `44a37101-eb7c-4f12-8901-5b3854afd7ae` succeeded from exact tested commit `709c55a934783917184d09831facc085e7bc19c9` using the dedicated Build Service Account. Both exact-SHA image tags resolve to immutable digests, `CLOUD_LOGGING_ONLY` logs are readable, and Cloud Run remained unchanged.
- **P1C-D2 Compute default SA Editor cleanup (Current / Complete):** P1C-D found zero current active dependencies and returned `SAFE_CANDIDATE`; after a separate Human Gate, P1C-D2 removed only the legacy project-level `roles/editor` binding outside Terraform. The Compute default Service Account still exists, remains enabled, and is not Terraform-managed.

PE-1 (provider refresh/import zero-drift), PE-2 (state bucket bootstrap, read-back, import block, and backend initialization), and PE-P1C-01A (dedicated Build execution) are Closed. Portfolio Must 3 remains In progress because PE-P1C-01B deploy submission under WIF/CD, provider activation, and subsequent hardening remain future work.

This root intentionally contains no Cloud Run service bodies, Secret Manager versions or payloads, Service Account keys, authoritative IAM policy/binding resources, or monitoring resources. P1C-B owns only exact additive IAM members on approved project/resource scopes. The P1C-A deploy/build identities and Workload Identity Federation resources are protected by `prevent_destroy`; the OIDC provider remains explicitly disabled. Cloud Run services and their mutable delivery state remain CD-owned; see [the ownership decision](../../docs/portfolio-infra-ownership.md).

## Toolchain decision

- Terraform is constrained to `~> 1.16.0`. HashiCorp's official release index and official container identified Terraform 1.16.0 as the current stable line when P1A was authored, and this line supports configuration-driven `import` blocks.
- `hashicorp/google` is pinned to exactly `7.45.0`, the current official provider release when P1A was authored. Exact pinning plus the dependency lock file keeps the first adoption plan reproducible; provider upgrades require a separate reviewed change.
- The dependency lock file retains the official provider checksums used for `darwin_arm64` and `linux_amd64`; it contains no credential or local path data.
- The provider uses Application Default Credentials or other ambient Google credentials. Configuration contains no JSON credential, key file, inline token, or credential environment value.

Official references: [Terraform installation and current release](https://developer.hashicorp.com/terraform/install), [Google provider 7.45.0](https://registry.terraform.io/providers/hashicorp/google/7.45.0), and [configuration-driven import blocks](https://developer.hashicorp.com/terraform/language/block/import).

## Current Terraform-managed resources

| Terraform address | Managed object |
| --- | --- |
| `google_storage_bucket.terraform_state` | Dedicated GCS backend bucket `workout-journal-506909-tfstate` |
| `google_artifact_registry_repository.workout_journal` | Docker standard repository `workout-journal` |
| `google_service_account.backend_runtime` | `workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com` |
| `google_service_account.frontend_runtime` | `workout-journal-frontend-run@workout-journal-506909.iam.gserviceaccount.com` |
| `google_secret_manager_secret.supabase_secret_key` | Secret metadata for `workout-journal-supabase-secret-key` |
| `google_secret_manager_secret.jwt_secret` | Secret metadata for `workout-journal-jwt-secret` |
| `google_secret_manager_secret_iam_member.backend_supabase_secret_accessor` | Exact Backend runtime `secretAccessor` member |
| `google_secret_manager_secret_iam_member.backend_jwt_secret_accessor` | Exact Backend runtime `secretAccessor` member |
| `google_project_service.iam` | IAM API `iam.googleapis.com` |
| `google_project_service.cloud_resource_manager` | Cloud Resource Manager API `cloudresourcemanager.googleapis.com` |
| `google_project_service.iam_credentials` | IAM Service Account Credentials API `iamcredentials.googleapis.com` |
| `google_project_service.security_token_service` | Security Token Service API `sts.googleapis.com` |
| `google_service_account.deploy` | `workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com` |
| `google_service_account.build` | `workout-journal-build@workout-journal-506909.iam.gserviceaccount.com` |
| `google_iam_workload_identity_pool.github_actions` | Federation-only pool `github-actions` |
| `google_iam_workload_identity_pool_provider.workout_journal` | Disabled GitHub OIDC provider `workout-journal` |
| `google_service_account_iam_member.deploy_workload_identity_user` | Exact repository principal's additive deploy-SA impersonation member |
| `google_project_iam_member.deploy_cloud_build_editor` | Deploy SA Cloud Build invocation member on project `workout-journal-506909` |
| `google_project_iam_member.deploy_service_usage_consumer` | Deploy SA Service Usage consumer member on project `workout-journal-506909` |
| `google_artifact_registry_repository_iam_member.deploy_artifact_registry_reader` | Deploy SA reader member on Artifact Registry repository `workout-journal` |
| `google_cloud_run_v2_service_iam_member.deploy_backend_run_developer` | Deploy SA developer member on Backend Cloud Run service |
| `google_cloud_run_v2_service_iam_member.deploy_frontend_run_developer` | Deploy SA developer member on Frontend Cloud Run service |
| `google_service_account_iam_member.deploy_build_act_as` | Deploy SA `actAs` member on the dedicated build SA |
| `google_service_account_iam_member.deploy_backend_runtime_act_as` | Deploy SA `actAs` member on the Backend runtime SA |
| `google_service_account_iam_member.deploy_frontend_runtime_act_as` | Deploy SA `actAs` member on the Frontend runtime SA |
| `google_storage_bucket_iam_member.deploy_source_object_creator` | Deploy SA source-object creator member on `workout-journal-506909_cloudbuild` |
| `google_storage_bucket_iam_member.deploy_source_bucket_viewer` | Deploy SA bucket-metadata viewer member on `workout-journal-506909_cloudbuild` |
| `google_artifact_registry_repository_iam_member.build_artifact_registry_writer` | Build SA writer member on Artifact Registry repository `workout-journal` |
| `google_project_iam_member.build_log_writer` | Build SA Logging writer member on project `workout-journal-506909` |
| `google_storage_bucket_iam_member.build_source_reader` | Build SA source-object reader member on `workout-journal-506909_cloudbuild` |

Remote state contains exactly these 30 resources: the eight-resource P1B foundation, the nine-resource P1C-A identity foundation, and the 13-resource P1C-B operational IAM layer.

The repository description, Service Account display names, automatic secret replication, and the two IAM members were rechecked against read-only GCP metadata before encoding them. The import IDs use the fully qualified formats documented for [Artifact Registry repositories](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/artifact_registry_repository), [Service Accounts](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/google_service_account), [Secret Manager secrets](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret), and [Secret Manager IAM](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret_iam).

Secret IAM uses only `google_secret_manager_secret_iam_member`. This resource is additive: it owns the exact machine member without becoming authoritative for other members or the whole policy. Policy and binding resources are intentionally absent.

## GCS backend and completed P1B adoption

The configured backend is a dedicated GCS bucket with prefix `production`. HashiCorp requires the GCS backend bucket to exist before backend initialization and recommends Object Versioning for recovery. Google also documents uniform bucket-level access and enforced public access prevention for Terraform state. See the [GCS backend reference](https://developer.hashicorp.com/terraform/language/backend/gcs) and [Google Cloud state guidance](https://cloud.google.com/docs/terraform/resource-management/store-state).

P1B established and verified the current backend state:

- bucket `workout-journal-506909-tfstate` exists in project number `437413312066` and location `ASIA-NORTHEAST1`;
- uniform bucket-level access and Object Versioning are enabled, and public access prevention is enforced;
- the GCS backend is initialized with bucket `workout-journal-506909-tfstate` and prefix `production`;
- at P1B closure, remote state contained exactly the eight P1B resources;
- the import apply changed no real infrastructure; and
- the post-import second plan is zero-drift: `No changes. Your infrastructure matches the configuration.`

### Historical P1B bootstrap/import procedure

The following Human-gated sequence was completed in P1B and is retained as adoption and recovery evidence. It must not be repeated against the current managed resources as though they were still unowned.

1. Verify the candidate bucket name is globally available.
2. With Human approval, manually create the bucket once in `asia-northeast1` with uniform bucket-level access, enforced public access prevention, and versioning enabled.
3. Immediately after creation, and before adding the import block or initializing the backend, retrieve the actual bucket metadata with this read-only inspection command documented by [`gcloud storage buckets describe`](https://cloud.google.com/sdk/gcloud/reference/storage/buckets/describe):

   ```bash
   gcloud storage buckets describe \
     gs://workout-journal-506909-tfstate \
     --raw \
     --format=json
   ```

4. Verify the actual JSON metadata against the approved bootstrap contract. The raw API field paths and required values are:

   | Actual JSON field | Required value |
   | --- | --- |
   | `name` | `workout-journal-506909-tfstate` |
   | `projectNumber` | `437413312066`, the approved project `workout-journal-506909` |
   | `location` | `ASIA-NORTHEAST1`, the API representation of `asia-northeast1` |
   | `iamConfiguration.uniformBucketLevelAccess.enabled` | `true` |
   | `iamConfiguration.publicAccessPrevention` | `enforced` |
   | `versioning.enabled` | `true` |

5. If any read-back property is absent or differs, stop before adding or executing the state bucket import, backend initialization, any Terraform plan, or any Terraform import/apply operation.
6. Only after every read-back property matches, add this configuration-driven import block to `imports.tf` using the [documented storage bucket import ID](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/storage_bucket):

   ```hcl
   import {
     to = google_storage_bucket.terraform_state
     id = "workout-journal-506909/workout-journal-506909-tfstate"
   }
   ```

7. Initialize the configured GCS backend using ambient credentials.
8. Produce a plan containing only the eight imports and `0 to add, 0 to change, 0 to destroy`.
9. Stop for the Human Gate and review the complete imports-only plan.
10. Apply only the reviewed imports.
11. Require a second plan of `0 to add, 0 to change, 0 to destroy` before any hardening or new-resource phase.

The bucket resource has `prevent_destroy = true`, `force_destroy = false`, versioning, uniform bucket-level access, and enforced public access prevention. `prevent_destroy` and `force_destroy` are Terraform configuration protections, not remote bucket properties, so they were not part of the bucket metadata read-back. The bucket was manually bootstrapped only to solve the backend dependency; after its successful import, Terraform owns its configuration.

All eight configuration-driven import blocks remain in `imports.tf` as explicit adoption evidence. With the resources already present at the same addresses in remote state, the current zero-drift plan does not attempt duplicate imports or cloud mutation.

## Completed P1C-A disabled WIF foundation

P1C-A passed its saved-plan Human Gate and added exactly nine resources with `0 changed` and `0 destroyed`. The four API services, both Service Accounts, the pool, and the provider also carry lifecycle destruction protection:

- `google_project_service` resources for IAM, Cloud Resource Manager, IAM Service Account Credentials, and Security Token Service, each with `disable_on_destroy = false`;
- dedicated `workout-journal-deploy` and `workout-journal-build` Service Accounts without keys or operational roles;
- the `github-actions` workload identity pool in `FEDERATION_ONLY` mode;
- the `workout-journal` GitHub OIDC provider with the default Google audience behavior and `disabled = true`; and
- one additive `roles/iam.workloadIdentityUser` member on the deploy Service Account, scoped to repository ID `790375516` through the pool's mapped `attribute.repository_id`.

The provider condition requires owner ID `95160728`, repository ID `790375516`, the expected owner and repository names, `refs/heads/main`, and the exact `cd.yml` workflow reference. Actual read-back confirmed that mapping and condition, pool state `ACTIVE` with mode `FEDERATION_ONLY`, and provider state `ACTIVE` with `disabled = true`. Here `ACTIVE` is the provider resource lifecycle state; disabled providers cannot perform new token exchanges.

At P1C-A closure, the dedicated deploy and build Service Accounts each had zero user-managed keys; the deploy Service Account had only the exact P1C-A `roles/iam.workloadIdentityUser` binding, and the build Service Account had no IAM binding. P1C-B subsequently added only the exact operational members documented below.

The WIF foundation and P1C-B operational IAM exist, but production authentication and CD are not active. The provider remains disabled. [CD-A](../../docs/wif-submission-proof.md) now supplies `cd.yml` as a manual submission-proof workflow only; it has not been dispatched and does not implement full CD. P1C-C runtime-verified the dedicated Build Service Account only; PE-P1C-01B Deploy-SA submission under WIF remains Open and unproven. Compute default Service Account Editor cleanup completed separately in P1C-D2; provider activation and production CD activation remain later gates. CD-A changes no Terraform resources or IAM.

## Completed P1C-B operational IAM

P1C-B passed its saved-plan Human Gate and applied exactly these 13 additive IAM members with `0 changed` and `0 destroyed`:

| Principal | Role | Scope | Count |
| --- | --- | --- | ---: |
| Deploy Service Account | `roles/cloudbuild.builds.editor` | Project `workout-journal-506909` | 1 |
| Deploy Service Account | `roles/serviceusage.serviceUsageConsumer` | Project `workout-journal-506909` | 1 |
| Deploy Service Account | `roles/artifactregistry.reader` | Artifact Registry repository `workout-journal` | 1 |
| Deploy Service Account | `roles/run.developer` | Backend and Frontend Cloud Run services separately | 2 |
| Deploy Service Account | `roles/iam.serviceAccountUser` | Build, Backend runtime, and Frontend runtime Service Accounts separately | 3 |
| Deploy Service Account | `roles/storage.objectCreator` | Bucket `workout-journal-506909_cloudbuild` | 1 |
| Deploy Service Account | `roles/storage.bucketViewer` | Bucket `workout-journal-506909_cloudbuild` | 1 |
| Build Service Account | `roles/artifactregistry.writer` | Artifact Registry repository `workout-journal` | 1 |
| Build Service Account | `roles/logging.logWriter` | Project `workout-journal-506909` | 1 |
| Build Service Account | `roles/storage.objectViewer` | Bucket `workout-journal-506909_cloudbuild` | 1 |

The Service Usage grant supplies `serviceusage.services.use`, which the current Cloud Build CLI submission contract requires in addition to Cloud Build Editor. The source-staging correction is also included: the deploy identity can create the local-source archive and read bucket metadata on the exact Cloud Build source bucket, while the build identity can only read staged source objects. The previous `10 add` and intermediate `12 add` assumptions are historical and obsolete. Actual read-back confirmed all 13 exact members, remote state contains 30 resources, and the post-apply plan is zero-drift: `No changes. Your infrastructure matches the configuration.`

All resources use additive `*_iam_member` forms. The Cloud Run resources own only service-level IAM membership, not service configuration, revisions, images, environment, tags, traffic, promotion, or rollback state. P1C-B grants no project-wide `serviceAccountUser`, Secret Manager access, Service Account Token Creator, basic role, or Service Account key. The WIF provider remains disabled.

## Completed P1C-C dedicated Build execution

`PE-P1C-01A — Dedicated Build execution` is Closed. Human-gated Cloud Build `44a37101-eb7c-4f12-8901-5b3854afd7ae` completed with `SUCCESS` from exact tested commit `709c55a934783917184d09831facc085e7bc19c9`. Build metadata reported the actual execution identity as `projects/workout-journal-506909/serviceAccounts/workout-journal-build@workout-journal-506909.iam.gserviceaccount.com` and logging as `CLOUD_LOGGING_ONLY`; the logs were readable.

The build completed the repository source build, Backend Docker build, Frontend Docker build, and both Artifact Registry pushes. The exact-SHA verification artifacts resolve to these immutable digests:

- Backend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-backend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:a36a6e9ee78ab59c8de5eccd1595bb740342e31b896acea0cb20aed1d8614c04`
- Frontend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-frontend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:d65af4c241e31658d684191f1d831b79d9bb6bd5b0043ea315affcd1ed0d7ea6`

These images are P1C-C verification artifacts, not production-deployed images. Backend and Frontend Cloud Run state remained unchanged, and the build execution window contained no Cloud Run Admin Activity.

`PE-P1C-01B — Deploy submission / WIF path` remains Open: can the dedicated Deploy Service Account under the intended GitHub WIF credentials stage repository source, invoke Cloud Build, attach the dedicated Build Service Account, and complete the same submission path? The successful human-submitted build does not prove that path. The provider remains disabled; P1C-C added no Service Account Token Creator grant, Service Account key, IAM change, or WIF activation.

## Completed P1C-D2 Compute default SA Editor cleanup

P1C-D completed the prerequisite dependency audit across Cloud Run, Cloud Build, Compute API state, enabled GCP services, repository references, IAM, Audit Logs, and Terraform. It found zero current active dependencies and returned `SAFE_CANDIDATE`. The only historical usage found was Cloud Build activity on 2026-08-28; the current build path uses `workout-journal-build@workout-journal-506909.iam.gserviceaccount.com`, so that history is not a current dependency.

After a separate approved Human Gate, P1C-D2 removed the single project-level `roles/editor` binding for `437413312066-compute@developer.gserviceaccount.com` outside Terraform. Post-removal read-back confirms that the binding is absent while the Service Account still exists, remains enabled, has zero user-managed keys, and has zero resource-level Service Account IAM bindings. The Service Account was not disabled, deleted, or adopted into Terraform, and its former Editor binding also remains outside Terraform ownership.

Cloud Run state remained unchanged. Backend revision `workout-journal-backend-00003-luc` continues to run as `workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com`, and Frontend revision `workout-journal-frontend-00003-xar` continues to run as `workout-journal-frontend-run@workout-journal-506909.iam.gserviceaccount.com`; each retains 100% traffic and candidate tag `candidate-0829-923536`. Post-removal lightweight production verification returned Frontend `/` `200` and Backend `/` `404`. It created no synthetic production data and triggered no password-reset or email workflow, so it is not the full v1 production smoke.

P1C-D2 did not run Cloud Build or modify `cloudbuild.yaml`; the configuration still selects the dedicated Build Service Account and preserves `CLOUD_LOGGING_ONLY`. Terraform still contains exactly 30 resources, and the post-removal plan remains zero-drift. Neither the Compute default Service Account nor its former Editor binding may be added to this Terraform root.

During the preceding dependency audit, a read-only BigQuery Data Transfer API inspection caused Google-managed service-agent provisioning. The resulting `roles/bigquerydatatransfer.serviceAgent` binding for `service-437413312066@gcp-sa-bigquerydatatransfer.iam.gserviceaccount.com` was preserved, is unrelated to P1C-D2, and remains External / Google-managed rather than Terraform-owned. Organization Policy constraint `constraints/iam.automaticIamGrantsForDefaultServiceAccounts` is currently not enforced; potential automatic-grant prevention is Backlog / separate hardening and was not a P1C-D2 completion blocker.

## Historical P1A local validation

Because the backend did not yet exist during P1A, that phase initialized Terraform with the backend disabled:

```bash
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform init -backend=false
terraform -chdir=infra/terraform validate
```

These restrictions described the completed P1A configuration-only phase. Current or future Terraform execution remains separately Human-gated according to the applicable phase; this closure task does not re-run apply or import.

## Secret and state safety

- No `google_secret_manager_secret_version` resource exists.
- No secret value, payload, credential, access token, publishable key value, or JWT value is a variable or output.
- Secret release version references remain part of the CD-owned Cloud Run revision contract.
- No Service Account key resource or tracked credential file exists.
- `.terraform/`, local state, plans, and crash logs are ignored; `.terraform.lock.hcl` is intentionally not ignored and should be kept for provider reproducibility.
