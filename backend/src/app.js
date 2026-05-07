const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
require("dotenv").config();
const { UPLOAD_DIR } = require("./config/uploads");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// ======================
//  SECURITY
// ======================
app.use(helmet());

// ======================
//  CORS (fix sạch hơn)
// ======================
const allowedOrigins = [
  process.env.FRONTEND_URLS,
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://192.168.1.9:3000",
]
  .filter(Boolean)
  .flatMap((v) => v.split(","))
  .map((v) => v.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(" Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ======================
//  RATE LIMIT (fix 429)
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

// CHỐNG SPAM NHANH (burst)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: isProduction ? 60 : 400, // local/dev tránh bị delay quá sớm
  delayMs: () => 500,
});

const authSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: isProduction ? 5 : 100,
  delayMs: () => 500,
});

// Áp dụng trước routes
app.use("/api/auth/login", authSpeedLimiter, authLimiter);
app.use("/api/", speedLimiter);
app.use("/api/", limiter);

// ======================
// BODY PARSER
// ======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ======================
// LOGGING
// ======================
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ======================
// STATIC
// ======================
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

// ======================
//  ROUTES
// ======================
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/classes", require("./routes/class.routes"));
app.use("/api/subjects", require("./routes/subject.routes"));
app.use("/api/courses", require("./routes/course.routes"));
app.use("/api/lessons", require("./routes/lesson.routes"));
app.use("/api/assignments", require("./routes/assignment.routes"));
app.use("/api/submissions", require("./routes/submission.routes"));
app.use("/api/announcements", require("./routes/announcement.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

// ======================
//  HEALTH CHECK
// ======================
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", pid: process.pid });
});

// ======================
//  ROOT
// ======================
app.get("/", (req, res) => {
  res.send("API working");
});

// ======================
// 404
// ======================
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ======================
// ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;

  console.error(" ERROR:", err.message);

  res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message,
  });
});

module.exports = app;
