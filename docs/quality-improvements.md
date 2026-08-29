# Quality Improvements

## Overview

This project has been improved with cloud migration, production operation, and continuous verification in mind. The work does not make the application a complete production operations platform; it establishes a practical baseline for safer configuration, cleaner logs, repeatable CI checks, and future test expansion.

## Improvements

### Environment / Configuration

- Removed the backend startup dependency on a fixed EC2 `.env.local` path.
- Added environment variable examples for backend and frontend setup.
- Made the backend CORS origin configurable through environment variables, while keeping the local default.
- Standardized root, frontend, backend, CI, and container contracts on Node 24.
- Added a server-only Backend target and a same-origin `/api/*` allow-listed proxy for production browser traffic.

### Security / Logging

- Removed or reduced logs that exposed secret, token, or environment variable values.
- Avoided logging Authorization header values, access token values, refresh token values, and localStorage token values.
- Replaced raw Axios/Supabase/profile/request logging with allow-listed failure summaries.
- Centralized refresh-cookie issue/clear attributes and added Backend logout.

### CI / Verification

- Added a GitHub Actions CI workflow for push and pull request checks.
- CI installs root, frontend, and backend dependencies separately.
- CI runs frontend lint, frontend build, backend build, and root Jest tests.

### Testing

- Added shared utility tests.
- Added frontend API client tests for authenticated requests, unauthenticated requests, refresh behavior, and network error handling.
- Added backend auth utility tests for JWT generation, verification, and refresh behavior.
- Added backend note service tests with mocked Supabase and auth utilities.
- Added backend auth service validation and refresh tests.

### Backend Build

- Replaced the backend build placeholder with a JavaScript syntax check.
- `npm run build --prefix backend` now runs `node --check` against backend JavaScript files.

### Cloud Run Build and Recovery

- Added separate Node 24 multi-stage Dockerfiles for Frontend and Backend using the repository root as build context.
- Added build-context exclusions for environment files, credentials, Git data, dependencies, coverage, and temporary artifacts.
- Added Cloud Build configuration for two git-SHA-tagged Artifact Registry images.
- Added a digest-based deployment, known-good revision-pair, redeploy, and rollback runbook.
- Completed the approved Cloud Run/Supabase production deployment, major-workflow browser smoke, and synthetic-data cleanup. The known-good artifact and revision pair are recorded in the [v1 production release record](./releases/workout-journal-v1.md).

### Bug Fix

- Fixed `handleRefresh` to await the async `verifyToken` call.
- Added tests for missing, invalid, valid, and failed refresh token verification paths.

## Current Verification Baseline

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
npm run build --prefix backend
npm test
```

## Remaining Work

- Resolve or document the Google Fonts download warning during build.
- Add more backend service and route tests.
- Add Supabase success and error path tests.
- Complete the separately scoped Must conditions in the [Portfolio Finish Completion Contract](./portfolio-completion-contract.md). This does not reopen the completed v1 deployment or smoke.
- Triage advisories for each future release candidate; critical/high advisories block that candidate unless explicitly resolved or accepted through the applicable release process.

## How to Explain This Project

- Improved an existing workout journal app with cloud migration and production operation in mind.
- Reduced environment-specific assumptions, removed sensitive logging, added CI, expanded tests, and strengthened backend verification.
- Focused on building a maintainable foundation for continuous development rather than adding new user-facing features.
