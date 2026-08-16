const express = require("express");
const {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
} = require("../services/authService");

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Body keys:`, Object.keys(req.body || {}));
  next();
});

// Endpoints
router.get("/session", handleSession);
router.post("/refresh", handleRefresh);
router.post("/signup", handleSignUp);
router.post("/login", handleLogin);
router.get("/get-user", handleGetUser);
router.put("/update-user", handleUpdateUser);
router.post("/forgot-password", handleForgotPassword);

module.exports = router;
