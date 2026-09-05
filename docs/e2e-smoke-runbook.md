# Automated E2E smoke: P2A local foundation and P2B candidate proof

P2A alone is the safe local foundation for Portfolio Must 2, not its closure.
P2B has now verified the actual production-like 0% candidate path described below.
Together they close Must 2, including fresh review of the implementation, runtime
proof and cleanup evidence on 2026-09-05. Must 4 and PE-P1C-01B remain Open, WIF
stays disabled, and CD is inactive. The production Environment is now
[configuration-verified](./portfolio-infra-ownership.md#production-environment-and-activation-dependency)
under a subsequent gate; its runtime CD approval integration remains future work.
The required CI workflow does not execute this suite.

## P2A local prerequisites

Use Node 24, Docker Desktop, the local stack for `supabase/config.toml`
(project ID `Workout-Journal`), both existing migrations, installed root/frontend/
backend lockfile dependencies, and Chromium for pinned Playwright Test 1.63.0.
The historical Hosted isolated project subsequently became production: **do
not use it**. P2A accepts only `http://127.0.0.1:54321`.

The config refers to absent `supabase/seed.sql`. Current local start succeeds,
with both migrations already applied. No seed/config change or reset was needed.
Existing local users/data must be preserved. Never obtain a production seed.
If fresh initialization requires a seed adjustment, prove its target is local
before choosing an empty seed or disabling local seeding.

## P2A local execution

Select an existing Node 24 runtime; do not change the system installation:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version

E2E_TARGET=local:Workout-Journal \
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
npm run e2e
```

The controller verifies the Docker context is a Unix socket, the gateway owns
port 54321, and DB/gateway/Auth/REST share the expected project network and
labels. Auth and REST database URLs must point to that same local DB container,
not a Hosted database behind a localhost proxy; DB URL query overrides are refused.
Read-only Kong Admin GETs inside the local container verify its loaded Auth/REST
services/routes, reject shadow routes, upstream balancers and forwarding/logging
plugins. If that control-plane evidence is unavailable, execution stops before
reading keys or sending authenticated requests. It reads local CLI status keys
into memory; it does not accept remote URLs, discover cloud resources, link a
project, or run remote migrations.

It builds a source copy under ignored `e2e/.work/`, excluding all dotenv files,
old builds and dependency directories. Existing dependencies are symlinked.
This is essential: the real backend deliberately gives `.env.local` priority.
The copied backend receives only explicit local configuration.
Frontend builds receive local public settings, never the Admin key.

The controller owns Frontend `127.0.0.1:3100` and Backend port `3101` and verifies
their listening PIDs. An occupied port is a failure, not permission to reuse an
unknown app. Bounded readiness checks use login 200 and proxied unauthenticated
session 401. No new health endpoint is introduced. Parent-watchdog preloads stop
the local app servers if their supervisor dies.

## Browser contract

One serial Chromium scenario, one worker, no retry, named steps:

Test discovery is pinned to the exact checkout `e2e/smoke.spec.ts`. Build-source
archives under `.work/` must not execute additional copies against the same user;
the discovery regression test proves exactly one test/file.

1. UI login (which creates the dedicated profile if absent); verify generated
   UUID through session before any test note/tag writes.
2. Create and reload a unique catalog tag.
3. Create a note through autosave: Bench Press, 60 kg, 5 reps, rest 60, and
   run-specific exercise memo. Await matching save responses and reload values.
4. Assign the tag and verify persistence.
5. Calendar: target day contains the tag; opening it reads the saved note.
6. Analytics/BIG3: within the named Bench Press group, verify target date,
   `60 x 5` and estimated 1RM `70`, not another lift's values.
7. Delete the catalog tag; verify absence in the catalog and persisted note.
8. Logout: API success, token/cookie removal, refresh 401, protected redirect.
9. Controller cleanup with actual residual checks.

Browser timezone is Asia/Tokyo; the note date comes from the real UI. Google
font requests are blocked and use the existing fallback. Other off-origin
requests are blocked and fail the scenario. No Auth/application API is mocked.
Local HTTP cookies are non-Secure; this is not production HTTPS-cookie evidence.
Logout does not claim server-side revocation of every previously issued JWT.

Raw assertion errors are contained within each named step. Later steps stop
after a failure. The custom reporter returns failed unless every required step
passes; the controller also requires cleanup and output inspection to succeed.
This prevents raw assertion payloads/DOM from becoming reports, without
converting application failures into passes.

## P2A ownership and cleanup

Each run creates one `p2a-<timestamp>-<random>@p2a.invalid` Auth user.
Admin-controlled `app_metadata.p2a` records repository ownership, target,
run ID, creation time, a one-hour expiry and creator PID/host atomically with Auth
creation (ownership version 2). A private mode-0600 receipt in ignored `e2e/.runs/`
records its UUID using atomic replacement.

Deletion requires exact UUID, authoritative ownership, target, run ID, exact
synthetic email, matching creation time and bounded expiry. A prefix alone
never authorizes deletion. Normal cleanup belongs to the outer controller,
not a browser `afterAll`.

```sh
E2E_TARGET=local:Workout-Journal \
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
npm run e2e:cleanup -- --run-id <recorded-run-id>

E2E_TARGET=local:Workout-Journal \
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
npm run e2e:cleanup -- --stale
```

Explicit recovery refuses a live/ambiguous creator even after expiry. Pre-run
stale cleanup scans authoritative server metadata and deletes only expired owned
users whose local creator is confirmed gone. A receipt PID cannot override Auth
metadata. PID reuse, another host, or old/malformed ownership requires investigation;
expiry alone never grants permission to delete an active user.
Incomplete receipts cover a crash after Auth deletion but before residual
verification. A missing receipt does not hide an expired server-owned user.
Malformed ownership fails closed.

After exact Auth hard deletion, check profiles, notes and user_tags. Any
residual is FAIL and is retained for investigation: there is no residual DELETE
fallback or new administrative product endpoint.

The local operator owns recovery after interruption, including running stale
cleanup within one hour after expiry if there is no next smoke. P2A installs no
scheduler. Future unattended CD needs an independently invoked reconciler.
Missing final cleanup evidence cannot authorize promotion.

### Cascade and crash proof

```sh
E2E_TARGET=local:Workout-Journal \
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
npm run e2e:verify-cleanup
```

A separate disposable local fixture run creates one profile, note and tag via
the local Admin/Data API, then its process is SIGKILLed. A separate cleanup
process must prove Auth removal and all three row counts zero. This tests
user_tags cascade, rather than assuming the browser's earlier tag deletion
proved it. Existing users are not deleted.

## Evidence and secret safety

Only allowlisted JSON is published in ignored `e2e/evidence/<run-id>.json`:
run ID, isolated target, HEAD SHA, source digest (including uncommitted code,
config and locks), Chromium version, fixed step outcomes, cleanup and result.
Source changes during execution invalidate evidence.

- Trace, video, screenshots, HAR and storageState recording are off.
- `safe-test.ts` disables Playwright 1.63.0's internal automatic artifact recorder
  before listener registration. `PLAYWRIGHT_NO_COPY_PROMPT=1` alone is insufficient
  to prevent error-context files. Context options are explicitly reapplied without
  video/HAR/storage state; downloads are disabled. Recheck this internal fixture
  boundary when upgrading the pin; a different installed version is refused.
- Output is preserved, including on failure, so post-run inspection cannot hide
  unsafe files by deleting them. Uncaught framework errors and timeouts are tested
  separately from caught step errors.
- Raw errors, console, network bodies, headers, UUIDs, email and tokens are
  excluded. Subprocess output is drained without saving authenticated logs.
- Unique password/JWT-signing marker strings and a browser-console canary
  exercise output safety. Inspection rejects their values, the local Admin key,
  unexpected file types and JWT-shaped content.
- Unit tests inject dummy secrets into raw error/body/DOM fields and verify
  the report allowlist drops them.

`.runs/`, `.work/` and CLI state are private local runtime data, not artifacts
for review/upload. Git, Docker context and Cloud Build upload ignores exclude
them. P2A creates no upload or CD workflow.

The deliberate negative verification below must exit nonzero after writing
data, while still proving cleanup and secret-safe output:

```sh
E2E_TARGET=local:Workout-Journal \
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
npm run e2e -- --verify-failure
```

With the same explicit local target inputs, `--verify-framework-error` and
`--verify-timeout` exercise uncaught dummy-secret errors and framework timeout
after data creation. Both must exit nonzero, retain only safe JSON and prove zero
cleanup residuals. These are negative safety gates, never browser PASS evidence.

## Validation

Run `npm run e2e:test` (TypeScript check plus safety units), existing lint/build/
root Jest, actual local browser execution, SIGKILL proof and `git diff --check`.
The controller runs the existing root build script against the dotenv-free
source copy. Root Jest maps React types to the existing frontend copy so Next's
type augmentations are shared with root/shared tests; type checking stays on.
No CI workflow or dependency version was changed for that type-resolution fix.

Local success does not close Portfolio Must 2's candidate requirement, Must 3,
Must 4, PE-P1C-01B, WIF or production CD.

## P2B candidate execution boundary

Candidate mode is a separate, explicit Human-approved boundary. It does not weaken
P2A's local Docker/gateway/DB guard. It permits only the approved production Supabase
project `krpnnkcipyeasddzbpma` paired with the exact Cloud Run target below. It does
not provide general production stale cleanup, resource discovery, deploy, tag
mutation, traffic changes, promotion or a credential fallback.

The operator, not the runner, captures actual Cloud Run state immediately before
credential access and before/after smoke. `manifestFromReadback` in
`e2e/candidate-evidence.mjs` consumes the original sanitized preflight, successful
Build provenance and actual service/candidate-revision/production-revision JSON
for each side (`current.backend` / `current.frontend`, each containing `service`,
`revision`, `productionRevision`). Read these with `gcloud run services describe`
and `gcloud run revisions describe` for the exact project/region/names. Keep raw
runtime JSON in process memory; do not publish environment values or credentials.

The generated manifest must be an owner-readable-only regular file (0600), in
gitignored `e2e/.runs/p2b/`, with its SHA-256 passed separately. It includes project,
region, application source SHA, successful dedicated-SA Build ID/digests, exact
service/revision/tag/HTTPS URLs, runtime SAs, max instances, secret version refs,
Supabase identity, production 100% and candidate 0% traffic, and exact Frontend
`BACKEND_INTERNAL_URL`. Read-back also compares the candidate runtime spec with
the unchanged production revision, excluding only the approved image and Frontend
pairing change. Known-good tags and service invocation policy must stay unchanged.
Manifests expire after 15 minutes; refresh by actual read-back, not by editing a
timestamp. Recovery refreshes must preserve the same stable pair identity.

Execution inputs for the approved pair are:

| Input | Contract |
| --- | --- |
| `E2E_TARGET` | `candidate:p2b-081adb25` |
| `E2E_TARGET_MANIFEST` | Absolute path to the fresh validated 0600 manifest |
| `E2E_MANIFEST_SHA256` | SHA-256 of those exact manifest bytes |
| Private stdin | JSON envelope `{ secretRef: { project, name, version }, value }`; never print or persist it |
| `E2E_RESUME_AFTER_RUN` | Omit normally; only a separately Human-approved exact prior run after proven cleanup |

The process-private operator reads only the Secret Manager version referenced by
the actual Backend candidate (`workout-journal-supabase-secret-key:1` in
`workout-journal-506909`) and pipes the envelope into `npm run e2e` / its Node
entrypoint. The controller verifies manifest/hash/age before reading stdin and
matches the envelope reference exactly. No secret in argv, shell history, inherited
environment, repository, browser or reports. If access fails, stop; do not search
dotenv files or use another credential. No temporary credential file was used in
the recorded run.

Bounded readiness uses Frontend `/login` 200, Backend `/` 404 and proxied
unauthenticated `/api/auth/session` 401. The browser receives only the generated
login credentials, exact UUID and validated Frontend origin, never the Admin secret.
It runs the same eight product steps with Chromium, one worker and zero retries.
The HTTPS cookie assertion additionally requires `Secure`, `HttpOnly`,
`SameSite=Lax`, `Path=/api/auth` and the exact Frontend host. Logout requires cookie
and token removal, refresh 401 and protected navigation returning to `/login`;
this does not prove revocation of every previously issued JWT.

### P2B exact-user cleanup and resume

Before Auth creation, the controller preallocates a random UUID and atomically
records it in a private receipt. Auth creation uses that exact UUID, a unique
`p2b-<timestamp>-<random>@p2b.invalid` address and `email_confirm=true`, without
confirmation mail. Admin-controlled `app_metadata.p2b` records repository, purpose,
candidate ID, run ID, source SHA, creation/expiry, nonce and creator PID/host.
Authoritative Auth ownership must match the receipt before deletion.

Cleanup is in the outer controller even when the browser fails. It hard-deletes
only that exact UUID, then verifies Auth absence and exact-user row counts in
`public.users` (profile, `uuid`), `public.notes` (`userid`) and `public.user_tags`
(`user_id`). A residual or ambiguous owner is a failure, never permission for SQL
or a broader deletion. The P2B scenario deletes the catalog tag through the product
before Auth deletion; zero tag residual is not independent production evidence
of a nonempty tag cascade. P2A's local cascade/SIGKILL proof covers that failure
case without destructive production fixtures.

Independent recovery uses the same fresh manifest/hash and private credential
pipe with `npm run e2e:cleanup -- --run-id <exact-recorded-run-id>`. It refuses an
active/ambiguous creator and has no `--stale`, prefix scan, list-users or other-run
cleanup mode. Missing ownership requires a Human decision.

An attempt marker prevents automatic repeat creation. A new Human-approved resume
names the original exact run via `E2E_RESUME_AFTER_RUN`; its completed receipt must
show all four residuals zero, then the controller rechecks actual exact-user cleanup
before creating a new user. The original marker/receipt remain intact. A separate
exclusive resume marker prevents repeating that authorization. Never delete a
marker to bypass this gate.

### P2B evidence handling

The browser/controller publishes only allowlisted JSON: operational pair identity,
application SHA, runner content digest, run ID, Chromium version, fixed step results,
HTTPS-cookie assertion, cleanup counts, traffic and result. Password, Admin secret,
canary, email and UUID are checked against generated output; JWT-shaped content
and non-JSON artifacts are rejected. Raw trace/video/HAR/storageState, screenshots,
DOM, authenticated console, network bodies, headers and cookies are not recorded.

The controller's successful scenario result is initially
`PENDING_TRAFFIC_VERIFICATION`, not PASS. After a fresh actual Cloud Run read-back,
`finalizeCandidateEvidence` requires the unchanged pair, all steps PASS, HTTPS
cookie proof, four zero residuals and leak inspection before producing final PASS.
`.runs/` remains private operational recovery material, not publishable evidence.
Sanitized JSON in `e2e/evidence/` is gitignored and available for local review;
no artifact upload or CD workflow is implemented.

## P2B verified candidate proof

Verified on 2026-09-05 under the approved Human Gate:

This version-controlled section is the durable closure record. The gitignored
JSON is optional corroboration, not a prerequisite for reviewing the evidence
after local files are lost. Application source and runner source are distinct.

| Evidence | Value |
| --- | --- |
| Application source | `9b6c3c69543784b3e02e4fd9b45d8e7a4b34300d` |
| Runner source | `test/portfolio-p2b-candidate-proof`; content digest `152b96bca7b5d23aff5320fb3bdc195dcf473e3fcd55a5acc32e86e7c7e23edb` |
| Cloud Build | `743110a9-a0c0-4633-a6a9-fe722e05502e`, SUCCESS; dedicated `workout-journal-build` SA |
| Backend digest | `sha256:9cad56664e9a945d18308e67bd2a8132737bbcc42e57c173cb158c99348fd25f` |
| Frontend digest | `sha256:a6dab5bb53b6c83acdd30b99960fcfcfb259d42e40ddf0db759b99d63a5dca79` |
| Candidate ID / shared tag | `p2b-081adb25` / `candidate-p2b-081adb25` |
| Backend revision | `workout-journal-backend-p2b-081adb25`, 0% |
| Frontend revision | `workout-journal-frontend-p2b-081adb25`, 0% |
| Successful run | `p2b-1788593776629-9943a84c9ea7c644` |
| Browser | Chromium `153.0.8010.12` |
| Product steps | All eight PASS; actual autosave/reload, Calendar, Analytics and logout assertions above |
| HTTPS session / logout | PASS: Secure, HttpOnly, SameSite=Lax, Path=/api/auth; logout removed the cookie and token, refresh returned 401, and protected navigation did not restore auth |
| Cleanup | Auth=0, profiles=0, notes=0, user_tags=0 |
| Secret-leak inspection | PASS: actual Admin secret, generated password, user identity and console canary absent from generated evidence; no JWT or raw trace/video/HAR/storageState artifacts |
| Production before/after | Backend `workout-journal-backend-00003-luc` 100%; Frontend `workout-journal-frontend-00003-xar` 100%; known-good tag `candidate-0829-923536` unchanged |
| Final traffic read-back | `2026-09-05T07:37:30.332Z`; both candidates 0%, both production revisions 100% |
| Portfolio status | Must 2 **Closed**; Must 4 **Open** |
| Optional local sanitized JSON | `e2e/evidence/p2b-1788593776629-9943a84c9ea7c644-final.json` (gitignored) |
| Evidence SHA-256 | `d8240891fcded480ce0268507e16c9e0bfbf251320f649e74806bb5460c95add` |

| Required browser step | Recorded result / meaningful observation |
| --- | --- |
| Login | PASS: UI authentication; `/session` matched the generated user UUID before data writes |
| Tag create | PASS: unique catalog tag persisted after reload and authenticated re-read |
| Note create / autosave / read | PASS: successful save responses, then reload retained Bench Press, 60 kg, 5 reps, rest 60 and the run-specific memo |
| Tag use | PASS: note association persisted after reload and authenticated re-read |
| Calendar | PASS: the target date displayed the tag; opening it exposed the persisted note |
| Analytics | PASS: BIG3 Bench Press showed the target date, `60 x 5` and estimated 1RM `70` |
| Tag delete | PASS: tag disappeared from both catalog and persisted note after reload |
| Logout | PASS: successful API response, token/cookie removal, refresh 401 and protected-route redirect to `/login` |

Exact Frontend entry:
`https://candidate-p2b-081adb25---workout-journal-frontend-cpbzb7lqza-an.a.run.app`

Exact Backend target (equal to the Frontend revision's read-back `BACKEND_INTERNAL_URL`):
`https://candidate-p2b-081adb25---workout-journal-backend-cpbzb7lqza-an.a.run.app`

The initial attempt `p2b-1788593006947-460f4cdcb950a981` stopped on Supabase
NXDOMAIN before browser execution. After the owner resumed the project, the exact
previous UUID was absent and all four residuals were verified zero before the
approved new run. Its failure and recovery evidence remain historical, not PASS
browser evidence. No candidate rebuild/redeploy was performed for the resume.

Fresh review on 2026-09-05 independently re-read Cloud Run traffic, exact pairing,
image digests and Cloud Build identity. The build's actual GCS source archive
matched all 169 application/build-config files at the application SHA above.
GET-only checks of the two exact receipt UUIDs reconfirmed Auth absence and zero
profile (`public.users`), note and catalog-tag residuals. The recovery record
predates creation of the successful run's user. The final JSON hash and runner
content digest matched; documentation-only review corrections did not change
the browser assertions or invalidate that runtime proof. No production E2E
rerun or production data mutation was needed for this review.

Both candidates remain at 0%; no promotion, tag reassignment or deletion occurred.
This closes Must 2 runtime coverage, not Must 4, WIF submission, Environment approval,
full v1 release smoke or production CD. Password recovery was not executed.
