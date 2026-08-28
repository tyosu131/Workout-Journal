const express = require("express");
const {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
  handleLogout,
} = require("../services/authService");

const router = express.Router();

// Endpoints
router.get("/session", handleSession);
router.post("/refresh", handleRefresh);
router.post("/signup", handleSignUp);
router.post("/login", handleLogin);
router.get("/get-user", handleGetUser);
router.put("/update-user", handleUpdateUser);
router.post("/forgot-password", handleForgotPassword);
router.post("/logout", handleLogout);

module.exports = router;
