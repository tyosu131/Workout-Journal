# Verification

This project uses separate dependency sets for the root workspace, frontend, and backend. Install each one before running local verification.

## Local Commands

```bash
npm ci
npm ci --prefix frontend
npm ci --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run build --prefix backend
npm test -- --passWithNoTests
```

## CI Checks

GitHub Actions runs the same baseline on push and pull request:

- Install root dependencies with `npm ci`
- Install frontend dependencies with `npm ci --prefix frontend`
- Install backend dependencies with `npm ci --prefix backend`
- Run frontend lint with `npm run lint --prefix frontend`
- Run frontend build with `npm run build --prefix frontend`
- Run backend build with `npm run build --prefix backend`
- Run the root Jest baseline with `npm test -- --passWithNoTests`

## Current Baseline

- Frontend build is expected to pass once frontend dependencies are installed.
- Backend build currently runs `echo 'No build process required for backend'`; it is a placeholder verification step.
- Root Jest is configured in `jest.config.js`, but it currently scans `frontend` only.
- There is a shared utility test under `shared/utils/__tests__/calendarUtils.spec.ts`, but it is outside the current Jest root and is not counted by the root Jest run yet.
- `--passWithNoTests` is a temporary CI baseline measure. It keeps CI useful while making the missing test coverage explicit.

## Test Candidates

- Include shared utility tests in the Jest roots or add a dedicated shared test command.
- Add tests for `shared/utils/calendarUtils.ts` and `shared/utils/validationUtils.ts`.
- Add API client tests for token refresh and authorization header behavior.
- Add backend auth utility tests for token creation and validation.
- Add route/service tests for notes and auth error paths.
