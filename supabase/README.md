# Supabase Rebuild Draft

## Status

This directory is the first migration draft for a new Supabase project. It is a target schema for the current application contract, not a claim that it exactly reproduces the unverified live database or every historical backup object.

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
- `notes.userid` is `not null` in the target schema. An orphaned legacy note must be quarantined during import rather than becoming an unscoped row.
- `notes.note`, `notes.exercises`, and `notes.tags` remain nullable to preserve the verified historical `notes` storage contract.
- `users.name` and `users.email` are intentionally nullable in this first target migration. Current code uses both fields, but the reviewed backup does not establish their historical constraints.
- `user_tags.id` uses a generated identity because the current backend reads it but never supplies it. The historical identifier type is an open question.
- `unique (user_id, tag)` makes the tag catalog user-scoped even if application-level duplicate checking races.

## RLS and Backend Access Boundary

**Current implementation:** the backend has separate client boundaries. Request-local Auth clients use `SUPABASE_PUBLISHABLE_KEY` for `signUp`, `signInWithPassword`, and password-reset email requests. A singleton Admin/DB client uses backend-only `SUPABASE_SECRET_KEY` for `public.users`, `public.notes`, `public.user_tags`, and `remove_tag_from_notes`.

Both clients disable session persistence, automatic refresh, and URL session detection. The backend continues to enforce its own JWT user scope before Admin/DB operations. RLS is enabled on all application tables, and this draft creates no `anon` or `authenticated` policies because browser code does not directly access those tables.

Password recovery is the exception to the no-browser-session rule: the reset page creates a temporary browser client with the publishable key, establishes the Supabase recovery session from the redirect, updates the password, and clears the session. The secret key is never exposed to the frontend. Email changes and logged-in password changes remain future work because they require dedicated confirmation and security flows.

### Known Partial Failure: Tag Deletion

The current backend deletes the `user_tags` row and then invokes `remove_tag_from_notes` as two separate operations. This migration keeps the RPC compatible with that behavior, but does not make the sequence atomic: an RPC failure can leave the catalog row deleted while note tags remain. Atomic tag deletion requires a later coordinated backend/RPC change and is outside this draft.

## Migration Order

1. Review and approve the target schema decisions and unresolved historical fields.
2. Apply `20260724000000_create_workout_journal_schema.sql` to an empty new project.
3. Apply `20260724000100_create_remove_tag_from_notes.sql`.
4. Run the read-only checks in `validation/validate_initial_schema.sql`.
5. Configure `SUPABASE_PUBLISHABLE_KEY`, backend-only `SUPABASE_SECRET_KEY`, and the registered password-reset redirect URL before the application connects to this schema.
6. Complete the user-ID remap and application-data import described in [Legacy Data Migration](./legacy-data-migration.md).
7. Repeat validation and run application-level signup, note save, tag deletion, and analytics checks before cutover.

## Rollback Policy

Treat these migrations as forward-only. Do not create a destructive down migration for a project that may already contain imported user data.

Before application cutover, keep the legacy deployment and a protected legacy backup available as the rollback path. If validation fails before import, discard and recreate the isolated new project only after confirming it contains no required data. If validation fails after import, stop cutover, preserve the failed-project evidence, and correct the schema with a new forward migration after determining the cause.

## Open Questions

- The historical `users` and `user_tags` DDL, constraints, indexes, RLS policies, and triggers are not in the reviewed backup material.
- The legacy project's key roles and live configuration remain unverified. The reconstructed application boundary uses `SUPABASE_PUBLISHABLE_KEY` for Auth operations and backend-only `SUPABASE_SECRET_KEY` for database/RPC operations.
- The live legacy schema, actual RLS configuration, and `remove_tag_from_notes` definition remain unverified.
- A one-off import must confirm that every imported legacy application user has a new Auth UUID before notes or tags are written.
