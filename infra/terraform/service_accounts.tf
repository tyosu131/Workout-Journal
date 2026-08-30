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

resource "google_service_account" "deploy" {
  project      = var.project_id
  account_id   = "workout-journal-deploy"
  display_name = "Workout Journal Deployment"
  description  = "Keyless deployment identity for the approved Workout Journal delivery workflow."

  depends_on = [
    google_project_service.iam,
    google_project_service.cloud_resource_manager,
    google_project_service.iam_credentials,
    google_project_service.security_token_service,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account" "build" {
  project      = var.project_id
  account_id   = "workout-journal-build"
  display_name = "Workout Journal Cloud Build"
  description  = "Dedicated keyless build identity reserved for the reviewed Workout Journal build migration."

  depends_on = [
    google_project_service.iam,
    google_project_service.cloud_resource_manager,
    google_project_service.iam_credentials,
    google_project_service.security_token_service,
  ]

  lifecycle {
    prevent_destroy = true
  }
}
