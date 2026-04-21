const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const { generateAiValidation } = require("../validators/ai.validators");
const { generate } = require("../controllers/ai.controller");

router.use(authenticate);
router.post("/generate", generateAiValidation, validateRequest, generate);

module.exports = router;
