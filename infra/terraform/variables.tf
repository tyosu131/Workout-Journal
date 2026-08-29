variable "project_id" {
  description = "GCP project containing the existing Workout-Journal production foundation."
  type        = string
  default     = "workout-journal-506909"

  validation {
    condition     = var.project_id == "workout-journal-506909"
    error_message = "This import baseline is intentionally limited to project workout-journal-506909."
  }
}

variable "region" {
  description = "GCP region containing the existing Workout-Journal production foundation."
  type        = string
  default     = "asia-northeast1"

  validation {
    condition     = var.region == "asia-northeast1"
    error_message = "This import baseline is intentionally limited to region asia-northeast1."
  }
}
