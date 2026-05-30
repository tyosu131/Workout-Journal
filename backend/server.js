const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.local"), override: true });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/noteRoutes");

const app = express();
// 全ルートのログを出力
app.use((req, res, next) => {
  console.log(`[ROUTE DEBUG] ${req.method} ${req.url}`);
  next();
});


// 環境変数の確認ログ（値そのものは出力しない）
console.log("Environment Variables Check:");
console.log("PORT configured:", Boolean(process.env.PORT));
console.log("ACCESS_TOKEN_EXPIRES configured:", Boolean(process.env.ACCESS_TOKEN_EXPIRES));
console.log("REFRESH_TOKEN_EXPIRES configured:", Boolean(process.env.REFRESH_TOKEN_EXPIRES));
console.log("SUPABASE_URL configured:", Boolean(process.env.SUPABASE_URL));
console.log("SUPABASE_KEY configured:", Boolean(process.env.SUPABASE_KEY));
console.log("JWT_SECRET configured:", Boolean(process.env.JWT_SECRET));

// Supabase関連の初期化部分
const supabaseClient = require("./utils/supabaseClient");
console.log("Supabase client initialized:", supabaseClient ? "Yes" : "No");

// CORS設定
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "_retry"],
  credentials: true,
};
console.log("CORS origin configured:", Boolean(corsOrigin));
app.use(cors(corsOptions));

// ミドルウェア
app.use(express.json());
app.use(cookieParser());
// APIルート
app.use("/auth", authRoutes);

app.use("/notes", notesRoutes);

// 404エラーハンドリング
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// サーバー起動
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
