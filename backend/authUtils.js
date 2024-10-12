const supabase = require("./supabaseClient");

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// アクセストークン発行関数
const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// トークンの検証関数（Supabaseを使用）
const verifyToken = async (token) => {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Supabase token verification failed:", error.message);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken, // verifyTokenをエクスポート
};
