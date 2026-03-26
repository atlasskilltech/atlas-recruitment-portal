// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – AI Screening Controller
// ---------------------------------------------------------------------------
const screeningService = require('../services/screening.service');
const candidateService = require('../services/candidate.service');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION, AI_STATUSES_LIST } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /ai-screening
 * List all AI screening results with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [];
  const params = [];

  if (req.query.screening_status || req.query.status) {
    conditions.push('ais.ai_status = ?');
    params.push(req.query.screening_status || req.query.status);
  }

  if (req.query.score_min || req.query.minScore) {
    conditions.push('ais.ai_match_score >= ?');
    params.push(parseFloat(req.query.score_min || req.query.minScore));
  }

  if (req.query.score_max) {
    conditions.push('ais.ai_match_score <= ?');
    params.push(parseFloat(req.query.score_max));
  }

  if (req.query.candidate_name) {
    conditions.push('dsr.appln_full_name LIKE ?');
    params.push(`%${req.query.candidate_name}%`);
  }

  if (req.query.job_id || req.query.jobId) {
    conditions.push('ais.job_id = ?');
    params.push(req.query.job_id || req.query.jobId);
  }

  if (req.query.date_from || req.query.fromDate) {
    conditions.push('ais.processed_at >= ?');
    params.push(req.query.date_from || req.query.fromDate);
  }

  if (req.query.date_to) {
    conditions.push('ais.processed_at <= ?');
    params.push(req.query.date_to);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  // Fetch screening records (latest per candidate)
  const [screenings] = await pool.query(`
    SELECT ais.*,
      dsr.appln_full_name AS candidate_name, dsr.appln_email AS candidate_email,
      dsr.appln_mobile_no AS candidate_mobile,
      job.applied_job_short_desc_new AS job_title, job.applied_location AS job_location
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
    LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
    ${whereClause}
    ORDER BY ais.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  // Count total
  const [countResult] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
    LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
    ${whereClause}
  `, params);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  // Fetch job list for filter dropdown
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  // Compute summary stats for the cards
  const [statsRows] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN ais.ai_status = 'eligible' THEN 1 ELSE 0 END) AS eligible,
      SUM(CASE WHEN ais.ai_status = 'hold' THEN 1 ELSE 0 END) AS hold,
      SUM(CASE WHEN ais.ai_status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
  `);
  const screeningStats = statsRows[0] || { total: 0, eligible: 0, hold: 0, rejected: 0 };

  res.render('ai-screening/index', {
    title: 'AI Screening Results',
    screenings,
    stats: screeningStats,
    jobs,
    filters: req.query,
    aiStatuses: AI_STATUSES_LIST,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * GET /ai-screening/:id
 * Show screening detail for a specific record.
 */
const show = asyncHandler(async (req, res) => {
  const screeningId = parseInt(req.params.id, 10);
  if (!screeningId) {
    req.flash('error', 'Invalid screening ID.');
    return res.redirect('/ai-screening');
  }

  const [rows] = await pool.query(`
    SELECT ais.*,
      dsr.appln_full_name AS candidate_name, dsr.appln_email AS candidate_email,
      dsr.appln_mobile_no AS candidate_mobile, dsr.appln_total_experience,
      dsr.appln_high_qualification, dsr.appln_current_organisation,
      dsr.appln_current_designation,
      job.applied_job_short_desc_new AS job_title, job.applied_job_desc AS job_description,
      job.applied_location AS job_location
    FROM atlas_rec_candidate_ai_screening ais
    LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
    LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
    WHERE ais.id = ?
  `, [screeningId]);

  if (rows.length === 0) {
    req.flash('error', 'Screening record not found.');
    return res.redirect('/ai-screening');
  }

  const screening = rows[0];

  // Parse JSON analysis fields safely
  const parseJson = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return val; }
  };

  screening.skills_analysis_parsed = parseJson(screening.skill_gap_analysis);
  screening.experience_analysis_parsed = parseJson(screening.extracted_experience_summary);
  screening.education_analysis_parsed = parseJson(screening.extracted_education_summary);

  // Map field names for template compatibility
  screening.match_score = screening.ai_match_score;
  screening.screening_status = screening.ai_status;
  screening.recommendation = screening.ai_recommendation_tag;

  // Fetch all screening history for this candidate
  const [history] = await pool.query(`
    SELECT id, ai_match_score AS match_score, ai_status AS screening_status,
           ai_recommendation_tag AS recommendation, processed_at AS screening_date, created_at
    FROM atlas_rec_candidate_ai_screening
    WHERE candidate_id = ?
    ORDER BY created_at DESC
  `, [screening.candidate_id]);

  res.render('ai-screening/detail', {
    title: `AI Screening – ${screening.candidate_name}`,
    screening,
    history,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /ai-screening/run/:candidateId
 * Trigger AI match for a single candidate.
 */
const runMatch = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.candidateId, 10);

  if (!candidateId) {
    req.flash('error', 'Invalid candidate ID.');
    return res.redirect('/ai-screening');
  }

  try {
    const result = await screeningService.runAIMatch(candidateId);
    req.flash('success', `AI screening completed successfully. Match score: ${result.match_score || 'N/A'}`);
    logger.info(`AI match triggered for candidate ${candidateId} by user ${req.session.user?.id}`);
  } catch (err) {
    logger.error(`AI match failed for candidate ${candidateId}`, { error: err.message });
    req.flash('error', `AI screening failed: ${err.message}`);
  }

  // Redirect back to referrer or screening list
  const returnUrl = req.get('Referer') || '/ai-screening';
  return res.redirect(returnUrl);
});

/**
 * POST /ai-screening/bulk-match
 * Trigger AI match for multiple candidates.
 */
const bulkMatch = asyncHandler(async (req, res) => {
  const { candidate_ids } = req.body;

  if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    req.flash('error', 'Please select at least one candidate for AI screening.');
    return res.redirect('/ai-screening');
  }

  const ids = candidate_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

  try {
    const { results, errors } = await screeningService.runBulkAIMatch(ids);

    if (errors.length > 0) {
      req.flash('error', `Bulk AI screening completed: ${results.length} succeeded, ${errors.length} failed.`);
    } else {
      req.flash('success', `Bulk AI screening completed successfully for ${results.length} candidate(s).`);
    }
  } catch (err) {
    logger.error('Bulk AI match failed', { error: err.message });
    req.flash('error', `Bulk AI screening failed: ${err.message}`);
  }

  return res.redirect('/ai-screening');
});

/**
 * POST /ai-screening/:id/retry
 * Retry a failed AI screening.
 */
const retry = asyncHandler(async (req, res) => {
  const screeningId = parseInt(req.params.id, 10);

  if (!screeningId) {
    req.flash('error', 'Invalid screening ID.');
    return res.redirect('/ai-screening');
  }

  try {
    const result = await screeningService.retryAIMatch(screeningId);
    req.flash('success', `AI screening retried successfully. New match score: ${result.match_score || 'N/A'}`);
    logger.info(`AI screening retry for screening ${screeningId} by user ${req.session.user?.id}`);
  } catch (err) {
    logger.error(`AI screening retry failed for screening ${screeningId}`, { error: err.message });
    req.flash('error', `AI screening retry failed: ${err.message}`);
  }

  return res.redirect(`/ai-screening/${screeningId}`);
});

module.exports = {
  index,
  show,
  runMatch,
  bulkMatch,
  retry,
};
