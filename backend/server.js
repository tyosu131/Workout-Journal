require("dotenv").config({ path: "./.env.local" });
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
  origin: "http://localhost:3000", // 配列としてオリジンを指定
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // 必要に応じて追加のヘッダー
  credentials: true,
  preflightContinue: false, // preflightリクエストが処理されることを防ぐ
  optionsSuccessStatus: 204, // 古いブラウザがOPTIONSリクエストで204を期待することを考慮
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

server.get("/api/auth/session", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    console.error("Authorization token is missing or null: ", authHeader);
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const user = await verifyToken(token);
    if (!user) {
      console.error("Invalid token: ", token);
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      return res
        .status(401)
        .json({ error: "No valid session found, please log in again." });
    }

    res.status(200).json({ session: sessionData.session });
  } catch (error) {
    console.error("Failed to get session:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to get session", details: error.message });
  }
});

// ユーザー登録API
server.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    const { error: dbError } = await supabase
      .from("users")
      .insert([{ uuid: user.user.id, name: username, email }]);

    if (dbError) {
      throw dbError;
    }

    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Failed to sign up user:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to sign up user", details: error.message });
  }
});

// ユーザー情報更新API
server.put("/api/update-user", async (req, res) => {
  const token = req.headers.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const user = await verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { username, email, password } = req.body;
    const userId = user.id;

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      return res
        .status(401)
        .json({ error: "No valid session found, please log in again." });
    }

    const session = sessionData.session;

    if (email) {
      const { error: emailError } = await supabase.auth.updateUser(
        {
          email,
        },
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (emailError) throw emailError;

      await supabase.from("users").update({ email }).eq("uuid", userId);
    }

    if (password && password !== "******") {
      const { error: passwordError } = await supabase.auth.updateUser(
        {
          password,
        },
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (passwordError) throw passwordError;

      await supabase.auth.signOut();
      return res.status(200).json({
        message: "Password updated successfully. Please log in again.",
      });
    }

    if (username) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name: username })
        .eq("uuid", userId);
      if (updateError) throw updateError;
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to update user", details: error.message });
  }
});

server.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { session, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      return res.status(400).json({ error: "Invalid login credentials" });
    }

    if (!session || !session.user) {
      return res.status(500).json({
        error: "Failed to retrieve session data. Please try again.",
      });
    }

    const token = generateAccessToken(session.user);
    const refreshToken = generateRefreshToken(session.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ token, user: session.user });
  } catch (error) {
    console.error("Login failed:", error.stack);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// ノート保存API
server.post("/api/notes/:date", async (req, res) => {
  const { date } = req.params;
  const { note, exercises } = req.body;
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const exercisesToSave = exercises.map((exercise) => ({
      exercise: exercise.exercise || "",
      sets: exercise.sets.map((set) => ({
        weight: set.weight || "",
        reps: set.reps || "",
        rest: set.rest || "",
      })),
    }));

    const { error } = await supabase.from("notes").upsert([
      {
        date,
        note,
        exercises: JSON.stringify(exercisesToSave),
        userid: user.id,
      },
    ]);

    if (error) throw error;

    res.status(200).json({ message: "Note saved successfully" });
  } catch (error) {
    console.error("Failed to save note:", error.stack);
    res
      .status(500)
      .json({ error: "Failed to save note", details: error.message });
  }
});

// サーバー起動
const port = process.env.PORT || 3001;
server.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://localhost:${port}`);
});
