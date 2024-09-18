const supabase = require('./supabaseClient'); // Supabaseクライアントのインポート

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token received:", token); // デバッグ用ログ

  console.log("環境変数", process.env.JWT_SECRET);

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  
  console.log("ユーザー", user);
  req.user = user;
  next();
};

module.exports = authenticate;
