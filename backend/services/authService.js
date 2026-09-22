/**
 * - Input validation using the validator library
 * - Existing Supabase integration logic
 */

const { getAdminDbClient } = require("../utils/supabaseAdminClient");
const { createAuthClient } = require("../utils/supabaseAuthClient");
const {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/authUtils");
const validator = require("validator");
const {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../utils/refreshCookie");
const { logFailure } = require("../utils/structuredLogger");

/**
 * Get session
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
      logFailure("auth_session", error);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      return res.status(404).json({ error: "No valid user found" });
    }
    return res.status(200).json({ user: dbUser });
  } catch (error) {
    logFailure("auth_session", error);
    return res.status(500).json({ error: "Session retrieval failed" });
  }
};

/**
 * Reissue an access token with a refresh token
 */
const handleRefresh = async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
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
    logFailure("auth_refresh", error);
    return res.status(500).json({ error: "Failed to refresh token" });
  }
};

/**
 * Sign up
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
      logFailure("auth_signup", { name: "Error", status: 500 });
      return res.status(500).json({ error: "Sign-up did not return a user" });
    }

    if (!signUpData.session) {
      return res.status(201).json({ user: createdUser, verificationRequired: true });
    }

    const { error: dbError } = await getAdminDbClient()
      .from("users")
      .upsert([{ uuid: createdUser.id, name: username, email }], { onConflict: "uuid" });
    if (dbError) {
      throw dbError;
    }

    const token = generateAccessToken(createdUser);
    const refreshToken = generateRefreshToken(createdUser);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({ token, user: createdUser, verificationRequired: false });
  } catch (error) {
    logFailure("auth_signup", error);
    return res.status(500).json({ error: "Failed to sign up user" });
  }
};

/**
 * Log in
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
      logFailure("auth_login", profileLookupError);
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
        logFailure("auth_login", profileCreateError);
        return res.status(500).json({ error: "Login failed" });
      }
    }

    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({ token, user: data.user });
  } catch (error) {
    logFailure("auth_login", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Get user information
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

    const { data: dbUser, error } = await getAdminDbClient()
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    if (error) {
      logFailure("auth_get_user", error);
      return res.status(500).json({ error: "Database error" });
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(dbUser);
  } catch (error) {
    logFailure("auth_get_user", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * Update user information
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
      logFailure("auth_update_user", userError);
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
      logFailure("auth_update_user", profileError);
      return res.status(500).json({ error: "Failed to update user" });
    }

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    logFailure("auth_update_user", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

/**
 * Password reset (Forgot Password)
 */
const handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const passwordResetRedirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL;
    if (!passwordResetRedirectUrl) {
      logFailure("auth_forgot_password", { name: "Error", status: 500 });
      return res.status(500).json({ error: "Password reset is not configured" });
    }

    const authClient = createAuthClient();
    const { error } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl,
    });

    if (error) {
      logFailure("auth_forgot_password", error);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    logFailure("auth_forgot_password", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const handleLogout = (req, res) => {
  clearRefreshCookie(res);
  return res.status(200).json({ message: "Logged out" });
};

module.exports = {
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
  handleLogout,
};
