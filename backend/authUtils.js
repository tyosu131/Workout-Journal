const jwt = require("jsonwebtoken");
const supabase = require("./supabaseClient");

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// アクセストークン発行関数
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h" } // 環境変数を利用
  );
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" } // 環境変数を利用
  );
};

// JWTのトークンを検証する関数
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWTの検証
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};
