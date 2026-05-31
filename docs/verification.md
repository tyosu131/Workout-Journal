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
npm test
```

## CI Checks

GitHub Actions runs the same baseline on push and pull request:

- Install root dependencies with `npm ci`
- Install frontend dependencies with `npm ci --prefix frontend`
- Install backend dependencies with `npm ci --prefix backend`
- Run frontend lint with `npm run lint --prefix frontend`
- Run frontend build with `npm run build --prefix frontend`
- Run backend JavaScript syntax check with `npm run build --prefix backend`
- Run the root Jest baseline with `npm test`

## Current Baseline

- Frontend build is expected to pass once frontend dependencies are installed.
- Backend build runs a JavaScript syntax check over backend `.js` files with `node --check`.
- Root Jest is configured in `jest.config.js` and scans both `frontend` and `shared`.
- Shared utility tests under `shared/utils/__tests__` are included in `npm test` and CI.
- `--passWithNoTests` was removed after adding shared tests to the Jest baseline.
- Test output no longer includes the old `calendarUtils` debug log or the `ts-jest` `esModuleInterop` warning.
- Frontend build output no longer logs repeated `NEXT_PUBLIC_API_URL configured: false` messages.
- The Next.js custom font warning remains because `frontend/pages/_document.tsx` does not exist yet.

## Test Candidates

- Expand coverage for `shared/utils/calendarUtils.ts` and `shared/utils/validationUtils.ts`.
- Add API client tests for token refresh and authorization header behavior.
- Add backend auth utility tests for token creation and validation.
- Add route/service tests for notes and auth error paths.
- Add `frontend/pages/_document.tsx` and move global font links there, if the app keeps using link-based font loading.
- Add backend unit tests or integration tests; the current backend build checks syntax only.
