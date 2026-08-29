resource "google_artifact_registry_repository" "workout_journal" {
  project       = var.project_id
  location      = var.region
  repository_id = "workout-journal"
  description   = "Workout Journal production container images"
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"
}
