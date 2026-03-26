// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Job/Post Master Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
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
  req.flash('success', `Job opening "${applied_for_post}" created successfully.`);
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
  req.flash('success', `Job opening "${applied_for_post}" updated successfully.`);
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
const topMatches = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Get job details
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

  // Get top 20 candidates matched to this job, sorted by AI match score
  const [topCandidates] = await pool.query(`
    SELECT
      dsr.id, dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
      dsr.appln_high_qualification, dsr.appln_specialization,
      dsr.appln_total_experience, dsr.appln_current_designation,
      dsr.appln_current_organisation, dsr.appln_cv,
      ais.ai_match_score, ais.ai_status, ais.ai_recommendation_tag,
      ais.role_fit_summary, ais.extracted_skills,
      aint.total_score AS interview_score, aint.status AS interview_status
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
    LEFT JOIN atlas_rec_ai_interviews aint ON aint.candidate_id = dsr.id
      AND aint.id = (SELECT MAX(i.id) FROM atlas_rec_ai_interviews i WHERE i.candidate_id = dsr.id)
    WHERE ais.job_id = ?
      AND ais.ai_match_score > 0
    ORDER BY ais.ai_match_score DESC
    LIMIT 20
  `, [id]);

  // Get total applicants for this job
  const [[{ total_applicants }]] = await pool.query(
    'SELECT COUNT(*) AS total_applicants FROM dice_staff_recruitment WHERE appln_applied_for_sub = ?', [id]
  );

  // Score distribution
  const [scoreDist] = await pool.query(`
    SELECT
      SUM(CASE WHEN ais.ai_match_score >= 75 THEN 1 ELSE 0 END) AS strong,
      SUM(CASE WHEN ais.ai_match_score >= 50 AND ais.ai_match_score < 75 THEN 1 ELSE 0 END) AS moderate,
      SUM(CASE WHEN ais.ai_match_score >= 30 AND ais.ai_match_score < 50 THEN 1 ELSE 0 END) AS hold,
      SUM(CASE WHEN ais.ai_match_score < 30 THEN 1 ELSE 0 END) AS weak,
      COUNT(*) AS screened,
      ROUND(AVG(ais.ai_match_score), 1) AS avg_score
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    WHERE ais.job_id = ?
  `, [id]);

  const stats = scoreDist[0] || { strong: 0, moderate: 0, hold: 0, weak: 0, screened: 0, avg_score: 0 };

  res.render('jobs/top-matches', {
    title: `Top Matches - ${job.applied_for_post}`,
    job,
    topCandidates,
    stats: { ...stats, total_applicants },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

module.exports = { index, create, store, edit, update, toggleVisibility, topMatches };
