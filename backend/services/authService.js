/**
 * - validator ライブラリを使った入力値チェック
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
 * セッション取得
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
 */
const handleSignUp = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
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
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpError) throw signUpError;

    const { error: dbError } = await supabase
      .from("users")
      .upsert([{ uuid: user.user.id, name: username, email }], { onConflict: "uuid" });
    if (dbError) throw dbError;

    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

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
 */
const handleLogin = async (req, res) => {
  const { email, password } = req.body;

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

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
 */
const handleGetUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  try {
    const decoded = await verifyToken(token);
    console.log("Decoded ID:", decoded.id);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: dbUser, error } = await supabase
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    console.log("Supabase query result:", dbUser, error);

    if (error) {
      console.error("Failed to fetch user from DB:", error);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      console.log("User not found. ID:", decoded.id);
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

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password !== undefined && password !== "******") {
      if (!validator.isLength(password, { min: 6 })) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
    }

    if (email) {
      await supabase.auth.updateUser({
        email,
        options: {
          emailRedirectTo: "http://54.188.218.191/verify-email",
        },
      });
    }
    if (password && password !== "******") {
      await supabase.auth.updateUser({ password });
    }

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

/**
 * パスワードリセット (Forgot Password)
 */
const handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://54.188.218.191/reset-password",
    });

    if (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Exception in forgot password:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * 新しいパスワードを設定
 */
const handleResetPassword = async (req, res) => {
  const { accessToken, newPassword } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: "Access token is missing" });
  }
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }
  if (!validator.isLength(newPassword, { min: 6 })) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: "",
    });
    if (sessionError) {
      console.error("Failed to set session with accessToken:", sessionError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      console.error("Failed to update password:", updateError);
      return res.status(500).json({ error: "Failed to update password" });
    }

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Exception in handleResetPassword:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
  handleResetPassword,
};
