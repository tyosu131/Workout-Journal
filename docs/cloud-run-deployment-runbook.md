# Cloud Run Deployment Runbook

This runbook starts at the Human Gate. It does not authorize resource creation or deployment by itself.

## Architecture and runtime contract

```text
Browser
-> Frontend Cloud Run
-> same-origin /api/* Pages API proxy
-> Backend Cloud Run
-> Supabase
```

Both images run Node 24. Frontend and Backend are separate Cloud Run services. Backend public invocation is the v1 decision; application endpoints retain their JWT boundary. Browser traffic must never call the Backend hostname directly or depend on cross-site refresh cookies.

## Prerequisites and Human Gate record

Record and approve these values before commands are run:

- GCP project ID, region, Artifact Registry repository, and billing/quota/org-policy readiness
- runtime service accounts and Backend public-invocation approval
- exact Frontend and Backend service names and URLs
- Human-approved Supabase project for both frontend build values and backend runtime values
- Secret Manager secret/version names for `SUPABASE_SECRET_KEY` and `JWT_SECRET`
- `PASSWORD_RESET_REDIRECT_URL`, Supabase Site URL, and redirect allow-list entry
- initial maximum instance values, smoke account owner, and synthetic-data cleanup owner
- current known-good Frontend/Backend revision pair, if one exists

Required APIs/resources include Cloud Build, Artifact Registry, Cloud Run, Secret Manager, two service accounts as approved, and an Artifact Registry Docker repository. Creating/enabling these is a Human Gate action.

Use a clean commit and Node 24. Confirm the repository quality gates, production-only audits, two local Docker builds, and browser-artifact canary check have passed before building release images.

## Environment contract

Frontend build-time public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Frontend runtime server-only value:

- `BACKEND_INTERNAL_URL`

Backend runtime values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `PASSWORD_RESET_REDIRECT_URL`
- `ACCESS_TOKEN_EXPIRES`
- `REFRESH_TOKEN_EXPIRES`
- `NODE_ENV=production`
- optional `CORS_ORIGIN`

Backend Secret Manager injections:

- `SUPABASE_SECRET_KEY`
- `JWT_SECRET`

Cloud Run supplies `PORT`; do not set it manually. Do not pass Backend secrets or `BACKEND_INTERNAL_URL` as Docker build arguments. The frontend build values and backend runtime values must reference the same approved Supabase project.

## Build images by git SHA

Set local shell variables to the Human-approved values. Do not paste secrets into shell history.

```bash
GIT_SHA="$(git rev-parse HEAD)"
REGION="approved-region"
AR_REPOSITORY="approved-repository"

gcloud builds submit \
  --project="approved-project-id" \
  --config=cloudbuild.yaml \
  --substitutions=COMMIT_SHA="$GIT_SHA",_REGION="$REGION",_AR_REPOSITORY="$AR_REPOSITORY",_NEXT_PUBLIC_SUPABASE_URL="approved-public-url",_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="approved-publishable-key" \
  .
```

Cloud Build builds and pushes both SHA tags. Record the build ID and SHA. Public values may appear in frontend build artifacts/logs by design; secrets must not.

Resolve immutable digests and record them:

```bash
BACKEND_IMAGE="$REGION-docker.pkg.dev/approved-project-id/$AR_REPOSITORY/workout-journal-backend"
FRONTEND_IMAGE="$REGION-docker.pkg.dev/approved-project-id/$AR_REPOSITORY/workout-journal-frontend"

gcloud artifacts docker images describe "$BACKEND_IMAGE:$GIT_SHA" --format='value(image_summary.digest)'
gcloud artifacts docker images describe "$FRONTEND_IMAGE:$GIT_SHA" --format='value(image_summary.digest)'
```

All deployments below use `image@sha256:...`, never a mutable tag.

## Candidate identity contract

Source and container artifacts are identified by the Git SHA and image digests. A deployment attempt has a separate identity. Before every candidate deployment, choose a new short `CANDIDATE_ID` containing only lowercase letters, numbers, and hyphens, and derive the traffic tag from it:

```bash
# Replace this placeholder with a never-used value for this deployment attempt.
CANDIDATE_ID="approved-new-unique-id"
CANDIDATE_TAG="candidate-${CANDIDATE_ID}"
```

The same `CANDIDATE_ID` identifies the paired Frontend and Backend attempt because they are separate Cloud Run services. It must never be reused for a later revision within either service. This remains true when the Git SHA and image digests have not changed, including configuration-only and secret-version-only corrections. Do not derive deployment-attempt identity solely from `GIT_SHA`.

After deploying Backend, record its exact tagged URL and the revision to which the tag points. Set only the new paired Frontend candidate's `BACKEND_INTERNAL_URL` to that exact URL; an existing production or rollback-eligible Frontend revision keeps its previously recorded Backend URL. Once any Frontend revision references a Backend traffic tag, do not reassign that tag to another Backend revision and do not remove it while the Frontend revision remains known-good or rollback eligible. Retiring and cleaning up a tag is a separate operation performed only after its entire pair is no longer a rollback candidate; this runbook does not automate tag cleanup.

## First deployment and candidate revisions

Bind each runtime service account to only its approved secrets/resources. Inject secrets by Secret Manager version; do not place secret values in command arguments or tracked files.

Deploy Backend first as a candidate and keep existing production traffic unchanged:

```bash
gcloud run deploy approved-backend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$BACKEND_IMAGE@sha256:approved-backend-digest" \
  --service-account=approved-backend-service-account \
  --allow-unauthenticated \
  --max-instances=approved-max-instances \
  --no-traffic \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=NODE_ENV=production,SUPABASE_URL=approved-public-url,SUPABASE_PUBLISHABLE_KEY=approved-publishable-key,PASSWORD_RESET_REDIRECT_URL=https://approved-frontend-url/reset-password,ACCESS_TOKEN_EXPIRES=1h,REFRESH_TOKEN_EXPIRES=7d \
  --set-secrets=SUPABASE_SECRET_KEY=approved-supabase-secret:approved-version,JWT_SECRET=approved-jwt-secret:approved-version
```

