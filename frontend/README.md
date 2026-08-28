# Workout Journal Frontend

This is the Next.js 15 Pages Router frontend. Production browser traffic uses one public origin:

```text
Browser
-> Frontend Cloud Run
-> same-origin /api/*
-> Pages API proxy
-> Backend Cloud Run
```

The catch-all route at `pages/api/[...proxyPath].ts` only forwards `auth`, `notes`, and `analytics`. It reads `BACKEND_INTERNAL_URL` at server runtime. That variable must not be public, passed as a build argument, or exposed to client code.

The only browser-visible environment values are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. They support the password-recovery update boundary; application database access remains backend-only.

Use Node 24 and install from the repository root:

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
```

For local proxy operation, set `BACKEND_INTERNAL_URL=http://localhost:3001` in `frontend/.env.local`. Open `http://localhost:3000`; do not configure browser code with a Backend base URL.

Quality gates:

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
npm test -- --runInBand
```

Deployment and rollback instructions are in [the Cloud Run runbook](../docs/cloud-run-deployment-runbook.md).
