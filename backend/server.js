require("dotenv").config();
console.log("Supabase URL (server):", process.env.SUPABASE_URL);
console.log(
  "Supabase Key (server):",
  process.env.SUPABASE_KEY ? "*****" : "Not found"
);
console.log("JWT Secret:", process.env.JWT_SECRET ? "*****" : "Not found");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const supabase = require("./supabaseClient");
const {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("./authUtils");

const server = express();

// CORS設定
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

server.use(cors(corsOptions));
server.use(express.json());
server.use(cookieParser());

// JWT_SECRETの確認
if (!process.env.JWT_SECRET) {
  console.error(
    "JWT_SECRET is not set. Please set it in your .env.local file."
  );
  process.exit(1);
}

// 環境変数のログ出力（デバッグ用）
console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("Supabase Key:", process.env.SUPABASE_KEY);
console.log("JWT Secret:", process.env.JWT_SECRET);

// エラーハンドリング用のミドルウェア
server.use((err, req, res, next) => {
  if (err instanceof Error) {
    console.error("Unhandled error occurred:", err.stack);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } else {
    console.error("Unhandled unknown error occurred:", err);
    res.status(500).json({
      error: "Internal server error",
      details: "Unknown error occurred",
    });
  }
});

// セッション取得API
server.get("/api/auth/session", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "No valid user found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Session retrieval failed:", error.message);
    res.status(500).json({ error: "Session retrieval failed" });
  }
});

// リフレッシュトークンのエンドポイント
server.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token from Cookies:", refreshToken);

  if (!refreshToken) {
    console.error("[POST /api/auth/refresh] Missing Refresh Token");
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  // 以下は既存コード
  try {
    const decoded = await verifyToken(refreshToken);
    if (!decoded) {
      console.warn("Invalid or expired refresh token.");
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
    });
    res.status(200).json({ access_token: newAccessToken });
  } catch (error) {
    console.error("Failed to refresh token:", error.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// ユーザー登録API
server.post("/api/signup", async (req, res) => {
  console.log("[POST /api/signup] Start");
  const { username, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    console.log("[POST /api/signup] Signing up user with Supabase");
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (signUpError) {
      console.error("[POST /api/signup] Sign up error:", signUpError.message);
      throw signUpError;
    }

    const { error: dbError } = await supabase
      .from("users")
      .insert([{ uuid: user.user.id, name: username, email }]);

    if (dbError) {
      console.error("[POST /api/signup] Database error:", dbError.message);
      throw dbError;
    }

    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 本番環境でのみtrue
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });
    console.log("[POST /api/login] Set-Cookie header sent:", refreshToken);

    console.log("[POST /api/signup] User created and tokens generated");
    res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Failed to sign up user:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to sign up user", details: error.message });
  }
});

async function handleTokenRefresh(refreshToken) {
  try {
    const decoded = await verifyToken(refreshToken);
    if (!decoded) {
      console.error("[handleTokenRefresh] Invalid refresh token");
      return null;
    }
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
    });
    return newAccessToken;
  } catch (error) {
    console.error("[handleTokenRefresh] Token refresh failed:", error.message);
    return null;
  }
}

// /api/get-user 内でリフレッシュ処理を呼び出す
server.get("/api/get-user", async (req, res) => {
  console.log("[GET /api/get-user] Start");
  const authHeader = req.headers.authorization;
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Authorization Token:", token);

  if (!token) {
    console.error("Missing Authorization Token");
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      console.warn("[GET /api/get-user] Token expired, attempting refresh...");
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token missing" });
      }

      const newToken = await handleTokenRefresh(refreshToken);
      if (!newToken) {
        return res.status(401).json({ error: "Token refresh failed" });
      }

      res.setHeader("Authorization", `Bearer ${newToken}`);
      return res.status(200).json({ token: newToken });
    }

    const userId = decoded.id;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("[GET /api/get-user] User not found:", error);
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("[GET /api/get-user] Failed to fetch user:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch user", details: error.message });
  }
});

// ユーザー情報更新API
server.put("/api/update-user", async (req, res) => {
  console.log("[PUT /api/update-user] Start");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.error("Authorization token is missing");
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      console.error("Invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }

    const { username, email, password } = req.body;
    const userId = decoded.id;

    if (email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        console.error("Failed to update email:", emailError.message);
        throw emailError;
      }
    }

    if (password && password !== "******") {
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });
      if (passwordError) {
        console.error("Failed to update password:", passwordError.message);
        throw passwordError;
      }
    }

    if (username) {
      const { error: usernameError } = await supabase
        .from("users")
        .update({ name: username })
        .eq("uuid", userId);

      if (usernameError) {
        console.error("Failed to update username:", usernameError.message);
        throw usernameError;
      }
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.message);
    res
      .status(500)
      .json({ error: "Failed to update user", details: error.message });
  }
});

// ログインAPI
server.post("/api/login", async (req, res) => {
  console.log("[POST /api/login] Start - Received login request");
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error("[POST /api/login] Login failed:", error.message);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // 常に secure を有効化
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });
    

    console.log("[POST /api/login] Login successful");
    res.status(200).json({ token, user: data.user });
  } catch (error) {
    console.error("[POST /api/login] Unexpected error:", error.message);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// ノート保存API
server.get("/api/notes/:date", async (req, res) => {
  console.log("[GET /api/notes/:date] Start");
  const { date } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const user = await verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .eq("userid", user.id);

    if (error) {
      console.error("[GET /api/notes/:date] Database error:", error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn(`[GET /api/notes/:date] No data found for date: ${date}`);
      return res
        .status(404)
        .json({ error: "No notes found for the given date" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Failed to fetch notes:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to fetch notes", details: error.message });
  }
});

// サーバー起動
const port = process.env.PORT || 3001;
server.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://localhost:${port}`);
});
