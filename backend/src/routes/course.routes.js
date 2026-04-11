const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/index.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
router.use(authenticate);
router.get("/", getCourses);
router.post("/", authorize("admin"), createCourse);
router.get("/:id", getCourseById);
router.put("/:id", authorize("admin"), updateCourse);
router.delete("/:id", authorize("admin"), deleteCourse);
module.exports = router;
