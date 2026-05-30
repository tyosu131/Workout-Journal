const supabase = require("../utils/supabaseClient"); // Supabaseクライアントのインポート

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("Authorization header provided:", false);
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Authorization token provided:", Boolean(token));
  console.log("JWT_SECRET configured:", Boolean(process.env.JWT_SECRET));

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  
  console.log("Authenticated user:", user ? { id: user.id } : null);
  req.user = user;
  next();
};

module.exports = authenticate;
