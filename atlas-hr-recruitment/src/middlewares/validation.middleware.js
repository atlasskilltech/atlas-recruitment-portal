// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Validation Middleware
// ---------------------------------------------------------------------------
const { validationResult } = require('express-validator');

/**
 * Run an array of express-validator validation chains and, if any fail,
 * redirect back with the errors flashed into the session.
 *
 * Usage:
 *   router.post('/path', validate(myRules), controller.action);
 *
 * @param {import('express-validator').ValidationChain[]} validations
 * @returns {Function} Express middleware
 */
function validate(validations) {
  return async (req, res, next) => {
    // Run every validation chain in parallel
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Collect error messages keyed by field for easy template rendering
    const extractedErrors = {};
    errors.array().forEach((err) => {
      if (!extractedErrors[err.path]) {
        extractedErrors[err.path] = err.msg;
      }
    });

    // Flash errors and old input so the form can be re-populated
    req.flash('errors', extractedErrors);
    req.flash('oldInput', req.body);

    return res.redirect('back');
  };
}

module.exports = { validate };
