resource "google_project_service" "iam" {
  project = var.project_id
  service = "iam.googleapis.com"

  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "cloud_resource_manager" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"

  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "iam_credentials" {
  project = var.project_id
  service = "iamcredentials.googleapis.com"

  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "security_token_service" {
  project = var.project_id
  service = "sts.googleapis.com"

  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}
