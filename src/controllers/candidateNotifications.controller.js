const { asyncHandler } = require('../middlewares/error.middleware');
const portalService = require('../services/candidatePortal.service');
const pool = require('../config/db');

const index = asyncHandler(async (req, res) => {
  const candidateIds = req.session.candidate.candidate_ids;
  const notifications = await portalService.getNotificationsForCandidate(candidateIds, 50);

  res.render('candidate/notifications/index', {
    layout: 'candidate/layouts/candidate-main',
    title: 'Notifications',
    notifications,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const candidateIds = req.session.candidate.candidate_ids;
  await pool.query(
    'UPDATE atlas_rec_notifications SET status = "read" WHERE id = ? AND candidate_id IN (?)',
    [id, candidateIds]
  );
  return res.redirect('/candidate/notifications');
});

module.exports = { index, markRead };