For a brand-new service, explicitly confirm Cloud Run's initial traffic result before continuing. Do not assume `--no-traffic` produced an unreachable revision.

Record the exact tagged URL returned for this Backend candidate and verify that its tag points to the newly created Backend revision:

```bash
BACKEND_CANDIDATE_URL="https://exact-backend-tagged-url"
```

Use that exact Backend candidate URL as the paired Frontend candidate's runtime target, then deploy Frontend without production traffic:

```bash
gcloud run deploy approved-frontend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$FRONTEND_IMAGE@sha256:approved-frontend-digest" \
  --service-account=approved-frontend-service-account \
  --allow-unauthenticated \
  --max-instances=approved-max-instances \
  --no-traffic \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=BACKEND_INTERNAL_URL="$BACKEND_CANDIDATE_URL"
```

Record the attempt as one candidate pair with at least:

- `CANDIDATE_ID` and Git SHA
- Frontend image digest, revision name, and candidate tag
- Backend image digest, revision name, candidate tag, and the exact tagged URL stored in the Frontend revision's `BACKEND_INTERNAL_URL`
- runtime configuration and Secret Manager versions, Supabase project, and a pending promotion result

The record must preserve the mapping from the Frontend revision to its immutable Backend tagged target. A later candidate always receives a new `CANDIDATE_ID`; it must not move or reuse either tag from this pair.

## Candidate smoke test

Use only an approved smoke account and synthetic production data. From the Frontend candidate URL verify:

1. root page returns `200` over HTTPS;
2. unknown `/api/<namespace>` returns `404` with `{"error":"Not Found"}` and does not reach Backend logs;
3. sign-up or existing-account login sets an HTTP-only, Secure, SameSite=Lax refresh cookie scoped to `/api/auth` with no Domain;
4. authenticated session, note create/read/update, analytics, access-token expiry, refresh, and retry work;
5. missing and invalid refresh cookies return `401` without internal details;
6. logout calls Backend, forwards the deletion cookie, and a later refresh fails;
7. forgot-password redirects to the exact Frontend `/reset-password` URL and the recovery session updates the password through the publishable Supabase browser boundary;
8. browser assets and generated HTML contain neither the Backend hostname nor its runtime value;
9. Backend direct probes retain `/` = `404`, invalid login = `400`, and unauthenticated notes = `401`.

Inspect Cloud Run logs for failures without searching for or printing credentials or personal data. Confirm no email, user UUID, profile object, token, Authorization value, secret, raw URL/query, or raw dependency error was logged.

The smoke owner deletes all synthetic notes, tags, users, and Auth records according to the approved cleanup procedure and records completion.

## Traffic promotion

Do not promote until the candidate pair passes smoke and the Human Gate approves public Backend invocation. Preserve the previous known-good pair before changing traffic.

Promote Backend, recheck the Frontend candidate against the promoted Backend revision/tag, then promote Frontend:

```bash
gcloud run services update-traffic approved-backend-service --project=approved-project-id --region="$REGION" --to-revisions=approved-backend-revision=100
gcloud run services update-traffic approved-frontend-service --project=approved-project-id --region="$REGION" --to-revisions=approved-frontend-revision=100
```

Update the candidate record with the promotion result and preserve it as the new known-good pair: candidate ID, Git SHA, both image digests, both revision names and candidate tags, the Backend tagged URL stored in the Frontend revision, Secret Manager versions, public config identifiers, smoke evidence, promotion time, and approver.

After promotion, perform real-browser smoke on Safari, iOS Safari, Chrome, Firefox, and Edge. The final supported-browser decision depends on this evidence, especially refresh and logout cookie behavior.

## Rollback

Rollback is always to a recorded compatible pair. Before changing traffic, verify from the pair record and revision configuration that the known-good Frontend revision's `BACKEND_INTERNAL_URL` equals its recorded Backend tagged URL and that this tag still points to the paired known-good Backend revision. Do not move a tag during rollback to reconstruct a pair.

Shift Frontend first so browsers stop using the new contract, then restore Backend by recorded revision name:

```bash
gcloud run services update-traffic approved-frontend-service --project=approved-project-id --region="$REGION" --to-revisions=known-good-frontend-revision=100
gcloud run services update-traffic approved-backend-service --project=approved-project-id --region="$REGION" --to-revisions=known-good-backend-revision=100
```

After rollback, verify again that the restored Frontend revision's `BACKEND_INTERNAL_URL` resolves through its unchanged tag to the paired Backend revision. Then verify root, login, refresh, authenticated notes, and logout. Record reason, operator, time, restored candidate ID and pair, and verification evidence. Do not roll back only one side unless compatibility is independently proven.

## Redeploy the same image digest

For a runtime configuration or secret-version correction, keep the recorded Git SHA and exact image digests but choose a new, never-used `CANDIDATE_ID`. Deploy both exact digests as a new no-traffic revision pair with new Frontend and Backend candidate tags. Deploy Backend first, record its new exact tagged URL, and create the new Frontend revision with that URL as `BACKEND_INTERNAL_URL`, even when only Backend configuration changed. Repeat candidate smoke and promote the new pair through the normal process.

Never reuse a candidate ID or tag because the SHA or digest is unchanged, and never move a Backend tag referenced by an older rollback-eligible Frontend revision. Never rebuild merely to change Backend runtime configuration; a rebuild would produce a different artifact.
