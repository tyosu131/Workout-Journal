resource "google_service_account" "backend_runtime" {
  project      = var.project_id
  account_id   = "workout-journal-backend-run"
  display_name = "Workout Journal Backend Cloud Run"
}

resource "google_service_account" "frontend_runtime" {
  project      = var.project_id
  account_id   = "workout-journal-frontend-run"
  display_name = "Workout Journal Frontend Cloud Run"
}
