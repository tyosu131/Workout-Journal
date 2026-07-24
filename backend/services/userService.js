const {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleGetUser,
  handleUpdateUser,
  handleLogin,
} = require("./authService");

// Retained for an unmounted legacy import surface. Route registration uses authService.
module.exports = {
  getSession: handleSession,
  refreshToken: handleRefresh,
  signUp: handleSignUp,
  getUser: handleGetUser,
  updateUser: handleUpdateUser,
  login: handleLogin,
};
