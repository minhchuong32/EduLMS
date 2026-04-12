const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  getProfile,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
} = require("../controllers/index.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { upload, setUploadType } = require("../middleware/upload.middleware");

router.use(authenticate);
router.get("/", authorize("admin"), getUsers);
router.post("/", authorize("admin"), createUser);
router.get("/profile", getProfile);
router.put(
  "/profile",
  setUploadType("avatar"),
  upload.single("avatar"),
  updateProfile,
);
router.get("/:id", authorize("admin"), getUserById);
router.put(
  "/:id",
  authorize("admin"),
  setUploadType("avatar"),
  upload.single("avatar"),
  updateUser,
);
router.delete("/:id", authorize("admin"), deleteUser);

module.exports = router;
