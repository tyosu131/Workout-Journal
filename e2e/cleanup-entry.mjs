if (process.env.E2E_TARGET?.startsWith('candidate:')) await import('./candidate-cleanup.mjs');
else await import('./cleanup.mjs');
