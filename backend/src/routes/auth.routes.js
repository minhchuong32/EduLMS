// auth.routes.js
const express = require("express");
const router = express.Router();
const {
  login,
  refresh,
  logout,
  changePassword,
  getMe,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const {
  loginValidation,
  refreshValidation,
  logoutValidation,
  changePasswordValidation,
} = require("../validators/auth.validators");

router.post("/login", loginValidation, validateRequest, login);
router.post("/refresh", refreshValidation, validateRequest, refresh);
router.post("/logout", logoutValidation, validateRequest, logout);
router.get("/me", authenticate, getMe);
router.put(
  "/change-password",
  authenticate,
  changePasswordValidation,
  validateRequest,
  changePassword,
);

module.exports = router;
