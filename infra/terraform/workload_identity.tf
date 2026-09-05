resource "google_iam_workload_identity_pool" "github_actions" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Keyless GitHub Actions federation for the Workout Journal repository."
  disabled                  = false
  mode                      = "FEDERATION_ONLY"

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

resource "google_iam_workload_identity_pool_provider" "workout_journal" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "workout-journal"
  display_name                       = "Workout Journal GitHub"
  description                        = "Keyless federation for the exact Workout Journal main-branch CD workflow."
  disabled                           = false

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner"    = "assertion.repository_owner"
    "attribute.repository"          = "assertion.repository"
    "attribute.ref"                 = "assertion.ref"
    "attribute.workflow_ref"        = "assertion.workflow_ref"
  }

  attribute_condition = <<-EOT
    assertion.repository_owner_id == '95160728' &&
    assertion.repository_id == '790375516' &&
    assertion.repository_owner == 'tyosu131' &&
    assertion.repository == 'tyosu131/Workout-Journal' &&
    assertion.ref == 'refs/heads/main' &&
    assertion.workflow_ref == 'tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main'
  EOT

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account_iam_member" "deploy_workload_identity_user" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/437413312066/locations/global/workloadIdentityPools/github-actions/attribute.repository_id/790375516"

  depends_on = [google_iam_workload_identity_pool_provider.workout_journal]
}
