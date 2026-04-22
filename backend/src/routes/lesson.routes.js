const express = require("express");
const router = express.Router();
const {
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  publishLesson,
  deleteLesson,
  addComment,
  updateComment,
  deleteComment,
} = require("../controllers/lesson.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { upload, setUploadType } = require("../middleware/upload.middleware");

router.use(authenticate);
router.get("/course/:courseId", getLessonsByCourse);
router.get("/:id", getLesson);
router.post(
  "/",
  authorize("teacher", "admin"),
  setUploadType("lesson"),
  upload.single("file"),
  createLesson,
);
router.put(
  "/:id",
  authorize("teacher", "admin"),
  setUploadType("lesson"),
  upload.single("file"),
  updateLesson,
);
router.patch("/:id/publish", authorize("teacher", "admin"), publishLesson);
router.delete("/:id", authorize("teacher", "admin"), deleteLesson);
router.post("/:id/comments", addComment);
router.put(
  "/:id/comments/:commentId",
  authorize("teacher", "admin"),
  updateComment,
);
router.delete(
  "/:id/comments/:commentId",
  authorize("teacher", "admin"),
  deleteComment,
);

module.exports = router;
