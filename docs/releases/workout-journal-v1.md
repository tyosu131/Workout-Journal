# Workout-Journal v1 Production Release Record

## Release status

- Release: Workout-Journal v1
- Status: Known-good / Production
- Production evidence date: 2026-08-29
- Evidence source: Human-confirmed production deployment and smoke results
- v1 final Done: Complete

## Release source and environment

| Field | Recorded value |
|---|---|
| Git SHA | `4fdc8f597d96e580c6c2ed8850952e5aa15c1bfc` |
| Cloud Build ID | `75c83256-303d-47f7-b57b-c473983893d0` |
| Cloud Build result | `SUCCESS` |
| GCP project | `workout-journal-506909` |
| GCP project number | `437413312066` |
| Region | `asia-northeast1` |
| Artifact Registry repository | `workout-journal` |
| Supabase project | `workout-journal-hosted-migration-verify` |
| Supabase project ref | `krpnnkcipyeasddzbpma` |
| Supabase region | Northeast Asia (Tokyo) |
| Candidate ID | `0829-923536` |

## Known-good revision pair

### Backend

| Field | Recorded value |
|---|---|
| Image | `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-backend` |
| Digest | `sha256:66eae60e0393c5c27e6a59dd7ff7f1257b14aa23c8e6a2d8f6e23c507c4fceb5` |
| Revision | `workout-journal-backend-00003-luc` |
| Candidate tag | `candidate-0829-923536` |
| Exact tagged URL | `https://candidate-0829-923536---workout-journal-backend-cpbzb7lqza-an.a.run.app` |
| Current traffic | 100% |

### Frontend

| Field | Recorded value |
|---|---|
| Image | `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-frontend` |
| Digest | `sha256:6c1be54ce884c67b462e473e3eff1f5289a32edb6d64ac4375f6f251d0f40281` |
| Revision | `workout-journal-frontend-00003-xar` |
| Candidate tag | `candidate-0829-923536` |
| `BACKEND_INTERNAL_URL` | `https://candidate-0829-923536---workout-journal-backend-cpbzb7lqza-an.a.run.app` |
| Current traffic | 100% |

The Frontend revision is paired with the exact Backend tagged URL above. Retain `candidate-0829-923536` while this Frontend revision is known-good or rollback eligible. Rollback uses the recorded revision names; it does not move the Backend tag. The retired `candidate-0828-ee0ec5` and `candidate-0829-8d6e64` tags were removed from both services.

## Secret version record

Only Secret Manager names and version numbers are recorded here; no secret values are included.

| Secret | Version | State note |
|---|---:|---|
| `workout-journal-supabase-secret-key` | 1 | Active release version |
| `workout-journal-jwt-secret` | 2 | Active release version |
| `workout-journal-jwt-secret` | 1 | Disabled after credential-exposure rotation |

## Smoke evidence

Production smoke result: **PASS**.

- signup and login
- refresh cookie, including HttpOnly, Secure, SameSite=Lax, `Path=/api/auth`, and host-only scope
- note save and read
- tag create, use, and delete
- Calendar read
- Analytics read
- logout and no authenticated recovery after logout
- password recovery and reset-password redirect
- password update and login with the new password

Candidate-phase deterministic probes also passed:

| Probe | Result |
|---|---:|
| Frontend `/` | 200 |
| Frontend `/api/notes/test` | 401 |
| Frontend `/api/unknown` | 404 |
| Backend `/` | 404 |
| Backend `/notes/test` | 401 |
| Backend `/auth/refresh` without a cookie | 401 |

## Synthetic production data cleanup

Status: **COMPLETE**.

The synthetic production smoke user and associated profile, notes, and tags were removed. Cleanup was verified on 2026-08-29 with zero rows remaining in `auth.users`, `public.users`, `public.notes`, and `public.user_tags`.
