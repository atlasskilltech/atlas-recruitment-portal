const { asyncHandler } = require('../middlewares/error.middleware');
const pool = require('../config/db');

const show = asyncHandler(async (req, res) => {
  const candidateIds = req.session.candidate.candidate_ids;
  const primaryId = candidateIds[0];

  const [rows] = await pool.query(
    `SELECT dsr.*, job.applied_job_short_desc_new AS job_title, job.applied_location AS job_location
     FROM dice_staff_recruitment dsr
     LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
     WHERE dsr.id = ?`,
    [primaryId]
  );

  if (rows.length === 0) {
    req.flash('error', 'Profile not found.');
    return res.redirect('/candidate/dashboard');
  }

  res.render('candidate/profile/index', {
    layout: 'candidate/layouts/candidate-main',
    title: 'My Profile',
    profile: rows[0],
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

module.exports = { show };
