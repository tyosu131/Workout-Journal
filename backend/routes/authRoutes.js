const express = require("express");
const {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
  handleResetPassword,
} = require("../services/authService");

const router = express.Router();

// ログ用ミドルウェア
router.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Body:`, req.body);
  next();
});

// エンドポイント
router.get("/session", handleSession);
router.post("/refresh", handleRefresh);
router.post("/signup", handleSignUp);
router.post("/login", handleLogin);
router.get("/get-user", handleGetUser);
router.put("/update-user", handleUpdateUser);
router.post("/forgot-password", handleForgotPassword);
router.put("/reset-password", handleResetPassword);

module.exports = router;
