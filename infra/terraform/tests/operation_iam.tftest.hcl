# Plan only, with no backend or credentials in the disposable test root.
# Python assertions inspect the evaluated resource changes, including extra grants.
mock_provider "google" {}

override_resource {
  target          = google_service_account.deploy
  override_during = plan
  values = {
    email = "workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com"
    name  = "projects/workout-journal-506909/serviceAccounts/workout-journal-deploy@workout-journal-506909.iam.gserviceaccount.com"
  }
}

override_resource {
  target          = google_project_iam_custom_role.deploy_run_operation_reader
  override_during = plan
  values = {
    name = "projects/workout-journal-506909/roles/workoutJournalRunOperationReader"
  }
}

run "operation_iam_contract_plan" {
  command = plan
}
