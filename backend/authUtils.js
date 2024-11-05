const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const supabase = require("./supabaseClient");

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// アクセストークン発行関数
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRETが設定されていません。");
    throw new Error("JWT_SECRETが設定されていません。");
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h" }
  );
  console.log("Generated Access Token:", token); // トークン生成のログ
  return token;
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRETが設定されていません。");
    throw new Error("JWT_SECRETが設定されていません。");
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" }
  );
  console.log("Generated Refresh Token:", token); // リフレッシュトークン生成のログ
  return token;
};

// JWTのトークンを検証する関数
const verifyToken = async (token) => {
  try {
    console.log("Verifying Token:", token); // トークン検証のログ
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token Verified:", decoded); // 検証成功のログ
    return decoded;
  } catch (error) {
    console.error("トークンの検証に失敗しました:", {
      message: error.message,
      name: error.name,
      token,
    });
    return null;
  }
};

// 新しいアクセストークンを発行するためのリフレッシュエンドポイント
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "リフレッシュトークンが提供されていません" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newAccessToken = generateAccessToken({ id: decoded.id, email: decoded.email });
    res.json({ access_token: newAccessToken });
  } catch (error) {
    console.error("リフレッシュトークンの更新に失敗しました:", error);
    res.status(403).json({ message: "無効または期限切れのリフレッシュトークンです" });
  }
});

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  router, // リフレッシュエンドポイントのためのルーターを追加
};
