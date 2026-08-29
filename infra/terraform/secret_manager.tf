resource "google_secret_manager_secret" "supabase_secret_key" {
  project   = var.project_id
  secret_id = "workout-journal-supabase-secret-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "workout-journal-jwt-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "backend_supabase_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.supabase_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.backend_runtime.member
}

resource "google_secret_manager_secret_iam_member" "backend_jwt_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.backend_runtime.member
}
