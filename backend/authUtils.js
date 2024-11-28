const jwt = require("jsonwebtoken");

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// アクセストークン発行関数
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRETが設定されていません。");
  }
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id, aud: "your-audience" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h" }
  );
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRETが設定されていません。");
  }
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id, aud: "your-audience" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" }
  );
};

// JWTのトークンを検証する関数
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.aud !== "your-audience") {
      throw new Error("Audience mismatch");
    }
    return decoded;
  } catch (error) {
    console.error("トークンの検証に失敗しました:", error.message);
    return null;
  }
};

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};
