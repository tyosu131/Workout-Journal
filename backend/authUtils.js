const jwt = require("jsonwebtoken");
const supabase = require("./supabaseClient");

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// アクセストークン発行関数
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing in environment variables.");
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h" }
  );
  console.log("Generated Access Token: ", token);
  return token;
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, sub: user.id },
    process.env.JWT_SECRET, // 同じく新しいシークレットを使用
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" }
  );
  console.log("Generated Refresh Token: ", token); // トークンをログに出力
  return token;
};

// JWTのトークンを検証する関数
const verifyToken = async (token) => {
  try {
    console.log("Verifying token: ", token); // 検証するトークンをログに出力
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWTの検証
    return decoded;
  } catch (error) {
    // エラーメッセージを詳細に記録
    console.error("Token verification failed:", {
      message: error.message,
      name: error.name,
      token,
      jwtSecret: process.env.JWT_SECRET,
    });
    return null;
  }
};

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};
