// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Job/Post Master Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const jobMatchingService = require('../services/jobMatching.service');
const logger = require('../utils/logger');

// File upload config for JD files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Store locally; in production, sync to erp/assets/career/
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function(req, file, cb) {
    const name = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('applied_job_desc_file');

/**
 * GET /jobs
 * List all job openings with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (req.query.scope) {
    conditions.push('j.applied_for_post_id = ?');
    params.push(req.query.scope);
  }
  if (req.query.search) {
    conditions.push('(j.applied_for_post LIKE ? OR j.applied_job_short_desc_new LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  if (req.query.location) {
    conditions.push('j.applied_location LIKE ?');
    params.push(`%${req.query.location}%`);
  }
  if (req.query.visible !== undefined && req.query.visible !== '') {
    conditions.push('j.applied_is_visible = ?');
    params.push(req.query.visible);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [jobs] = await pool.query(`
    SELECT j.*, s.applied_for_name AS scope_name
    FROM isdi_admsn_applied_for j
    LEFT JOIN career_applied_for s ON j.applied_for_post_id = s.id
    ${whereClause}
    ORDER BY j.applied_for_post_id, j.applied_for_post
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const [[{ total }]] = await pool.query(`
    SELECT COUNT(*) AS total FROM isdi_admsn_applied_for j ${whereClause}
  `, params);

  const totalPages = Math.ceil(total / limit);

  // Get scopes for filter dropdown
  let scopes = [];
  try {
    const [scopeRows] = await pool.query('SELECT id, applied_for_name FROM career_applied_for ORDER BY id');
    scopes = scopeRows;
  } catch (e) {
    // career_applied_for table might not exist — use hardcoded
    scopes = [{ id: 1, applied_for_name: 'Academics/Teaching' }, { id: 2, applied_for_name: 'Administration/Non-teaching' }];
  }

  res.render('jobs/index', {
    title: 'Job Openings Master',
    jobs,
    scopes,
    filters: req.query,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * GET /jobs/create
 * Show create form.
 */
const create = asyncHandler(async (req, res) => {
  let scopes = [];
  try {
    const [scopeRows] = await pool.query('SELECT id, applied_for_name FROM career_applied_for ORDER BY id');
    scopes = scopeRows;
  } catch (e) {
    scopes = [{ id: 1, applied_for_name: 'Academics/Teaching' }, { id: 2, applied_for_name: 'Administration/Non-teaching' }];
  }

  res.render('jobs/form', {
    title: 'Add New Job Opening',
    job: null,
    scopes,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /jobs
 * Save new job.
 */
const store = asyncHandler(async (req, res) => {
  // Handle file upload
  await new Promise((resolve, reject) => {
    upload(req, res, function(err) { if (err) reject(err); else resolve(); });
  });

  const { applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
    applied_location, applied_experience_min, applied_experience_max, applied_is_visible } = req.body;
  const uploadedFile = req.file ? req.file.filename : null;

  if (!applied_for_post || !applied_for_post_id) {
    req.flash('error', 'Post name and scope are required.');
    return res.redirect('/jobs/create');
  }

  await pool.query(`
    INSERT INTO isdi_admsn_applied_for
    (applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
     applied_location, applied_experience_min, applied_experience_max, applied_is_visible, applied_job_desc_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    applied_for_post_id,
    applied_for_post,
    applied_job_short_desc_new || applied_for_post,
    applied_job_desc || '',
    applied_location || 'Mumbai',
    applied_experience_min || null,
    applied_experience_max || null,
    applied_is_visible ? 1 : 0,
    uploadedFile,
  ]);

  logger.info(`[JOBS] New job created: ${applied_for_post}`);

  // Auto-scan candidates in background
  const [newJob] = await pool.query('SELECT id FROM isdi_admsn_applied_for WHERE applied_for_post = ? ORDER BY id DESC LIMIT 1', [applied_for_post]);
  if (newJob[0]) {
    setTimeout(() => {
      jobMatchingService.scanCandidatesForJob(newJob[0].id, { limit: 5000 })
        .catch(err => logger.error(`[JOBS] Background scan failed: ${err.message}`));
    }, 2000);
  }

  req.flash('success', `Job opening "${applied_for_post}" created. Candidate scanning started in background.`);
  return res.redirect('/jobs');
});

/**
 * GET /jobs/:id/edit
 * Show edit form.
 */
const edit = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [[job]] = await pool.query('SELECT * FROM isdi_admsn_applied_for WHERE id = ?', [id]);

  if (!job) {
    req.flash('error', 'Job not found.');
    return res.redirect('/jobs');
  }

  let scopes = [];
  try {
    const [scopeRows] = await pool.query('SELECT id, applied_for_name FROM career_applied_for ORDER BY id');
    scopes = scopeRows;
  } catch (e) {
    scopes = [{ id: 1, applied_for_name: 'Academics/Teaching' }, { id: 2, applied_for_name: 'Administration/Non-teaching' }];
  }

  res.render('jobs/form', {
    title: `Edit Job - ${job.applied_for_post}`,
    job,
    scopes,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /jobs/:id
 * Update job.
 */
const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Handle file upload
  await new Promise((resolve, reject) => {
    upload(req, res, function(err) { if (err) reject(err); else resolve(); });
  });

  const { applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
    applied_location, applied_experience_min, applied_experience_max, applied_is_visible } = req.body;
  const uploadedFile = req.file ? req.file.filename : null;

  let sql, params;
  if (uploadedFile) {
    sql = `UPDATE isdi_admsn_applied_for SET
      applied_for_post_id = ?, applied_for_post = ?, applied_job_short_desc_new = ?,
      applied_job_desc = ?, applied_location = ?,
      applied_experience_min = ?, applied_experience_max = ?, applied_is_visible = ?,
      applied_job_desc_file = ?
    WHERE id = ?`;
    params = [applied_for_post_id, applied_for_post, applied_job_short_desc_new || applied_for_post,
      applied_job_desc || '', applied_location || '', applied_experience_min || null,
      applied_experience_max || null, applied_is_visible ? 1 : 0, uploadedFile, id];
  } else {
    sql = `UPDATE isdi_admsn_applied_for SET
      applied_for_post_id = ?, applied_for_post = ?, applied_job_short_desc_new = ?,
      applied_job_desc = ?, applied_location = ?,
      applied_experience_min = ?, applied_experience_max = ?, applied_is_visible = ?
    WHERE id = ?`;
    params = [applied_for_post_id, applied_for_post, applied_job_short_desc_new || applied_for_post,
      applied_job_desc || '', applied_location || '', applied_experience_min || null,
      applied_experience_max || null, applied_is_visible ? 1 : 0, id];
  }

  await pool.query(sql, params);

  logger.info(`[JOBS] Job updated: id=${id}, ${applied_for_post}`);

  // Re-scan candidates in background after JD update
  setTimeout(() => {
    jobMatchingService.scanCandidatesForJob(id, { limit: 200, forceRefresh: true })
      .catch(err => logger.error(`[JOBS] Background re-scan failed: ${err.message}`));
  }, 2000);

  req.flash('success', `Job opening "${applied_for_post}" updated. Re-scanning candidates in background.`);
  return res.redirect('/jobs');
});

/**
 * POST /jobs/:id/toggle-visibility
 * Toggle job visibility.
 */
const toggleVisibility = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await pool.query('UPDATE isdi_admsn_applied_for SET applied_is_visible = NOT applied_is_visible WHERE id = ?', [id]);
  req.flash('success', 'Job visibility toggled.');
  return res.redirect('/jobs');
});

/**
 * GET /jobs/:id/top-matches
 * Show top 20 matching candidates for a specific job role based on AI match scores.
 */
/**
 * GET /jobs/:id/top-matches
 * Show top 20 matching candidates for a specific job role.
 */
const topMatches = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [[job]] = await pool.query(`
    SELECT j.*, s.applied_for_name AS scope_name
    FROM isdi_admsn_applied_for j
    LEFT JOIN career_applied_for s ON j.applied_for_post_id = s.id
    WHERE j.id = ?
  `, [id]);

  if (!job) {
    req.flash('error', 'Job not found.');
    return res.redirect('/jobs');
  }

  // Get top candidates from matches table
  const topCandidates = await jobMatchingService.getTopMatches(id, 20);
  const stats = await jobMatchingService.getMatchStats(id);

  // Total applicants who applied for this specific job
  const [[{ total_applicants }]] = await pool.query(
    'SELECT COUNT(*) AS total_applicants FROM dice_staff_recruitment WHERE appln_applied_for_sub = ?', [id]
  );

  res.render('jobs/top-matches', {
    title: `Top Matches - ${job.applied_for_post}`,
    job,
    topCandidates,
    stats: { ...stats, total_applicants },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /jobs/:id/refresh-matches
 * Re-scan all candidates against this job's JD.
 */
const refreshMatches = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const result = await jobMatchingService.scanCandidatesForJob(id, {
      limit: 5000,
      forceRefresh: true,
    });

    req.flash('success', `Scan complete: ${result.scanned} candidates scanned, ${result.matched} matched.`);
  } catch (err) {
    logger.error(`[JOBS] Refresh scan failed for job ${id}: ${err.message}`);
    req.flash('error', `Scan failed: ${err.message}`);
  }

  return res.redirect(`/jobs/${id}/top-matches`);
});

/**
 * POST /jobs/:id/bulk-invite
 * Send interview invitations to selected candidates.
 */
const bulkInvite = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const { candidate_ids } = req.body;

  if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    req.flash('error', 'Please select at least one candidate.');
    return res.redirect(`/jobs/${jobId}/top-matches`);
  }

  const ids = candidate_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  let successCount = 0;
  let errorCount = 0;

  const interviewService = require('../services/interview.service');
  const notificationService = require('../services/notification.service');
  const appUrl = process.env.APP_URL || 'https://recruitment.atlasskilltech.app';

  for (const candidateId of ids) {
    try {
      // Check if already has active interview
      const interviewRepository = require('../repositories/interview.repository');
      const existing = await interviewRepository.findByCandidateId(candidateId);
      const active = existing.find(iv => {
        const s = iv.interview_status || iv.status;
        return ['in_progress', 'evaluated', 'passed', 'submitted'].includes(s);
      });

      if (active) {
        logger.info(`[BULK_INVITE] Candidate ${candidateId} already has active interview, skipping`);
        continue;
      }

      // Delete old invited interviews
      for (const old of existing) {
        const s = old.interview_status || old.status;
        if (['invited', 'expired', 'pending', 'failed'].includes(s)) {
          await pool.query('DELETE FROM atlas_rec_ai_interview_answers WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interview_questions WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interviews WHERE id = ?', [old.id]);
        }
      }

      // Create interview
      const result = await interviewService.createInterview(candidateId, null, 'hr');
      const link = `${appUrl}/ai/interview/${result.token}`;

      // Send email
      try {
        const [[cand]] = await pool.query('SELECT appln_full_name FROM dice_staff_recruitment WHERE id = ?', [candidateId]);
        const templateData = notificationService.getTemplateMessage('ai_interview_invite', {
          candidateName: cand?.appln_full_name || 'Candidate',
          jobTitle: 'Position',
          interviewLink: link,
          expiresIn: '10 days',
        });
        if (templateData) {
          await notificationService.sendNotification({
            candidate_id: candidateId, type: 'interview_invite',
            title: templateData.subject, message: templateData.message, channel: 'email',
          });
        }
      } catch (emailErr) {
        logger.warn(`[BULK_INVITE] Email failed for ${candidateId}: ${emailErr.message}`);
      }

      successCount++;
    } catch (err) {
      logger.error(`[BULK_INVITE] Failed for candidate ${candidateId}: ${err.message}`);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    req.flash('error', `Sent ${successCount} interviews, ${errorCount} failed.`);
  } else {
    req.flash('success', `Interview invitations sent to ${successCount} candidate(s). Email sent to admin.`);
  }

  return res.redirect(`/jobs/${jobId}/top-matches`);
});

module.exports = { index, create, store, edit, update, toggleVisibility, topMatches, refreshMatches, bulkInvite };
