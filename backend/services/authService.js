const supabase = require("../utils/supabaseClient");
const { verifyToken, generateAccessToken, generateRefreshToken } = require("../utils/authUtils");

const handleSession = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    const decoded = await verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "No valid user found" });

    res.status(200).json({ user });
  } catch (error) {
    console.error("Session retrieval failed:", error.message);
    res.status(500).json({ error: "Session retrieval failed" });
  }
};

const handleRefresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token is missing" });

  try {
    const decoded = verifyToken(refreshToken);
    if (!decoded) return res.status(401).json({ error: "Invalid or expired refresh token" });

    const newAccessToken = generateAccessToken(decoded);
    res.status(200).json({ access_token: newAccessToken });
  } catch (error) {
    console.error("Failed to refresh token:", error.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};

const handleSignUp = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required" });
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
      .insert([{ uuid: user.user.id, name: username, email }]);

    if (dbError) throw dbError;

    const token = generateAccessToken(user.user);
    const refreshToken = generateRefreshToken(user.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Failed to sign up user:", error.message);
    res.status(500).json({ error: "Failed to sign up user" });
  }
};

const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) return res.status(401).json({ error: "Invalid email or password" });

    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

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

const handleGetUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    const decoded = await verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    const { data: user, error } = await supabase
      .from("users")
      .select("uuid, name, email")
      .eq("uuid", decoded.id)
      .single();

    if (error || !user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

const handleUpdateUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    const decoded = await verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    const { username, email, password } = req.body;
    const userId = decoded.id;

    if (email) await supabase.auth.updateUser({ email });
    if (password && password !== "******") await supabase.auth.updateUser({ password });
    if (username) {
      await supabase.from("users").update({ name: username }).eq("uuid", userId);
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
