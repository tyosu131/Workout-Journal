# Cloud Run Deployment Runbook

This runbook starts at the Human Gate. It does not authorize resource creation or deployment by itself.

CD-C1's [gated delivery source](./cd-c1-candidate-delivery.md) implements the
existing-service candidate/E2E/approval/promotion path. [PF-F1 current production](./portfolio-finalization.md#current-production)
records `cd-35737278328-1`, both services at 100%, source
`2d9ec91d8f11a83c0904de770cc8df436139325b`, main CI `35736936685` and automatic
CD `35737278328` SUCCESS / attempt 1, production/post-deploy PASS.
Must 3–6 are Closed. [OBS-D3F](./verification.md#obs-d3f-final-observability-documentation-closure)
retains the Historical previous pair and durable health/probe, uptime, structured
failure, Backend incident and Human notification proof. [C4D](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure)
retains the Historical automatic release that closed Must 4.
C3 runtime chain remains CLOSED.
The [C4B failure/C4C remediation](./cd-c1-candidate-delivery.md#c4c-nested-playwright-authority-remediation)
is Historical; do not rerun or reuse its failed candidate identity.
`CD_C1_ACTIVATION` remains UNCONFIGURED and gates manual release only.
The [C3C fail-closed record](./cd-c3-e2e-recovery-contract.md) preserves C3A's
historical cleanup failure and unchanged traffic at that phase. Before Build the
controller stops at 20 retained tags or 40
revisions per service; retiring old pairs is a separate Human operation and must
preserve every rollback-eligible Frontend's Backend tag. Pre-approval E2E cleanup
removes synthetic user data, not the Cloud Run pair. The manual contract below
remains applicable; no commands here were executed by CD-C1 implementation.

CD-C2A/B subsequently provisioned the E2E identity, exact-secret IAM and dedicated
key version 1 / ENABLED (`candidate_e2e` in Supabase Dashboard), with no Cloud Run
mutation. CD-C2C provider activation is COMPLETE (ACTIVE / disabled=false).
[R8 run `35411846680` / R9 closure](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure)
closes isolated WIF proof **CLOSED / PASS**, with A/B/C **PASS** at source
`6c0b91579f2caff02e9e190249c4c4bd73e877d1`, attempt 1. R7 remediation is runtime
verified; R6's fixed-path failure remains Historical. All release jobs were skipped:
no Build, candidates, E2E secret consumption, production approval or promotion ran.
R9 performed no runtime action; C3V subsequently proved full manually dispatched
delivery. Manual `mode=release` is a separate, explicitly gated recovery/release
route; it still requires its separate Human authorization,
`CD_C1_ACTIVATION == approved` (currently UNCONFIGURED) and a numeric secret version.
After reviewed implementation merge, automatic release starts only from qualified
successful main push CI, without this manual latch, using reviewed version metadata
`1`. Both routes stop for **production Environment Human approval**. C4B itself does
not authorize or execute a merge, release, secret read or approval.

## Automatic release operating contract

The Current runtime-proven flow is main merge → required CI success → automatic
CD → Build/paired 0% candidates/E2E/verify → production Environment approval wait
→ Human approval → Backend promotion → Frontend promotion → post-deploy verification.

The [canonical authority contract](./cd-c1-candidate-delivery.md#activation-and-source-authority)
binds triggering CI ID/attempt, workflow identity and required job to exact source S.
S must equal current main, runner SHA and CD workflow SHA. Preflight outputs own all
release checkouts and reusable E2E inputs; CI authority is never reselected mid-run.
Build produces immutable digests, then Backend and Frontend candidates at 0%, with
Frontend pointing to the exact Backend tagged URL. E2E must prove cleanup and return
the same manifest hash; verify re-reads the pair before the production approval wait.

Before approving, inspect run/CI provenance, exact source, candidate pair/digests,
E2E/cleanup evidence and 60-minute manifest expiry. A newer main or expired manifest
makes promotion fail closed; an old waiting run is not automatically refreshed.
Human approval permits Backend then Frontend promotion followed by post-deploy
verification. Failure retains Frontend then Backend rollback and post-rollback checks.
No production traffic write is reachable in the pre-approval jobs.

Eligible releases share `workout-journal-production-delivery`, with no in-progress
cancellation. One running and one pending member are possible; a newer eligible
pending run may replace an older pending run. This is not FIFO/exactly-once. Obvious
non-qualifying CI completions have a separate per-run group. The manual commands
below retain their own Human Gate and are not an automatic repair fallback.

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

## Brand-new service bootstrap

`--no-traffic` creates a new revision without changing traffic on an existing service. Do not use it when creating a brand-new Cloud Run service.

Before deploying, confirm that both service names do not yet exist. Bind each runtime service account to only its approved secrets/resources. Inject secrets by Secret Manager version; do not place secret values in command arguments or tracked files. Use the unique `CANDIDATE_ID` and tag from the candidate identity contract, but do not describe this bootstrap pair as a safe 0% candidate: there is no existing production revision whose traffic can be preserved. The approved v1 bootstrap public-access mechanism is `--no-invoker-iam-check` for both services; Backend public invocation remains the v1 decision.

Deploy Backend first without `--no-traffic`:

```bash
gcloud run deploy approved-backend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$BACKEND_IMAGE@sha256:approved-backend-digest" \
  --service-account=approved-backend-service-account \
  --no-invoker-iam-check \
  --max-instances=approved-max-instances \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=NODE_ENV=production,SUPABASE_URL=approved-public-url,SUPABASE_PUBLISHABLE_KEY=approved-publishable-key,PASSWORD_RESET_REDIRECT_URL=https://approved-frontend-url/reset-password,ACCESS_TOKEN_EXPIRES=1h,REFRESH_TOKEN_EXPIRES=7d \
  --set-secrets=SUPABASE_SECRET_KEY=approved-supabase-secret:approved-version,JWT_SECRET=approved-jwt-secret:approved-version
```

The first revision receives the service's initial traffic. Immediately inspect and record the created service, revision, tag, and traffic allocation:

```bash
gcloud run services describe approved-backend-service --project=approved-project-id --region="$REGION"
gcloud run revisions describe approved-backend-revision --project=approved-project-id --region="$REGION"
```

Use the revision name returned by the deployment in the second command. Treat both the service URL and tagged URL as unvalidated bootstrap endpoints: do not announce the service or begin normal use before the pair passes smoke.

Record the exact Backend tagged URL returned by Cloud Run and verify that its tag points to the created Backend revision:

```bash
BACKEND_CANDIDATE_URL="https://exact-backend-tagged-url"
```

Use that exact URL as the Frontend revision's runtime target, then deploy Frontend without `--no-traffic`:

```bash
gcloud run deploy approved-frontend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$FRONTEND_IMAGE@sha256:approved-frontend-digest" \
  --service-account=approved-frontend-service-account \
  --no-invoker-iam-check \
  --max-instances=approved-max-instances \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=BACKEND_INTERNAL_URL="$BACKEND_CANDIDATE_URL"
```

Immediately inspect and record the Frontend service, revision, tag, and initial traffic allocation:

```bash
gcloud run services describe approved-frontend-service --project=approved-project-id --region="$REGION"
gcloud run revisions describe approved-frontend-revision --project=approved-project-id --region="$REGION"
```

Use the revision name returned by the deployment in the second command. Verify that the revision's `BACKEND_INTERNAL_URL` is the recorded exact Backend tagged URL. Smoke the initial pair through its tagged Frontend URL. Because both first revisions already receive initial traffic, do not run a separate promotion step. Only after smoke passes, record the pair as the initial known-good production pair and begin normal use of the service URL.

## Existing-service candidate revisions

Use this path only after confirming that both Cloud Run services already exist. Bind each runtime service account to only its approved secrets/resources. Inject secrets by Secret Manager version; do not place secret values in command arguments or tracked files. Do not add either `--allow-unauthenticated` or `--no-invoker-iam-check` to subsequent candidate deploy commands; preserve each existing service's approved public-access configuration.

Choose a new, never-used `CANDIDATE_ID`, then deploy Backend first at 0% while preserving the existing production revision's traffic:

```bash
gcloud run deploy approved-backend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$BACKEND_IMAGE@sha256:approved-backend-digest" \
  --service-account=approved-backend-service-account \
  --max-instances=approved-max-instances \
  --no-traffic \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=NODE_ENV=production,SUPABASE_URL=approved-public-url,SUPABASE_PUBLISHABLE_KEY=approved-publishable-key,PASSWORD_RESET_REDIRECT_URL=https://approved-frontend-url/reset-password,ACCESS_TOKEN_EXPIRES=1h,REFRESH_TOKEN_EXPIRES=7d \
  --set-secrets=SUPABASE_SECRET_KEY=approved-supabase-secret:approved-version,JWT_SECRET=approved-jwt-secret:approved-version
```

Record the exact tagged URL returned for this Backend candidate and verify that its tag points to the newly created 0% Backend revision:

```bash
BACKEND_CANDIDATE_URL="https://exact-backend-tagged-url"
```

Use that exact Backend candidate URL as the paired Frontend candidate's runtime target, then create the Frontend revision at 0%:

```bash
gcloud run deploy approved-frontend-service \
  --project=approved-project-id \
  --region="$REGION" \
  --image="$FRONTEND_IMAGE@sha256:approved-frontend-digest" \
  --service-account=approved-frontend-service-account \
  --max-instances=approved-max-instances \
  --no-traffic \
  --tag="$CANDIDATE_TAG" \
  --set-env-vars=BACKEND_INTERNAL_URL="$BACKEND_CANDIDATE_URL"
```

Verify that the existing production revisions remain at 100% and both new candidate revisions are at 0% before smoke.

## Candidate pair record

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

## Existing-service traffic promotion

Do not promote until the candidate pair passes smoke and the Human Gate approves public Backend invocation. Preserve the previous known-good pair before changing traffic.

This promotion procedure is for the existing-service path. A brand-new bootstrap pair already receives initial traffic and becomes the initial known-good pair only after its smoke passes and its actual traffic state is recorded.

Promote Backend, recheck the Frontend candidate against the promoted Backend revision/tag, then promote Frontend:

```bash
gcloud run services update-traffic approved-backend-service --project=approved-project-id --region="$REGION" --to-revisions=approved-backend-revision=100
gcloud run services update-traffic approved-frontend-service --project=approved-project-id --region="$REGION" --to-revisions=approved-frontend-revision=100
```

Update the candidate record with the promotion result and preserve it as the new known-good pair: candidate ID, Git SHA, both image digests, both revision names and candidate tags, the Backend tagged URL stored in the Frontend revision, Secret Manager versions, non-key public config identifiers such as the Supabase project ref, smoke evidence, promotion time, and approver. Do not record publishable key values.

After promotion, perform the required production browser smoke for the major v1 workflows in the Human-approved production browser and record the browser used. Broader supported-browser validation across Safari, iOS Safari, Chrome, Firefox, and Edge is a separate compatibility activity, not a v1 release gate unless the Project owner explicitly adds it to the current Completion Contract. When that broader validation is performed, pay particular attention to refresh and logout cookie behavior.

## Observability

**Current: Must 3, Must 4 and Must 5 Closed; remaining Must 5 gap None.**
[OBS-D3F accepted evidence and exact identities](./verification.md#obs-d3f-final-observability-documentation-closure)
record the Historical OBS-D3F production pair `cd-35684518093-2`, then 100% on both services, deployed
startup/liveness probes, two safe structured failures, Backend incident OPEN/CLOSED
and Human firing/recovery email delivery. [OBS-D2A/B](./verification.md#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure)
retains 42-resource no-drift/Monitoring apply evidence and the previous production
pair `cd-35675050740-1`. At that checkpoint, Backend GET `/health` returned 200
with exact `{"status":"ok"}`, Frontend `/login` returned 200, and all three USA
uptime locations emitted PASS. The OBS-A baseline of 37 resources, TCP Backend
startup and `/health` 404 remains Historical previous-production evidence.

The deployed source also defines HEAD `/health` 200 without a body and
POST/PUT/PATCH/DELETE 405 before body/cookie parsing and application routes.
These method/isolation contracts retain OBS-B/C offline proof; OBS-D2A directly
checked GET only. Health needs no auth and makes no Supabase call.

Backend HTTP startup and liveness both use `/health`, port 8080, initial delay 0,
timeout 2s. Startup uses period 5s / failure threshold 24; liveness uses period
30s / failure threshold 3. Frontend retains its TCP startup configuration. CD
accepts only the exact old-TCP-to-approved-HTTP Backend transition, including when
a non-promoted HTTP candidate is latest-ready. All other compared spec fields stay
equivalent; full actual spec hashes still include probes. New candidates receive
a separate health check. Previous rollback revisions need not expose `/health`;
the existing Backend `/` = 404 rollback smoke remains unchanged.

Inspection and diagnosis:

1. Read Cloud Run traffic to identify the exact 100% revision pair; latest-ready
   can be a 0% candidate. Confirm Frontend's recorded Backend tagged URL and the
   immutable Backend tag target. Inspect revision Ready status and container
   startup/liveness settings, without printing secret environment values.
2. Check Frontend `/login` and Backend `/health`. In
   Monitoring, inspect the Frontend uptime check and alert incident timeline.
   The check is HTTPS/200-only every 300s, with 10s timeout and three USA checkers.
   Two failed checkers sustained for 300s trigger availability alerting; missing
   samples are not a PASS.
3. For Backend alerts, inspect Cloud Logging with the following safe filter and
   narrow the time range/revision to the incident. The operation field is a fixed
   name such as `note_save`; no request body, token, URL, user identity or raw
   dependency message is needed.

   ```text
   resource.type="cloud_run_revision"
   resource.labels.service_name="workout-journal-backend"
   severity=ERROR
   jsonPayload.event="server_failure"
   ```

4. The Backend policy sums `run.googleapis.com/request_count` with `5xx` over
   300s and requires more than one error for 60s. It includes **all Backend
   revisions, including tagged 0% candidates**. Determine whether the affected
   revision serves production before treating the alert as a production regression.
   Metric sampling/ingestion delays mean notification is not instantaneous.
5. If a production regression is established, use the existing Human-gated
   [paired rollback](#rollback): Frontend then Backend, only to a recorded
   compatible pair. Never reassign or casually delete Backend tags. Repeat the
   post-rollback smoke and record the restored pair, operator, time and result.
   Alerts never change traffic automatically.

Runtime acceptance is separate from configuration inspection. Historical OBS-D2A
found zero natural `server_failure` events. OBS-D3D attempt 2 subsequently proved
two safe events and two 5xx, service-wide aligned value 2 and a Backend incident;
OBS-D3E confirmed CLOSED plus Human receipt of firing and recovery email.
**Structured logging runtime, Backend alert runtime and notification delivery:
PROVEN.** Attempt 1 remains separate Historical supporting evidence, not part of
the attempt 2 proof. The [canonical final record](./verification.md#obs-d3f-final-observability-documentation-closure)
preserves the IDs, times, safe-schema results and exact requirement mapping.
Record channel/incident IDs and available receipt times, not the private destination;
never substitute incident times for missing receipt timestamps.

**Historical OBS-D3F docs-merge plan:** that phase planned to run CI/candidate/E2E/verify, cancel at production approval wait, and retain `cd-35684518093-2`. The later Must 6 release superseded that production identity; [PF-F1](./portfolio-finalization.md#current-production) owns current read-back. A future documentation merge requires its own operational authorization. PF-F1 authorizes no merge, cancellation, approval or deployment; workflow behavior is unchanged.

**Future verification procedure, only if separately requested:** Must 5 is already
Closed, so no additional failure request is required. Any repeat needs a new
explicit Human Gate naming the exact fresh Backend candidate revision and
immutable tagged URL. Before that Gate, prove all of the following:

- Candidate source is current merged main.
- Backend candidate has 0% production traffic, with its exact immutable tagged URL.
- Production Backend is a different revision at 100%; the production pair is unchanged.
- Candidate `/health` is 200, candidate E2E is PASS and verify-candidate is PASS.
- Production approval is WAITING.

These checks do not authorize requests by themselves. After the separate Human
Gate, re-read identity and traffic before sending anything. Permit **at most two requests total,
with no retries**, within one minute: POST malformed JSON (for example `{`) with
`Content-Type: application/json` to `/not-an-application-route` on that exact
candidate URL. Do not use `/health`, the stable production URL, credentials or
application data. The local real-app test proves parsing reaches the fixed global
500 handler before auth/DB access, with zero Supabase calls; no Supabase mutation
is part of this test. Stop on an unexpected response, timeout, identity/traffic
change or evidence of dependency access. After the request budget is exhausted,
only read metrics/logs/incidents and await Human receipt confirmation; absence of
an alert does not authorize more requests. Never inject a failure into production
or add a test-only production endpoint.
Do not modify real policy thresholds merely to claim delivery evidence.

Merge, Terraform apply, and controlled alert verification have separate Human
boundaries. A merge naturally starts automatic CD; Terraform is not applied by CD.
Preserve manifest TTL/current-main checks and production Environment approval.
An expired candidate cannot be promoted to finish an observability exercise.

## Rollback

Rollback is always to a recorded compatible pair. Before changing traffic, verify from the pair record and revision configuration that the known-good Frontend revision's `BACKEND_INTERNAL_URL` equals its recorded Backend tagged URL and that this tag still points to the paired known-good Backend revision. Do not move a tag during rollback to reconstruct a pair.

Shift Frontend first so browsers stop using the new contract, then restore Backend by recorded revision name:

```bash
gcloud run services update-traffic approved-frontend-service --project=approved-project-id --region="$REGION" --to-revisions=known-good-frontend-revision=100
gcloud run services update-traffic approved-backend-service --project=approved-project-id --region="$REGION" --to-revisions=known-good-backend-revision=100
```

After rollback, verify again that the restored Frontend revision's `BACKEND_INTERNAL_URL` resolves through its unchanged tag to the paired Backend revision. Then verify root, login, refresh, authenticated notes, and logout. Record reason, operator, time, restored candidate ID and pair, and verification evidence. Do not roll back only one side unless compatibility is independently proven.

## Redeploy the same image digest

For a runtime configuration or secret-version correction on the existing services, keep the recorded Git SHA and exact image digests but choose a new, never-used `CANDIDATE_ID`. Deploy both exact digests as a new no-traffic revision pair with new Frontend and Backend candidate tags. Deploy Backend first, record its new exact tagged URL, and create the new Frontend revision with that URL as `BACKEND_INTERNAL_URL`, even when only Backend configuration changed. Repeat candidate smoke and promote the new pair through the normal process.

Never reuse a candidate ID or tag because the SHA or digest is unchanged, and never move a Backend tag referenced by an older rollback-eligible Frontend revision. Never rebuild merely to change Backend runtime configuration; a rebuild would produce a different artifact.
