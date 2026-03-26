// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Job/Post Master Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

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
  const { applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
    applied_location, applied_experience_min, applied_experience_max, applied_is_visible } = req.body;

  if (!applied_for_post || !applied_for_post_id) {
    req.flash('error', 'Post name and scope are required.');
    return res.redirect('/jobs/create');
  }

  await pool.query(`
    INSERT INTO isdi_admsn_applied_for
    (applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
     applied_location, applied_experience_min, applied_experience_max, applied_is_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    applied_for_post_id,
    applied_for_post,
    applied_job_short_desc_new || applied_for_post,
    applied_job_desc || '',
    applied_location || 'Mumbai',
    applied_experience_min || null,
    applied_experience_max || null,
    applied_is_visible ? 1 : 0,
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
  const { applied_for_post_id, applied_for_post, applied_job_short_desc_new, applied_job_desc,
    applied_location, applied_experience_min, applied_experience_max, applied_is_visible } = req.body;

  await pool.query(`
    UPDATE isdi_admsn_applied_for SET
      applied_for_post_id = ?, applied_for_post = ?, applied_job_short_desc_new = ?,
      applied_job_desc = ?, applied_location = ?,
      applied_experience_min = ?, applied_experience_max = ?, applied_is_visible = ?
    WHERE id = ?
  `, [
    applied_for_post_id,
    applied_for_post,
    applied_job_short_desc_new || applied_for_post,
    applied_job_desc || '',
    applied_location || '',
    applied_experience_min || null,
    applied_experience_max || null,
    applied_is_visible ? 1 : 0,
    id,
  ]);

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

module.exports = { index, create, store, edit, update, toggleVisibility };
