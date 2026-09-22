const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.local"), override: true });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/noteRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { logFailure } = require("./utils/structuredLogger");

const app = express();

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "_retry"],
  credentials: true,
};
app.use(cors(corsOptions));

// Process-only: before body/cookie parsing and all auth/application handlers.
// Express serves HEAD through GET with the same status and no response body.
app.route("/health")
  .get((req, res) => res.set("Cache-Control", "no-store").status(200).json({ status: "ok" }))
  .all((req, res) => res.set("Allow", "GET, HEAD").status(405).json({ error: "Method Not Allowed" }));

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
  logFailure("server_handler", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;
