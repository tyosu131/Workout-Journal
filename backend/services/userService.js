const supabase = require("../utils/supabaseClient");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/authUtils");
const { validateEmail } = require("../utils/validationUtils");

async function getSession(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;

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
}

async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  try {
    const decoded = await verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
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
}

async function signUp(req, res) {
  const { username, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
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
      httpOnly: true, // クライアントスクリプトからアクセス不可
      sameSite: "Lax", // クロスサイトリクエストを許可する設定
      secure: false, // 開発環境では`false`
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });
    

    res.status(201).json({ token, user: user.user });
  } catch (error) {
    console.error("Failed to sign up user:", error.message);
    res.status(500).json({ error: "Failed to sign up user", details: error.message });
  }
}

async function getUser(req, res) {
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

    const userId = decoded.id;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    res.status(500).json({ error: "Failed to fetch user", details: error.message });
  }
}

async function updateUser(req, res) {
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

    if (email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        throw emailError;
      }
    }

    if (password && password !== "******") {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        throw passwordError;
      }
    }

    if (username) {
      const { error: usernameError } = await supabase
        .from("users")
        .update({ name: username })
        .eq("uuid", userId);

      if (usernameError) {
        throw usernameError;
      }
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error.message);
    res.status(500).json({ error: "Failed to update user", details: error.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateAccessToken(data.user);
    const refreshToken = generateRefreshToken(data.user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // クライアントスクリプトからアクセス不可
      sameSite: "Lax", // クロスサイトリクエストを許可する設定
      secure: false, // 開発環境では`false`
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
    });
    

    res.status(200).json({ token, user: data.user });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
}

module.exports = {
  getSession,
  refreshToken,
  signUp,
  getUser,
  updateUser,
  login,
};
