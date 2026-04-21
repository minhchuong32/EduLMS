const { body, param, query } = require("express-validator");

const uuidParam = (key) =>
  param(key).isUUID().withMessage(`${key} must be a valid UUID`);

const createScheduleValidation = [
  uuidParam("classId"),
  body("courseEnrollmentId")
    .isUUID()
    .withMessage("courseEnrollmentId must be a valid UUID"),
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek must be between 0 and 6"),
  body("startTime").trim().notEmpty().withMessage("startTime is required"),
  body("endTime").trim().notEmpty().withMessage("endTime is required"),
  body("roomName")
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage("roomName must be at most 100 characters"),
  body("note")
    .optional({ nullable: true })
    .isLength({ max: 2000 })
    .withMessage("note must be at most 2000 characters"),
];

const updateScheduleValidation = [
  uuidParam("classId"),
  uuidParam("scheduleId"),
  body("courseEnrollmentId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("courseEnrollmentId must be a valid UUID"),
  body("dayOfWeek")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek must be between 0 and 6"),
  body("startTime")
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage("startTime is required"),
  body("endTime")
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage("endTime is required"),
  body("roomName")
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage("roomName must be at most 100 characters"),
  body("note")
    .optional({ nullable: true })
    .isLength({ max: 2000 })
    .withMessage("note must be at most 2000 characters"),
];

const attendanceSessionValidation = [
  uuidParam("classId"),
  query("scheduleSessionId")
    .optional()
    .isUUID()
    .withMessage("scheduleSessionId must be a valid UUID"),
  query("sessionDate")
    .optional()
    .isISO8601()
    .withMessage("sessionDate must be a valid date"),
];

const saveAttendanceValidation = [
  uuidParam("classId"),
  body("scheduleSessionId")
    .isUUID()
    .withMessage("scheduleSessionId must be a valid UUID"),
  body("sessionDate")
    .isISO8601()
    .withMessage("sessionDate must be a valid date"),
  body("note")
    .optional({ nullable: true })
    .isLength({ max: 2000 })
    .withMessage("note must be at most 2000 characters"),
  body("records")
    .optional({ nullable: true })
    .isArray()
    .withMessage("records must be an array"),
];

module.exports = {
  createScheduleValidation,
  updateScheduleValidation,
  attendanceSessionValidation,
  saveAttendanceValidation,
};
