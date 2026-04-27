require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const app = require("./app");
const { getPool } = require("./config/database");
const { initChatSocket } = require("./socket/chat.socket");

const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const trustProxyRaw = process.env.TRUST_PROXY ?? (isProduction ? "1" : "0");

const trustProxy =
  trustProxyRaw === "true"
    ? true
    : trustProxyRaw === "false"
      ? false
      : Number.isNaN(Number(trustProxyRaw))
        ? trustProxyRaw
        : Number(trustProxyRaw);

app.set("trust proxy", trustProxy);

let httpServer;

const start = async () => {
  try {
    await getPool();

    httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      path: "/socket.io",
    });

    initChatSocket(io);

    httpServer.listen(PORT, HOST, () => {
      console.log(`LMS Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Trust proxy: ${String(app.get("trust proxy"))}`);
      console.log("Mode: single-process (cluster disabled)");
      console.log("Realtime: socket.io enabled");
    });

    httpServer.on("error", (err) => {
      console.error("Server runtime error:", err.message);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down...`);
  if (!httpServer) {
    process.exit(0);
    return;
  }

  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
