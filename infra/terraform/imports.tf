# These import blocks target only resources verified to exist during P1.
# The state bucket block was added only after the P1B bootstrap read-back passed.

import {
  to = google_storage_bucket.terraform_state
  id = "workout-journal-506909/workout-journal-506909-tfstate"
}

import {
  to = google_artifact_registry_repository.workout_journal
  id = "projects/workout-journal-506909/locations/asia-northeast1/repositories/workout-journal"
}

import {
  to = google_service_account.backend_runtime
  id = "projects/workout-journal-506909/serviceAccounts/workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com"
}

import {
  to = google_service_account.frontend_runtime
  id = "projects/workout-journal-506909/serviceAccounts/workout-journal-frontend-run@workout-journal-506909.iam.gserviceaccount.com"
}

import {
  to = google_secret_manager_secret.supabase_secret_key
  id = "projects/workout-journal-506909/secrets/workout-journal-supabase-secret-key"
}

import {
  to = google_secret_manager_secret.jwt_secret
  id = "projects/workout-journal-506909/secrets/workout-journal-jwt-secret"
}

import {
  to = google_secret_manager_secret_iam_member.backend_supabase_secret_accessor
  id = "projects/workout-journal-506909/secrets/workout-journal-supabase-secret-key roles/secretmanager.secretAccessor serviceAccount:workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com"
}

import {
  to = google_secret_manager_secret_iam_member.backend_jwt_secret_accessor
  id = "projects/workout-journal-506909/secrets/workout-journal-jwt-secret roles/secretmanager.secretAccessor serviceAccount:workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com"
}
