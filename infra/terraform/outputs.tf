output "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID used by the delivery pipeline."
  value       = google_artifact_registry_repository.workout_journal.repository_id
}

output "artifact_registry_repository_location" {
  description = "Artifact Registry repository location used by the delivery pipeline."
  value       = google_artifact_registry_repository.workout_journal.location
}

output "backend_runtime_service_account_email" {
  description = "Backend Cloud Run runtime service account email."
  value       = google_service_account.backend_runtime.email
}

output "frontend_runtime_service_account_email" {
  description = "Frontend Cloud Run runtime service account email."
  value       = google_service_account.frontend_runtime.email
}

output "deploy_service_account_email" {
  description = "Dedicated deployment service account email."
  value       = google_service_account.deploy.email
}

output "build_service_account_email" {
  description = "Dedicated Cloud Build service account email."
  value       = google_service_account.build.email
}

output "github_actions_workload_identity_pool_name" {
  description = "Canonical name of the GitHub Actions Workload Identity Pool."
  value       = google_iam_workload_identity_pool.github_actions.name
}

output "workout_journal_workload_identity_provider_name" {
  description = "Canonical name of the disabled Workout Journal OIDC provider."
  value       = google_iam_workload_identity_pool_provider.workout_journal.name
}
