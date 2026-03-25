// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Schedule Validation Rules
// ---------------------------------------------------------------------------
const { body } = require('express-validator');

/**
 * Rules for creating a new interview schedule.
 */
const createRules = [
  body('scheduled_date')
    .trim()
    .notEmpty()
    .withMessage('Scheduled date is required.')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date (YYYY-MM-DD).')
    .custom((value) => {
      const scheduled = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduled < today) {
        throw new Error('Scheduled date cannot be in the past.');
      }
      return true;
    }),

  body('scheduled_time')
    .trim()
    .notEmpty()
    .withMessage('Scheduled time is required.')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Scheduled time must be in HH:MM (24-hour) format.'),

  body('mode')
    .trim()
    .notEmpty()
    .withMessage('Interview mode is required.')
    .isIn(['offline', 'online'])
    .withMessage('Mode must be either "offline" or "online".'),

  body('location')
    .if(body('mode').equals('offline'))
    .trim()
    .notEmpty()
    .withMessage('Location is required for offline interviews.')
    .isLength({ max: 500 })
    .withMessage('Location must not exceed 500 characters.'),

  body('meeting_link')
    .if(body('mode').equals('online'))
    .trim()
    .notEmpty()
    .withMessage('Meeting link is required for online interviews.')
    .isURL()
    .withMessage('Meeting link must be a valid URL.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters.'),
];

/**
 * Rules for rescheduling an existing interview.
 * Same as createRules plus a mandatory reason for the change.
 */
const rescheduleRules = [
  ...createRules,

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('A reason for rescheduling is required.')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters.'),
];

module.exports = {
  createRules,
  rescheduleRules,
};
