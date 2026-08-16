const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.local"), override: true });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/noteRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
// Log all routes
app.use((req, res, next) => {
  console.log(`[ROUTE DEBUG] ${req.method} ${req.url}`);
  next();
});


// Log environment variable availability without exposing values
console.log("Environment Variables Check:");
console.log("PORT configured:", Boolean(process.env.PORT));
console.log("ACCESS_TOKEN_EXPIRES configured:", Boolean(process.env.ACCESS_TOKEN_EXPIRES));
console.log("REFRESH_TOKEN_EXPIRES configured:", Boolean(process.env.REFRESH_TOKEN_EXPIRES));
console.log("SUPABASE_URL configured:", Boolean(process.env.SUPABASE_URL));
console.log("SUPABASE_PUBLISHABLE_KEY configured:", Boolean(process.env.SUPABASE_PUBLISHABLE_KEY));
console.log("SUPABASE_SECRET_KEY configured:", Boolean(process.env.SUPABASE_SECRET_KEY));
console.log("PASSWORD_RESET_REDIRECT_URL configured:", Boolean(process.env.PASSWORD_RESET_REDIRECT_URL));
console.log("JWT_SECRET configured:", Boolean(process.env.JWT_SECRET));

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "_retry"],
  credentials: true,
};
console.log("CORS origin configured:", Boolean(corsOrigin));
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(cookieParser());
// API routes
app.use("/auth", authRoutes);

app.use("/notes", notesRoutes);

app.use("/analytics", analyticsRoutes);

// 404 error handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
