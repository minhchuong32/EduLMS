const path = require("path");

const UPLOAD_DIR = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "../../uploads");

module.exports = { UPLOAD_DIR };
