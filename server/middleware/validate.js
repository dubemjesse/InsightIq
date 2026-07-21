const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/** Runs after express-validator checks; turns failures into a 400 ApiError. */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new ApiError(
        400,
        'Validation failed.',
        errors.array().map((e) => ({ field: e.path, message: e.msg }))
      )
    );
  }
  next();
}

module.exports = validate;
