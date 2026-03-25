// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Candidate Validation Rules
// ---------------------------------------------------------------------------
const { body, query } = require('express-validator');

/**
 * Rules for adding a note to a candidate profile.
 */
const addNoteRules = [
  body('note_text')
    .trim()
    .notEmpty()
    .withMessage('Note text is required.')
    .isLength({ max: 2000 })
    .withMessage('Note text must not exceed 2000 characters.'),

  body('note_type')
    .trim()
    .notEmpty()
    .withMessage('Note type is required.')
    .isIn(['general', 'interview', 'screening', 'reference', 'internal'])
    .withMessage('Note type must be one of: general, interview, screening, reference, internal.'),
];

/**
 * Rules for the candidate list / search filter query parameters.
 * All fields are optional – they only validate when present.
 */
const filterRules = [
  query('status')
    .optional()
    .trim()
    .isIn([
      'new', 'shortlisted', 'rejected', 'hold',
      'scheduled', 'selected', 'offer_released', 'hired',
    ])
    .withMessage('Invalid status filter.'),

  query('job_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Job ID must be a positive integer.'),

  query('recommendation')
    .optional()
    .trim()
    .isIn(['strong_fit', 'moderate_fit', 'weak_fit'])
    .withMessage('Invalid recommendation filter.'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must not exceed 200 characters.'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.'),
];

module.exports = {
  addNoteRules,
  filterRules,
};
