require("dotenv").config({ path: "C:\\Users\\User\\Desktop\\web Development Projects\\portfolio real\\backend\\.env.local" });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/noteRoutes");

const app = express(); // `server` を `app` に変更して重複を回避

// 環境変数の確認ログ
console.log("Environment Variables Check:");
console.log("PORT:", process.env.PORT);
console.log("ACCESS_TOKEN_EXPIRES:", process.env.ACCESS_TOKEN_EXPIRES);
console.log("REFRESH_TOKEN_EXPIRES:", process.env.REFRESH_TOKEN_EXPIRES);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);

// Supabase関連の初期化部分
const supabaseClient = require("./utils/supabaseClient");
console.log("Supabase client initialized:", supabaseClient ? "Yes" : "No");

// CORS設定
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "_retry"],
  credentials: true,
};
app.use(cors(corsOptions));

// ミドルウェア
app.use(express.json());
app.use(cookieParser());

// APIルート
app.use("/auth", authRoutes);

app.use("/api/notes", notesRoutes);

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
