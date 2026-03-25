const { asyncHandler } = require('../middlewares/error.middleware');
const pool = require('../config/db');

const index = asyncHandler(async (req, res) => {
  const accountId = req.session.candidate.account_id;
  const [tickets] = await pool.query(
    'SELECT * FROM atlas_rec_candidate_support_tickets WHERE candidate_id = ? ORDER BY created_at DESC',
    [accountId]
  );

  res.render('candidate/help/index', {
    layout: 'candidate/layouts/candidate-main',
    title: 'Help & Support',
    tickets,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

const create = asyncHandler(async (req, res) => {
  const { category, subject, message, application_id } = req.body;
  const accountId = req.session.candidate.account_id;

  if (!subject || !message) {
    req.flash('error', 'Subject and message are required.');
    return res.redirect('/candidate/help');
  }

  await pool.query(
    'INSERT INTO atlas_rec_candidate_support_tickets (candidate_id, application_id, category, subject, message) VALUES (?, ?, ?, ?, ?)',
    [accountId, application_id || null, category || 'general', subject, message]
  );

  req.flash('success', 'Support ticket submitted successfully.');
  return res.redirect('/candidate/help');
});

module.exports = { index, create };
