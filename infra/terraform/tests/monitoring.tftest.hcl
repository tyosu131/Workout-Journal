# Executed in the disposable backend/import-free root by test_monitoring.py.
mock_provider "google" {}

variables {
  monitoring_notification_email = "fixture@example.invalid"
}

override_resource {
  target          = google_monitoring_notification_channel.email
  override_during = plan
  values = {
    name = "projects/workout-journal-506909/notificationChannels/123"
  }
}

override_resource {
  target          = google_monitoring_uptime_check_config.frontend
  override_during = plan
  values = {
    name            = "projects/workout-journal-506909/uptimeCheckConfigs/frontend-fixture"
    uptime_check_id = "frontend-fixture"
  }
}

run "monitoring_contract" {
  command = plan
}
