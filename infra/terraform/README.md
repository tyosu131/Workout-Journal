# Workout-Journal Terraform baseline

## Purpose and boundary

This root manages the approved Terraform foundation for project `workout-journal-506909` in `asia-northeast1`.

- **P1A (Historical):** Created the configuration-only existing-infrastructure adoption baseline. At that point no backend initialization, state, import, plan, apply, IAM change, or cloud resource creation had been performed.
- **P1B (Current):** Manually bootstrapped and verified the dedicated state bucket, initialized the GCS backend, and imported all eight approved existing resources into remote state. The reviewed import apply reported `8 imported, 0 added, 0 changed, 0 destroyed`, and the post-import second plan reported no changes.

PE-1 (provider refresh/import zero-drift) and PE-2 (state bucket bootstrap, read-back, import block, and backend initialization) are Closed. Portfolio Must 3 remains In progress because the P1C identity and WIF foundation has not been implemented.

This root intentionally contains no Cloud Run service resources, Secret Manager versions or payloads, Service Account keys, deploy/build Service Accounts, Workload Identity Federation resources, or monitoring resources. Cloud Run services and their mutable delivery state remain CD-owned; see [the ownership decision](../../docs/portfolio-infra-ownership.md).

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

The repository description, Service Account display names, automatic secret replication, and the two IAM members were rechecked against read-only GCP metadata before encoding them. The import IDs use the fully qualified formats documented for [Artifact Registry repositories](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/artifact_registry_repository), [Service Accounts](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/google_service_account), [Secret Manager secrets](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret), and [Secret Manager IAM](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret_iam).

Secret IAM uses only `google_secret_manager_secret_iam_member`. This resource is additive: it owns the exact machine member without becoming authoritative for other members or the whole policy. Policy and binding resources are intentionally absent.

## GCS backend and completed P1B adoption

The configured backend is a dedicated GCS bucket with prefix `production`. HashiCorp requires the GCS backend bucket to exist before backend initialization and recommends Object Versioning for recovery. Google also documents uniform bucket-level access and enforced public access prevention for Terraform state. See the [GCS backend reference](https://developer.hashicorp.com/terraform/language/backend/gcs) and [Google Cloud state guidance](https://cloud.google.com/docs/terraform/resource-management/store-state).

P1B established and verified the current backend state:

- bucket `workout-journal-506909-tfstate` exists in project number `437413312066` and location `ASIA-NORTHEAST1`;
- uniform bucket-level access and Object Versioning are enabled, and public access prevention is enforced;
- the GCS backend is initialized with bucket `workout-journal-506909-tfstate` and prefix `production`;
- remote state contains exactly the eight resources listed above;
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

## P1C future scope

P1B does not complete Portfolio Must 3. P1C remains responsible for the separately reviewed implementation of:

- the dedicated deploy Service Account;
- the dedicated build Service Account;
- the GitHub Actions Workload Identity Federation pool and provider;
- the required new machine IAM grants; and
- subsequent build-identity migration and hardening.

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
