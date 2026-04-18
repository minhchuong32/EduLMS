const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  return res.status(422).json({
    error: "Validation failed",
    details,
  });
};

module.exports = { validateRequest };
