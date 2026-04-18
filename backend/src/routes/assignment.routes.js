const express = require("express");
const router = express.Router();
const {
  getAssignmentsByCourse,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
} = require("../controllers/assignment.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const {
  getAssignmentsByCourseValidation,
  assignmentIdValidation,
  createAssignmentValidation,
  updateAssignmentValidation,
  publishAssignmentValidation,
} = require("../validators/assignment.validators");

router.use(authenticate);
router.get(
  "/course/:courseId",
  getAssignmentsByCourseValidation,
  validateRequest,
  getAssignmentsByCourse,
);
router.get("/:id", assignmentIdValidation, validateRequest, getAssignment);
router.post(
  "/",
  authorize("teacher", "admin"),
  createAssignmentValidation,
  validateRequest,
  createAssignment,
);
router.put(
  "/:id",
  authorize("teacher", "admin"),
  updateAssignmentValidation,
  validateRequest,
  updateAssignment,
);
router.patch(
  "/:id/publish",
  authorize("teacher", "admin"),
  publishAssignmentValidation,
  validateRequest,
  publishAssignment,
);
router.delete(
  "/:id",
  authorize("teacher", "admin"),
  assignmentIdValidation,
  validateRequest,
  deleteAssignment,
);

module.exports = router;
