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
