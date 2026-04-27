const express = require("express");
const {
  getChatContacts,
  getConversation,
  sendMessage,
  markConversationRead,
  deleteAllHistory,
} = require("../controllers/chat.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { upload, setUploadType } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(authenticate, authorize("admin", "teacher"));

router.get("/contacts", getChatContacts);
router.get("/messages/:userId", getConversation);
router.post(
  "/messages",
  setUploadType("chat"),
  upload.single("file"),
  sendMessage,
);
router.put("/messages/:userId/read", markConversationRead);
router.delete("/history", authorize("admin"), deleteAllHistory);

module.exports = router;
