// Values as well as keys are allowlisted. Dependency-controlled names/codes can
// contain request data; never serialize an arbitrary exception or its message.
const ERROR_NAMES = new Set([
  "Error", "TypeError", "RangeError", "SyntaxError", "PostgrestError",
  "AuthApiError", "AuthRetryableFetchError", "AuthUnknownError",
]);

const getErrorSummary = (error) => {
  if (!error || typeof error !== "object") {
    return { name: "UnknownError" };
  }

  try {
    const name = error.name;
    const status = error.status;
    return {
      name: ERROR_NAMES.has(name) ? name : "UnknownError",
      ...(Number.isInteger(status) && status >= 400 && status <= 599 ? { status } : {}),
    };
  } catch {
    // Even throwing property accessors must not mask the original failure.
    return { name: "UnknownError" };
  }
};

module.exports = { getErrorSummary };
