const { getErrorSummary } = require("./errorSummary");

const OPERATIONS = new Set([
  "server_handler", "auth_session", "auth_refresh", "auth_signup", "auth_login",
  "auth_get_user", "auth_update_user", "auth_forgot_password", "note_get",
  "note_save", "note_range", "note_tags", "note_by_tags", "tag_create",
  "tag_delete", "weekly_summary",
]);

const logFailure = (operation, error) => {
  console.error(JSON.stringify({
    severity: "ERROR",
    event: "server_failure",
    operation: OPERATIONS.has(operation) ? operation : "unknown_operation",
    error: getErrorSummary(error),
  }));
};

module.exports = { logFailure };
