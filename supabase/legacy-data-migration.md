# Legacy Data Migration and User-ID Remap — Contingency Reference

## Current Project Decision

The current legacy environment contains only disposable test data. Legacy Auth users and application data will not be migrated to the new Supabase environment. The new environment will start clean.

This runbook is not a current required migration procedure. It is retained only as a contingency and historical reference if preserving legacy data becomes a future requirement.

## Contingency Scope

If the current decision changes, this runbook describes a possible controlled import from the legacy application data into a new Supabase project. It does not place Supabase Auth credentials, password hashes, access tokens, refresh tokens, or any production data in this repository.

## Contingency Auth Strategy

Supabase-to-Supabase Auth schema and password-hash migration can be technically possible. If legacy-data preservation becomes required and this contingency is adopted, the lower-scope approach described here would exclude Auth schema and password-hash migration: create new Supabase Auth users in the target project, then remap legacy application data to their new UUIDs.

## Conditional Mapping Requirements

A future import owner would maintain a protected, one-to-one mapping outside version control:

| Mapping column | Meaning |
| --- | --- |
| `legacy_user_id` | User identifier referenced by the legacy application data. |
| `new_user_id` | Fresh UUID created by the new project's Supabase Auth user. |

The mapping must have exactly one new user for each imported legacy user, no duplicate `new_user_id`, and no unmapped `notes.userid` or `user_tags.user_id` values. The mapping itself is sensitive operational data and must not be committed.

## Contingency Import Sequence

If legacy-data preservation becomes required and this runbook is reactivated:

1. Export legacy application data into an access-controlled operational location. Do not commit exports, credentials, email addresses, UUIDs, note text, exercises, or tags.
2. Create or invite users in the new Supabase Auth project. Under this contingency, new Auth users plus UUID remapping would be used instead of copying Auth credentials or password hashes.
3. Record the resulting new Auth UUIDs in the protected mapping.
4. Import public user profiles using `new_user_id` as `public.users.uuid`. Preserve only the profile columns confirmed for the target schema.
5. Import `user_tags` after remapping `legacy_user_id` to `new_user_id`. Preserve tags only for mapped users and rely on `unique (user_id, tag)` to reject duplicates.
6. Import `notes` after the same remap. Preserve the verified historical note columns only: `date`, `note`, `exercises`, and `tags`; write `new_user_id` as `userid`.
7. Quarantine, count, and resolve records with null, unknown, or ambiguous legacy user IDs. Do not insert them with a null `userid`.
8. Run the read-only validation queries, then verify the application through the new backend before DNS or environment cutover.

## Contingency Safety Rules

- Do not copy rows from the legacy `auth` schema or attempt to reuse legacy passwords under this contingency. This is a scope and risk decision, not a claim that Auth migration is technically impossible.
- Do not disable the composite `notes` primary key to accommodate duplicate data. Resolve duplicates per legacy user before import.
- Keep the legacy source read-only during the final export window, or record a cutover boundary so later writes are not silently omitted.
- Run imports in a controlled environment with an explicit transaction and a tested rollback plan. The exact import SQL is intentionally not committed because the legacy `users` and `user_tags` DDL, export format, and live data quality remain unverified.
- Do not report individual import failures as successful. Keep only aggregate counts in migration evidence.

## Contingency Completion Criteria

If a future import is approved, it would be complete only when:

- Every imported `notes.userid` and `user_tags.user_id` maps to a new `public.users.uuid` and new `auth.users.id`.
- There are no duplicate `(date, userid)` pairs.
- There are no null `notes.userid` values.
- The target schema, RLS state, and RPC privileges pass `validation/validate_initial_schema.sql`.
- Signup, login, note save, tag create/delete, date-range read, and analytics pass against the new project through the backend.
