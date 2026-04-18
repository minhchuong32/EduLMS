const { body } = require("express-validator");

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Email is invalid"),
  body("password")
    .isString()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 1 })
    .withMessage("Password is required"),
];

const refreshValidation = [
  body("refreshToken")
    .isString()
    .withMessage("Refresh token is required")
    .bail()
    .notEmpty()
    .withMessage("Refresh token is required"),
];

const logoutValidation = [
  body("refreshToken")
    .optional({ nullable: true })
    .isString()
    .withMessage("Refresh token must be a string"),
];

const changePasswordValidation = [
  body("currentPassword")
    .isString()
    .withMessage("Current password is required")
    .bail()
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isString()
    .withMessage("New password is required")
    .bail()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .bail()
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage("New password must be different from current password"),
];

module.exports = {
  loginValidation,
  refreshValidation,
  logoutValidation,
  changePasswordValidation,
};
