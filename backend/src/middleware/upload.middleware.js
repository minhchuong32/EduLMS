const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Vercel filesystem is read-only except /tmp.
const UPLOAD_DIR = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "../../uploads");

// Ensure upload directories exist
["lessons", "assignments", "submissions", "avatars", "chat"].forEach((dir) => {
  const dirPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeMap = {
      lesson: "lessons",
      assignment: "assignments",
      submission: "submissions",
      avatar: "avatars",
      chat: "chat",
    };
    const folder = typeMap[req.uploadType] || "misc";
    const dest = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = getSafeExtension(file.mimetype);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIME_EXTENSIONS = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "application/zip": [".zip"],
  "application/x-rar-compressed": [".rar"],
};

const getSafeExtension = (mimeType) => {
  const exts = ALLOWED_MIME_EXTENSIONS[mimeType];
  return exts ? exts[0] : "";
};

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ALLOWED_MIME_EXTENSIONS[file.mimetype];
  const originalExtension = path.extname(file.originalname || "").toLowerCase();

  if (
    allowedExtensions &&
    originalExtension &&
    allowedExtensions.includes(originalExtension)
  ) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
});

const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

module.exports = { upload, setUploadType };
