// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Interview Validation Rules
// ---------------------------------------------------------------------------
const { body } = require('express-validator');

/**
 * Rules for sending an interview invitation to a candidate.
 */
const inviteRules = [
  body('interview_type')
    .trim()
    .notEmpty()
    .withMessage('Interview type is required.')
    .isIn(['hr', 'technical'])
    .withMessage('Interview type must be either "hr" or "technical".'),
];

/**
 * Rules for submitting an answer to an interview question.
 */
const answerRules = [
  body('answer_text')
    .trim()
    .notEmpty()
    .withMessage('Answer text is required.')
    .isLength({ max: 5000 })
    .withMessage('Answer must not exceed 5000 characters.'),
];

/**
 * Rules for final interview submission.
 * Validates that the candidate has confirmed they wish to submit.
 */
const submitRules = [
  body('confirm_submit')
    .exists()
    .withMessage('You must confirm submission.')
    .custom((value) => {
      if (value !== 'true' && value !== true && value !== '1' && value !== 1) {
        throw new Error('Please confirm that you want to submit the interview.');
      }
      return true;
    }),
];

module.exports = {
  inviteRules,
  answerRules,
  submitRules,
};
