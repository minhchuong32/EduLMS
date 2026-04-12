const express = require("express");
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/index.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
router.use(authenticate);
router.get("/", getAnnouncements);
router.post("/", authorize("admin", "teacher"), createAnnouncement);
router.put("/:id", authorize("admin"), updateAnnouncement);
router.delete("/:id", authorize("admin", "teacher"), deleteAnnouncement);
module.exports = router;
