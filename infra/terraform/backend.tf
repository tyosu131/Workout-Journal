terraform {
  backend "gcs" {
    bucket = "workout-journal-506909-tfstate"
    prefix = "production"
  }
}
