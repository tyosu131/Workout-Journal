# CD-C1 desired state only. Payload creation and runtime activation require a
# separate Human Gate; this root never manages a Supabase key or secret version.
resource "google_service_account" "e2e" {
  project      = var.project_id
  account_id   = "workout-journal-e2e"
  display_name = "Workout Journal Candidate E2E"
  description  = "Keyless candidate E2E identity; dedicated E2E secret access only."

  depends_on = [google_project_service.iam]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_secret_manager_secret" "e2e_supabase_secret_key" {
  project   = var.project_id
  secret_id = "workout-journal-e2e-supabase-secret-key"

  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_secret_manager_secret_iam_member" "e2e_supabase_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.e2e_supabase_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.e2e.member
}

resource "google_iam_workload_identity_pool_provider" "workout_journal_e2e" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "workout-journal-e2e"
  display_name                       = "Workout Journal Candidate E2E"
  description                        = "Exact main CD caller and reusable candidate E2E workflow; pending activation."
  disabled                           = true

  # Provider names are NOT an IAM principal namespace: providers share a pool.
  # Only this provider mints e2e_boundary. Do not map repository_id here: that
  # attribute is used by the existing Deploy-SA impersonation binding.
  attribute_mapping = {
    "google.subject"         = "'candidate-e2e:' + assertion.repository_id + ':' + assertion.run_id + ':' + assertion.run_attempt"
    "attribute.e2e_boundary" = "'candidate-e2e-v1'"
  }

  attribute_condition = <<-EOT
    assertion.repository_owner_id == '95160728' &&
    assertion.repository_id == '790375516' &&
    assertion.repository_owner == 'tyosu131' &&
    assertion.repository == 'tyosu131/Workout-Journal' &&
    assertion.ref == 'refs/heads/main' &&
    assertion.workflow_ref == 'tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main' &&
    assertion.job_workflow_ref == 'tyosu131/Workout-Journal/.github/workflows/candidate-e2e.yml@refs/heads/main'
  EOT

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account_iam_member" "e2e_workload_identity_user" {
  service_account_id = google_service_account.e2e.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/437413312066/locations/global/workloadIdentityPools/github-actions/attribute.e2e_boundary/candidate-e2e-v1"

  depends_on = [google_iam_workload_identity_pool_provider.workout_journal_e2e]
}
