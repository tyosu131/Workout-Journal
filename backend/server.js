require("dotenv").config({ path: "../.env.local" });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

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

// サーバー起動
const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
