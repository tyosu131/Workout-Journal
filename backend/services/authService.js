/**
 * - validator ライブラリを使った入力値チェック
 * - エラーメッセージの明確化
 * - 既存 Supabase 連携ロジック
 */

const supabase = require("../utils/supabaseClient");
const {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/authUtils");
const validator = require("validator");

/**
 * セッション取得 (REST)
 * フロントの /api/auth/session から GET される。
 * トークンの有効性をチェックし、ユーザ情報を返す。
 */
const handleSession = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // DB: "public.users" からユーザーを取得
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    if (error) {
      console.error("Failed to fetch user from DB:", error);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      return res.status(404).json({ error: "No valid user found" });
    }

    return res.status(200).json({ user: dbUser });
  } catch (error) {
    console.error("Session retrieval failed:", error.message);
    return res.status(500).json({ error: "Session retrieval failed" });
  }
};

/**
 * リフレッシュトークンでアクセストークン再発行
 */
const handleRefresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  try {
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const newAccessToken = generateAccessToken(decoded);
    return res.status(200).json({ access_token: newAccessToken });
  } catch (error) {
    console.error("Failed to refresh token:", error.message);
    return res.status(500).json({ error: "Failed to refresh token" });
  }
};

/**
 * サインアップ
 * フロント: /api/auth/signup
 */
const handleSignUp = async (req, res) => {
  const { username, email, password } = req.body;

  // 1つずつバリデーション
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  // メール形式とパスワード長
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (!validator.isLength(password, { min: 6 })) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Supabase Auth でユーザー作成
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpError) throw signUpError;

    // DB (public.users) へ insert/upsert
    const { error: dbError } = await supabase
      .from("users")
      .upsert([{ uuid: user.user.id, name: username, email }], { onConflict: "uuid" });
    if (dbError) throw dbError;

    // トークン発行
    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

    // Cookie に refreshToken
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Failed to sign up user:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * ログイン
 * フロント: /api/auth/login
 */
const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  // 必須チェック (分割)
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (!validator.isLength(password, { min: 6 })) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Supabase Auth ログイン
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // トークン
    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

    // Cookie に refreshToken
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ token, user: data.user });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Login failed" });
  }
};

/**
 * ユーザー情報の取得
 * フロント: /api/auth/get-user
 */
const handleGetUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // DBからユーザーを取得
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    if (error) {
      console.error("Failed to fetch user from DB:", error);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(dbUser);
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * ユーザー情報の更新
 * - username, email, password
 */
const handleUpdateUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { username, email, password } = req.body;
    const userId = decoded.id;

    // username
    // !username で空文字や null を弾く
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // email
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // password が "******" の場合は変更しない
    if (password !== undefined && password !== "******") {
      if (!validator.isLength(password, { min: 6 })) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
    }

    // ========== Supabase への更新処理 ==========
    // Auth のメール変更
    if (email) {
      await supabase.auth.updateUser({
        email,
        options: {
          emailRedirectTo: "http://localhost:3000/verify-email",
        },
      });
    }

    // パスワード更新
    if (password && password !== "******") {
      await supabase.auth.updateUser({ password });
    }

    // DB テーブルの username & email 更新
    await supabase
      .from("users")
      .update({ name: username, email })
      .eq("uuid", userId);

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.message);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

module.exports = {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
};
