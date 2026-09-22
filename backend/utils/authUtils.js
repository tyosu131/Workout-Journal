const jwt = require("jsonwebtoken");

// Validate an email address format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Issue an access token
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRETが設定されていません。");
  }
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id, aud: "your-audience" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h" }
  );
};

// Issue a refresh token
const generateRefreshToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRETが設定されていません。");
  }
  return jwt.sign(
    { id: user.id, email: user.email, sub: user.id, aud: "your-audience" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" }
  );
};

// Verify a JWT token
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.aud !== "your-audience") {
      throw new Error("Audience mismatch");
    }
    return decoded;
  } catch (error) {
    // Expected token rejection is not a server failure; the HTTP caller owns 5xx logging.
    return null;
  }
};

// Refresh an access token using a refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.aud !== "your-audience") {
      throw new Error("Audience mismatch");
    }

    // Issue a new access token
    return generateAccessToken({ id: decoded.id, email: decoded.email });
  } catch (error) {
    // Expected token rejection is not a server failure; the HTTP caller owns 5xx logging.
    throw new Error("Invalid or expired refresh token");
  }
};

module.exports = {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  refreshAccessToken, // Newly exported
};
