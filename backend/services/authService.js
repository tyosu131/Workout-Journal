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

// validatorを使ってバリデーション
const validator = require("validator");

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

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "No valid user found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Session retrieval failed:", error.message);
    res.status(500).json({ error: "Session retrieval failed" });
  }
};

const handleRefresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  try {
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    const newAccessToken = generateAccessToken(decoded);
    res.status(200).json({ access_token: newAccessToken });
  } catch (error) {
    console.error("Failed to refresh token:", error.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};

/**
 * サインアップ
 * - username, email, password の必須チェック
 * - username の長さ/メール形式/パスワード長等を validatorでチェック
 */
const handleSignUp = async (req, res) => {
  const { username, email, password } = req.body;

  // 必須項目の存在確認
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  // usernameの長さチェック(例: 3文字以上)
  if (username.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters long" });
  }

  // メール形式チェック
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // パスワード長さチェック(例: 6文字以上)
  if (!validator.isLength(password, { min: 6 })) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    console.log("signUpError:", signUpError);
    if (signUpError) throw signUpError;

    // usersテーブルにもユーザー情報を保存 (例: uuid, name, email)
    const { error: dbError } = await supabase
      .from("users")
      .insert([{ uuid: user.user.id, name: username, email }]);
    console.log("dbError:", dbError);

    if (dbError) throw dbError;

    // アクセストークン等を生成
    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

    // CookieにrefreshTokenをセット
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
    });

    res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Error detail:", error); 
    console.error("Failed to sign up user:", error.message);
    // res.status(500).json({ error: "Failed to sign up user" });
    res.status(500).json({ error: error.message });
  }
};

/**
 * ログイン
 * - email, password の必須チェック
 * - メール形式/パスワード最小文字数チェック
 */
const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  // 必須項目
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // メール形式チェック
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // パスワード長さチェック
  if (!validator.isLength(password, { min: 6 })) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Supabase: Eメール・パスワードでログイン
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // トークン生成
    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

    // CookieにrefreshTokenをセット
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ token, user: data.user });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * ユーザー情報の取得
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

    const { data: user, error } = await supabase
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * ユーザー情報の更新
 * - username, email, password いずれかの値が来た場合のみ検証・アップデート
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

    // username が送られた場合
    if (username !== undefined) {
      if (username.trim().length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be at least 3 characters long" });
      }
    }

    // email が送られた場合
    if (email !== undefined) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    // password が送られた場合 (既存の "******" は未変更扱いと想定)
    if (password !== undefined && password !== "******") {
      if (!validator.isLength(password, { min: 6 })) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }
    }

    // ========== Supabaseへの更新処理 ==========
    if (email) {
      await supabase.auth.updateUser({
        email,
        options: {
          emailRedirectTo: "http://localhost:3000/verify-email",
        },
      });
    }

    if (password && password !== "******") {
      await supabase.auth.updateUser({ password });
    }

    if (username) {
      await supabase
        .from("users")
        .update({ name: username })
        .eq("uuid", userId);
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.message);
    res.status(500).json({ error: "Failed to update user" });
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
