# Workout-Journal Terraform baseline

## Purpose and boundary

This root is the P1A existing-infrastructure adoption baseline for project `workout-journal-506909` in `asia-northeast1`. It describes only the approved resources that already exist and will be imported, plus the future state bucket that must first be manually bootstrapped and then imported.

P1A creates configuration only. No backend initialization, state, import, plan, apply, IAM change, or cloud resource creation has been performed.

This root intentionally contains no Cloud Run service resources, Secret Manager versions or payloads, Service Account keys, deploy/build Service Accounts, Workload Identity Federation resources, or monitoring resources. Cloud Run services and their mutable delivery state remain CD-owned; see [the ownership decision](../../docs/portfolio-infra-ownership.md).

## Toolchain decision

- Terraform is constrained to `~> 1.16.0`. HashiCorp's official release index and official container identified Terraform 1.16.0 as the current stable line when P1A was authored, and this line supports configuration-driven `import` blocks.
- `hashicorp/google` is pinned to exactly `7.45.0`, the current official provider release when P1A was authored. Exact pinning plus the dependency lock file keeps the first adoption plan reproducible; provider upgrades require a separate reviewed change.
- The provider uses Application Default Credentials or other ambient Google credentials. Configuration contains no JSON credential, key file, inline token, or credential environment value.

Official references: [Terraform installation and current release](https://developer.hashicorp.com/terraform/install), [Google provider 7.45.0](https://registry.terraform.io/providers/hashicorp/google/7.45.0), and [configuration-driven import blocks](https://developer.hashicorp.com/terraform/language/block/import).

## Existing resources represented

| Terraform address | Existing object |
| --- | --- |
| `google_artifact_registry_repository.workout_journal` | Docker standard repository `workout-journal` |
| `google_service_account.backend_runtime` | `workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com` |
| `google_service_account.frontend_runtime` | `workout-journal-frontend-run@workout-journal-506909.iam.gserviceaccount.com` |
| `google_secret_manager_secret.supabase_secret_key` | Secret metadata for `workout-journal-supabase-secret-key` |
| `google_secret_manager_secret.jwt_secret` | Secret metadata for `workout-journal-jwt-secret` |
| `google_secret_manager_secret_iam_member.backend_supabase_secret_accessor` | Exact Backend runtime `secretAccessor` member |
| `google_secret_manager_secret_iam_member.backend_jwt_secret_accessor` | Exact Backend runtime `secretAccessor` member |

The repository description, Service Account display names, automatic secret replication, and the two IAM members were rechecked against read-only GCP metadata before encoding them. The import IDs use the fully qualified formats documented for [Artifact Registry repositories](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/artifact_registry_repository), [Service Accounts](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/google_service_account), [Secret Manager secrets](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret), and [Secret Manager IAM](https://registry.terraform.io/providers/hashicorp/google/7.45.0/docs/resources/secret_manager_secret_iam).

Secret IAM uses only `google_secret_manager_secret_iam_member`. This resource is additive: it owns the exact machine member without becoming authoritative for other members or the whole policy. Policy and binding resources are intentionally absent.

## GCS backend bootstrap and import

The configured backend is a dedicated GCS bucket with prefix `production`. HashiCorp requires the GCS backend bucket to exist before backend initialization and recommends Object Versioning for recovery. Google also documents uniform bucket-level access and enforced public access prevention for Terraform state. See the [GCS backend reference](https://developer.hashicorp.com/terraform/language/backend/gcs) and [Google Cloud state guidance](https://cloud.google.com/docs/terraform/resource-management/store-state).

`workout-journal-506909-tfstate` is only a candidate name in P1A. It does not currently exist, and global name availability remains Pending Evidence until P1B. Do not reuse the existing `workout-journal-506909_cloudbuild` bucket.

P1B must use one Human-gated adoption operation:

1. Verify the candidate bucket name is globally available. If it is not, update both `backend.tf` and `state.tf` to the approved replacement before creating anything.
2. With Human approval, manually create the bucket once in `asia-northeast1` with uniform bucket-level access, enforced public access prevention, and versioning enabled. A successful create command alone does not pass the bootstrap gate.
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

5. If any read-back property is absent or differs, stop before adding or executing the state bucket import, backend initialization, any Terraform plan, or any Terraform import/apply operation. Correct and re-read the manually bootstrapped bucket only through a separately approved Human Gate.
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

The bucket resource has `prevent_destroy = true`, `force_destroy = false`, versioning, uniform bucket-level access, and enforced public access prevention. `prevent_destroy` and `force_destroy` are Terraform configuration protections, not remote bucket properties, so they are not part of the bucket metadata read-back. The bucket is manually bootstrapped only to solve the backend dependency; after its successful import, Terraform owns its configuration. Global availability, manual bootstrap, actual property read-back, the import block, and backend initialization remain P1B Pending Evidence until performed.

## P1A local validation

Because the backend does not exist, P1A initialization must disable it:

```bash
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform init -backend=false
terraform -chdir=infra/terraform validate
```

Do not run `plan`, `apply`, `import`, or any `state` command in P1A. A normal backend initialization is also out of scope.

## Secret and state safety

- No `google_secret_manager_secret_version` resource exists.
- No secret value, payload, credential, access token, publishable key value, or JWT value is a variable or output.
- Secret release version references remain part of the CD-owned Cloud Run revision contract.
- No Service Account key resource or tracked credential file exists.
- `.terraform/`, local state, plans, and crash logs are ignored; `.terraform.lock.hcl` is intentionally not ignored and should be kept for provider reproducibility.
