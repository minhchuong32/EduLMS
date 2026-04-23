const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getNotificationById,
  markNotificationRead,
  markRead,
  deleteNotification,
} = require("../controllers/index.controller");
const { authenticate } = require("../middleware/auth.middleware");
router.use(authenticate);
router.get("/", getNotifications);
router.get("/:id", getNotificationById);
router.put("/:id/read", markNotificationRead);
router.put("/read-all", markRead);
router.delete("/:id", deleteNotification);
module.exports = router;
