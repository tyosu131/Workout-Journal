// Keep P2A's explicit local guard intact. Candidate mode is a separate boundary.
if (process.env.E2E_TARGET?.startsWith('candidate:')) await import('./candidate-run.mjs');
else await import('./run.mjs');
