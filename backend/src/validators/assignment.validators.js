const { body, param } = require("express-validator");

const assignmentTypes = ["essay", "quiz", "file"];

const uuidParam = (key) =>
  param(key).isUUID().withMessage(`${key} must be a valid UUID`);

const optionalDate = (key) =>
  body(key)
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(`${key} must be a valid date`);

const getAssignmentsByCourseValidation = [uuidParam("courseId")];
const assignmentIdValidation = [uuidParam("id")];

const createAssignmentValidation = [
  body("courseEnrollmentId")
    .isUUID()
    .withMessage("courseEnrollmentId must be a valid UUID"),
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isLength({ max: 300 })
    .withMessage("Title must be less than 300 characters"),
  body("type")
    .isIn(assignmentTypes)
    .withMessage("Type must be one of: essay, quiz, file"),
  optionalDate("dueDate"),
  optionalDate("startDate"),
  body("timeLimitMinutes")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 720 })
    .withMessage("timeLimitMinutes must be between 1 and 720"),
  body("totalPoints")
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1000 })
    .withMessage("totalPoints must be between 0 and 1000"),
  body("maxAttempts")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("maxAttempts must be between 1 and 100"),
  body("shuffleQuestions")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("shuffleQuestions must be boolean"),
  body("showResultImmediately")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("showResultImmediately must be boolean"),
  body("questions")
    .optional({ nullable: true })
    .isArray()
    .withMessage("questions must be an array"),
];

const updateAssignmentValidation = [
  uuidParam("id"),
  body("title")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage("Title must be between 1 and 300 characters"),
  optionalDate("dueDate"),
  optionalDate("startDate"),
  body("timeLimitMinutes")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 720 })
    .withMessage("timeLimitMinutes must be between 1 and 720"),
  body("totalPoints")
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1000 })
    .withMessage("totalPoints must be between 0 and 1000"),
  body("maxAttempts")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("maxAttempts must be between 1 and 100"),
  body("shuffleQuestions")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("shuffleQuestions must be boolean"),
  body("showResultImmediately")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("showResultImmediately must be boolean"),
];

const publishAssignmentValidation = [
  uuidParam("id"),
  body("publish").isBoolean().withMessage("publish must be boolean"),
];

module.exports = {
  getAssignmentsByCourseValidation,
  assignmentIdValidation,
  createAssignmentValidation,
  updateAssignmentValidation,
  publishAssignmentValidation,
};
