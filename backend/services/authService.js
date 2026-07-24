/**
 * - validator ライブラリを使った入力値チェック
 * - 既存 Supabase 連携ロジック
 */

const { getAdminDbClient } = require("../utils/supabaseAdminClient");
const { createAuthClient } = require("../utils/supabaseAuthClient");
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
    const { data: dbUser, error } = await getAdminDbClient()
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
    const decoded = await verifyToken(refreshToken);
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
    const authClient = createAuthClient();
    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpError) throw signUpError;

    const createdUser = signUpData.user;
    if (!createdUser) {
      return res.status(500).json({ error: "Sign-up did not return a user" });
    }

    if (!signUpData.session) {
      return res.status(201).json({ user: createdUser, verificationRequired: true });
    }

    const { error: dbError } = await getAdminDbClient()
      .from("users")
      .upsert([{ uuid: createdUser.id, name: username, email }], { onConflict: "uuid" });
    if (dbError) {
      console.error("Sign-up succeeded but profile creation failed:", dbError.message);
      throw dbError;
    }

    const token = generateAccessToken(createdUser);
    const refreshToken = generateRefreshToken(createdUser);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ token, user: createdUser, verificationRequired: false });
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
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const adminDbClient = getAdminDbClient();
    const { data: profile, error: profileLookupError } = await adminDbClient
      .from("users")
      .select("uuid")
      .eq("uuid", data.user.id)
      .maybeSingle();
    if (profileLookupError) {
      console.error("Failed to look up login profile:", profileLookupError.message);
      return res.status(500).json({ error: "Login failed" });
    }

    if (!profile) {
      const metadataUsername = data.user.user_metadata?.username;
      const name = typeof metadataUsername === "string" ? metadataUsername : "";
      const { error: profileCreateError } = await adminDbClient
        .from("users")
        .upsert(
          [{ uuid: data.user.id, name, email: data.user.email }],
          { onConflict: "uuid" }
        );
      if (profileCreateError) {
        console.error("Login succeeded but profile creation failed:", profileCreateError.message);
        return res.status(500).json({ error: "Login failed" });
      }
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

    const { data: dbUser, error } = await getAdminDbClient()
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

    const { data: dbUser, error: userError } = await getAdminDbClient()
      .from("users")
      .select("uuid, email")
      .eq("uuid", userId)
      .maybeSingle();
    if (userError) {
      console.error("Failed to fetch current user profile:", userError.message);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email !== dbUser.email) {
      return res.status(400).json({
        error: "Email changes require a dedicated confirmation flow",
      });
    }
    if (password !== undefined && password !== "******") {
      return res.status(400).json({
        error: "Password changes require a dedicated security flow",
      });
    }

    const { error: profileError } = await getAdminDbClient()
      .from("users")
      .update({ name: username })
      .eq("uuid", userId);
    if (profileError) {
      console.error("Failed to update user profile:", profileError.message);
      return res.status(500).json({ error: "Failed to update user" });
    }

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
    const passwordResetRedirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL;
    if (!passwordResetRedirectUrl) {
      console.error("PASSWORD_RESET_REDIRECT_URL is not configured");
      return res.status(500).json({ error: "Password reset is not configured" });
    }

    const authClient = createAuthClient();
    const { error } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl,
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

module.exports = {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
};
