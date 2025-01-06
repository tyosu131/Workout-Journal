const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config({ path: "C:\\Users\\User\\Desktop\\web Development Projects\\portfolio real\\backend\\.env.local" });

// 環境変数の確認ログ
console.log("Environment Variables Check:");
console.log("PORT:", process.env.PORT);
console.log("ACCESS_TOKEN_EXPIRES:", process.env.ACCESS_TOKEN_EXPIRES);
console.log("REFRESH_TOKEN_EXPIRES:", process.env.REFRESH_TOKEN_EXPIRES);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);

// Supabase関連の初期化部分を一時的にコメントアウト
// const supabaseClient = require("./utils/supabaseClient");
// console.log("Supabase client initialized:", supabaseClient ? "Yes" : "No");

const server = express();

// CORS設定
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
server.use(cors(corsOptions));

// ミドルウェア
server.use(express.json());
server.use(cookieParser());

// APIルート
server.use("/api/auth", authRoutes);

// 404エラーハンドリング
server.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// エラーハンドリング
server.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// サーバー起動
const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
