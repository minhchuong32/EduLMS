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
const {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/schedule.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const {
  createScheduleValidation,
  updateScheduleValidation,
} = require("../validators/schedule.validators");

router.use(authenticate);
router.get("/", getClasses);
router.post("/", authorize("admin"), createClass);
router.get("/:id", getClassById);
router.put("/:id", authorize("admin"), updateClass);
router.delete("/:id", authorize("admin"), deleteClass);
router.post("/:id/students", authorize("admin", "teacher"), addStudentToClass);
router.delete(
  "/:id/students/:studentId",
  authorize("admin", "teacher"),
  removeStudentFromClass,
);
router.get("/:classId/schedules", listSchedules);
router.post(
  "/:classId/schedules",
  authorize("admin", "teacher"),
  createScheduleValidation,
  validateRequest,
  createSchedule,
);
router.put(
  "/:classId/schedules/:scheduleId",
  authorize("admin", "teacher"),
  updateScheduleValidation,
  validateRequest,
  updateSchedule,
);
router.delete(
  "/:classId/schedules/:scheduleId",
  authorize("admin", "teacher"),
  updateScheduleValidation,
  validateRequest,
  deleteSchedule,
);

module.exports = router;
