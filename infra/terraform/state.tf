# This bucket does not exist in P1A. P1B must bootstrap it with these exact
# properties, add its import block, and import it before any creation plan.
resource "google_storage_bucket" "terraform_state" {
  name     = "workout-journal-506909-tfstate"
  project  = var.project_id
  location = var.region

  force_destroy               = false
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
