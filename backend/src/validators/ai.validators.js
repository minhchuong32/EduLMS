const { body } = require("express-validator");

const aiModes = ["summary", "questions", "rubric", "explain"];

const generateAiValidation = [
  body("mode")
    .isIn(aiModes)
    .withMessage("mode must be one of: summary, questions, rubric, explain"),
  body("title")
    .optional({ nullable: true })
    .isLength({ max: 300 })
    .withMessage("title must be at most 300 characters"),
  body("content")
    .optional({ nullable: true })
    .isLength({ max: 20000 })
    .withMessage("content must be at most 20000 characters"),
  body("subject")
    .optional({ nullable: true })
    .isLength({ max: 200 })
    .withMessage("subject must be at most 200 characters"),
  body("audience")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("audience must be at most 50 characters"),
  body("level")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("level must be at most 50 characters"),
  body("questionCount")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 20 })
    .withMessage("questionCount must be between 1 and 20"),
  body("assignmentType")
    .optional({ nullable: true })
    .isIn(["essay", "quiz", "file"])
    .withMessage("assignmentType must be one of: essay, quiz, file"),
];

module.exports = { generateAiValidation };
