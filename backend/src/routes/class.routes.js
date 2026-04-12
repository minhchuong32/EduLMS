const express = require("express");
const router = express.Router();
const {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
} = require("../controllers/index.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);
router.get("/", getClasses);
router.post("/", authorize("admin"), createClass);
router.get("/:id", getClassById);
router.put("/:id", authorize("admin"), updateClass);
router.delete("/:id", authorize("admin"), deleteClass);
router.post("/:id/students", authorize("admin", "teacher"), addStudentToClass);
router.delete(
  "/:id/students/:studentId",
  authorize("admin"),
  removeStudentFromClass,
);

module.exports = router;
