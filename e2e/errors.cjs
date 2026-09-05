// Shared by Node controllers and Playwright's CommonJS config loader.
class SafeError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function check(condition, code) {
  if (!condition) throw new SafeError(code);
}
module.exports = { SafeError, check };
