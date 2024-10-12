require("dotenv").config({ path: "./.env.local" });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const supabase = require("./supabaseClient");
const { validateEmail, generateAccessToken, generateRefreshToken, verifyToken } = require('./authUtils');

const server = express();

// CORS設定
const corsOptions = {
  origin: "http://localhost:3000", // フロントエンドのオリジンを特定
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

server.use(cors(corsOptions));
server.use(express.json());
server.use(cookieParser());

// JWT_SECRETの確認
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Please set it in your .env.local file.");
  process.exit(1);
}

// エラーハンドリング用のミドルウェア
server.use((err, req, res, next) => {
  console.error("Unhandled error occurred:", err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ユーザー登録API
server.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("uuid")
      .eq("email", email)
      .single();

    if (checkError || existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{ name: username, email, password }])
      .select();

    if (error) throw error;

    const token = generateAccessToken(data[0]);
    const refreshToken = generateRefreshToken(data[0]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token });
  } catch (error) {
    console.error("Failed to create user:", error.stack);
    res.status(500).json({ error: "Failed to create user", details: error.message });
  }
});

// ユーザー情報更新API
server.put("/api/update-user", async (req, res) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { username, email, password } = req.body;
  const userId = user.id;

  try {
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("uuid", userId)
      .single();

    if (userError || !userRecord) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = { name: username };
    if (password && password !== "******") {
      updates.password = password;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("uuid", userId);

    if (updateError) throw updateError;

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.stack);
    res.status(500).json({ error: "Failed to update user", details: error.message });
  }
});

// ログインAPI
server.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { session, error } = await supabase.auth.signIn({
      email,
      password,
    });

    if (error || !session || !session.user) {
      return res.status(500).json({
        error: "Failed to login: " + (error?.message || "Unknown error"),
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

// トークンリフレッシュAPI
server.post("/api/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(403).json({ error: "Refresh token not provided" });
  }

  const user = await verifyToken(refreshToken);
  if (!user) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  const newToken = generateAccessToken(user);
  res.status(200).json({ token: newToken });
});

// ノート取得API
server.get("/api/notes/:date", async (req, res) => {
  const { date } = req.params;
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .eq("userid", user.id);

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error("Failed to fetch note:", error.stack);
    res.status(500).json({ error: "Failed to fetch note", details: error.message });
  }
});

// ノート保存API
server.post("/api/notes/:date", async (req, res) => {
  const { date } = req.params;
  const { note, exercises } = req.body;
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

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

    const { error } = await supabase
      .from("notes")
      .upsert([
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
    res.status(500).json({ error: "Failed to save note", details: error.message });
  }
});

// 日付の検証関数
const isValidDate = (date) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return re.test(date);
};

const port = process.env.PORT || 3001;
server.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://localhost:${port}`);
});
