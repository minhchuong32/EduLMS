require("dotenv").config();

const app = require("./app");
const { getPool } = require("./config/database");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await getPool(); // verify DB connectivity at boot in long-running mode
    app.listen(PORT, () => {
      console.log(`🚀 LMS Server running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

start();
