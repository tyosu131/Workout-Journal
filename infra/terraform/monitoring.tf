# Cloud Run revision/probe/image/traffic ownership stays with CD.
resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "Workout Journal Alerts"
  type         = "email"
  enabled      = true
  labels = {
    email_address = var.monitoring_notification_email
  }

  depends_on = [google_project_service.monitoring]
}

resource "google_monitoring_uptime_check_config" "frontend" {
  project          = var.project_id
  display_name     = "Workout Journal Frontend Availability"
  timeout          = "10s"
  period           = "300s"
  selected_regions = ["USA"]
  checker_type     = "STATIC_IP_CHECKERS"

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "workout-journal-frontend-cpbzb7lqza-an.a.run.app"
    }
  }
  http_check {
    request_method = "GET"
    path           = "/login"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    accepted_response_status_codes {
      status_value = 200
    }
  }

  depends_on = [google_project_service.monitoring]
}

resource "google_monitoring_alert_policy" "frontend_availability" {
  project               = var.project_id
  display_name          = "Workout Journal Frontend Unavailable"
  enabled               = true
  combiner              = "OR"
  severity              = "ERROR"
  notification_channels = [google_monitoring_notification_channel.email.name]

  conditions {
    display_name = "At least two uptime checkers failing for five minutes"
    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND resource.labels.project_id = \"${var.project_id}\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.frontend.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"
      aggregations {
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.labels.project_id", "resource.labels.host"]
      }
      trigger {
        count = 1
      }
      evaluation_missing_data = "EVALUATION_MISSING_DATA_INACTIVE"
    }
  }

  documentation {
    mime_type = "text/markdown"
    content   = "Project workout-journal-506909 / workout-journal-frontend: inspect uptime results, Frontend revision health and logs, the exact current production pair, and recent automatic CD. Missing samples do not prove availability. Follow [Observability inspection and recovery](https://github.com/tyosu131/Workout-Journal/blob/main/docs/cloud-run-deployment-runbook.md#observability). No automatic rollback."
  }

  depends_on = [google_project_service.monitoring]
}

resource "google_monitoring_alert_policy" "backend_server_errors" {
  project               = var.project_id
  display_name          = "Workout Journal Backend Server Errors"
  enabled               = true
  combiner              = "OR"
  severity              = "WARNING"
  notification_channels = [google_monitoring_notification_channel.email.name]

  conditions {
    display_name = "Two Backend 5xx in a five-minute aggregate, sustained for one minute"
    condition_threshold {
      filter          = "metric.type = \"run.googleapis.com/request_count\" AND resource.type = \"cloud_run_revision\" AND resource.labels.project_id = \"${var.project_id}\" AND resource.labels.location = \"${var.region}\" AND resource.labels.service_name = \"workout-journal-backend\" AND metric.labels.response_code_class = \"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "60s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.labels.project_id", "resource.labels.location", "resource.labels.service_name"]
      }
      trigger {
        count = 1
      }
      evaluation_missing_data = "EVALUATION_MISSING_DATA_INACTIVE"
    }
  }

  documentation {
    mime_type = "text/markdown"
    content   = "Project workout-journal-506909 / workout-journal-backend in asia-northeast1: this service-wide 5xx count includes tagged zero-traffic candidate requests, not only production. Inspect structured server_failure logs and operation, identify the affected revision, and confirm the exact production pair. For an established production regression, use the Human-gated known-good pair procedure in [Observability inspection and recovery](https://github.com/tyosu131/Workout-Journal/blob/main/docs/cloud-run-deployment-runbook.md#observability). Never reassign Backend tags."
  }

  depends_on = [google_project_service.monitoring]
}
