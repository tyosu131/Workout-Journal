# Supabase Rebuild

## Status

This directory contains the target schema migrations for a new Supabase project. The two migrations have been applied to and validated against an isolated Hosted Supabase project running PostgreSQL 17.

The isolated verification covered the read-only schema validation, Auth flows, browser password recovery, the backend-only database boundary, direct browser Data API denial, and two-user application isolation. The synthetic Auth users and application rows created for verification have been removed, and the isolated project has been retained with zero Auth users, profiles, notes, and tags.

**Current Project Decision:** the legacy environment contained only disposable test data. Legacy Auth users and application data were not imported; the v1 production release used the approved clean-start policy.

The Hosted isolated verification remains point-in-time evidence and did not, by itself, establish production readiness. The same target Supabase project was subsequently used by the known-good v1 production release. Production deployment, major-workflow smoke, and synthetic-data cleanup are recorded separately in the [v1 production release record](../docs/releases/workout-journal-v1.md).

No migration in this directory contains production data, Supabase credentials, Auth credentials, email addresses, or user IDs.

## Confirmed Application Contract

The current backend reads and writes the following public-schema fields:

| Object | Confirmed fields or behavior |
| --- | --- |
| `users` | `uuid`, `name`, and `email`; signup upserts by `uuid`. |
| `notes` | `date`, `note`, `exercises`, `userid`, and `tags`; note save upserts with `(date, userid)`. |
| `user_tags` | `id`, `user_id`, and `tag`; tags are selected by `user_id` and inserted without an `id`. |
| `remove_tag_from_notes` | Receives `_user_id` and `_tag`; tag deletion must only change the matching user's notes. |

The reviewed backup verifies the historical `notes` column types and its foreign key to `public.users(uuid)`. It also records the incompatible historical `PRIMARY KEY (date)` and `UNIQUE (date, userid)` combination. It does not provide DDL for `public.users`, `public.user_tags`, or the RPC.

## Target Schema Decisions

- `notes` uses `primary key (date, userid)`. This guarantees one note per user per date and is the conflict target used by `backend/services/noteService.js`.
- `notes.userid` is `not null` in the target schema. If legacy-data preservation becomes a future requirement, an orphaned legacy note must be quarantined rather than imported as an unscoped row.
- `notes.note`, `notes.exercises`, and `notes.tags` remain nullable to preserve the verified historical `notes` storage contract.
- `users.name` and `users.email` are intentionally nullable in this first target migration. Current code uses both fields, but the reviewed backup does not establish their historical constraints.
- `user_tags.id` uses a generated identity because the current backend reads it but never supplies it. The historical identifier type is an open question.
- `unique (user_id, tag)` makes the tag catalog user-scoped even if application-level duplicate checking races.

## RLS and Backend Access Boundary

**Current implementation:** the backend has separate client boundaries. Request-local Auth clients use `SUPABASE_PUBLISHABLE_KEY` for `signUp`, `signInWithPassword`, and password-reset email requests. A singleton Admin/DB client uses backend-only `SUPABASE_SECRET_KEY` for `public.users`, `public.notes`, `public.user_tags`, and `remove_tag_from_notes`.

Both clients disable session persistence, automatic refresh, and URL session detection. The backend continues to enforce its own JWT user scope before Admin/DB operations. RLS is enabled on all application tables, and the target migrations create no `anon` or `authenticated` policies because browser code does not directly access those tables.

Password recovery is the exception to the no-browser-session rule: the reset page creates a temporary browser client with the publishable key, establishes the Supabase recovery session from the redirect, updates the password, and clears the session. The secret key is never exposed to the frontend. Email changes and logged-in password changes remain future work because they require dedicated confirmation and security flows.

### Known Partial Failure: Tag Deletion

The current backend deletes the `user_tags` row and then invokes `remove_tag_from_notes` as two separate operations. This migration keeps the RPC compatible with that behavior, but does not make the sequence atomic: an RPC failure can leave the catalog row deleted while note tags remain. Atomic tag deletion requires a later coordinated backend/RPC change and is outside this Supabase rebuild scope.

## Migration Order

1. **Complete:** Review and approve the target schema decisions and unresolved historical fields.
2. **Complete:** Apply `20260724000000_create_workout_journal_schema.sql` and `20260724000100_create_remove_tag_from_notes.sql` to an empty isolated Hosted project.
3. **Complete:** Run the read-only checks in `validation/validate_initial_schema.sql` against PostgreSQL 17.
4. **Complete:** Configure Auth and application settings for isolated verification without committing credentials.
5. **Complete:** Verify signup, login, browser password recovery, note/tag behavior, multi-user isolation, direct Data API denial, backend privileged access, RLS, privileges, and the RPC contract.
6. **Complete:** Remove synthetic verification users and confirm their profiles, notes, and tags were removed by cascade, leaving the retained isolated project empty.
7. **Complete:** Configure the production/release environment, including its Supabase values and registered password-reset redirect URL.
8. **Complete:** Repeat the required application and release checks against the final configuration.
9. **Complete:** Perform the approved v1 production deployment, major-workflow smoke, and synthetic-data cleanup; see the [v1 production release record](../docs/releases/workout-journal-v1.md).

Legacy application-data import is not part of the current migration order. [Legacy Data Migration](./legacy-data-migration.md) is retained only as a contingency reference if the Clean Start decision changes in the future.

## Rollback Policy

Treat these migrations as forward-only. Do not create a destructive down migration for a project that may contain required data.

The completed Clean Start decision does not erase the historical backup evidence. Application rollback uses a recorded compatible Frontend/Backend revision pair as defined by the [Cloud Run deployment runbook](../docs/cloud-run-deployment-runbook.md); it does not use a destructive database down migration. For future candidates, a failed release check must stop promotion and be investigated rather than bypassed with a reset or migration-history repair.

## Open Questions

- The historical `users` and `user_tags` DDL, constraints, indexes, RLS policies, and triggers are not in the reviewed backup material.
- The legacy project's key roles and live configuration remain unverified. The reconstructed application boundary uses `SUPABASE_PUBLISHABLE_KEY` for Auth operations and backend-only `SUPABASE_SECRET_KEY` for database/RPC operations.
- The live legacy schema, actual RLS configuration, and `remove_tag_from_notes` definition remain unverified.
- If a future decision reintroduces legacy-data preservation, a one-off import must confirm that every imported legacy application user has a new Auth UUID before notes or tags are written.
