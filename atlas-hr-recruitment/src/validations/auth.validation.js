// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Auth Validation Rules
// ---------------------------------------------------------------------------
const { body } = require('express-validator');

/**
 * Validation rules for the login form.
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.'),
];

module.exports = {
  loginRules,
};
