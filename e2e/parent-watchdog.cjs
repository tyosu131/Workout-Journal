// Only loaded by the local harness, never by the product's normal entry point.
// Stop localhost app servers if their supervisor dies (including SIGKILL).
const parent = process.ppid;
const timer = setInterval(() => {
  if (process.ppid !== parent) process.exit(1);
}, 1000);
timer.unref();
