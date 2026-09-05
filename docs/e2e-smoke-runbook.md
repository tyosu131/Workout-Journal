# P2A local-only E2E smoke

P2A is the safe local foundation for Portfolio Must 2, not its closure.
Approved production-like candidate verification remains P2B. WIF, PE-P1C-01B,
production Environment and CD remain unchanged; the required CI workflow does
not execute this suite.

## Prerequisites

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

## Execution

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

## Ownership and cleanup

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
