// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – API Controller (JSON endpoints for AJAX)
// ---------------------------------------------------------------------------
const candidateService = require('../services/candidate.service');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /api/dashboard/stats
 * Return dashboard statistics as JSON.
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Total applicants
  const [[{ total_applicants }]] = await pool.query(
    'SELECT COUNT(*) AS total_applicants FROM dice_staff_recruitment'
  );

  // New applicants (last 30 days)
  const [[{ new_applicants }]] = await pool.query(
    `SELECT COUNT(*) AS new_applicants FROM dice_staff_recruitment
     WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );

  // AI screening counts
  const [aiScreeningRows] = await pool.query(`
    SELECT ais.screening_status, COUNT(*) AS cnt
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    GROUP BY ais.screening_status
  `);

  const aiScreeningMap = {};
  aiScreeningRows.forEach((r) => { aiScreeningMap[r.screening_status] = r.cnt; });

  // AI interview counts
  const [aiInterviewRows] = await pool.query(`
    SELECT aint.interview_status, COUNT(*) AS cnt
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews
      GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
    GROUP BY aint.interview_status
  `);

  const aiInterviewMap = {};
  aiInterviewRows.forEach((r) => { aiInterviewMap[r.interview_status] = r.cnt; });

  // HR status counts
  const [hrStatusRows] = await pool.query(`
    SELECT appln_status_new AS status, COUNT(*) AS cnt
    FROM dice_staff_recruitment
    GROUP BY appln_status_new
  `);

  const hrMap = {};
  hrStatusRows.forEach((r) => { hrMap[r.status] = r.cnt; });

  return res.json({
    success: true,
    stats: {
      total_applicants,
      new_applicants,
      ai_eligible: aiScreeningMap['eligible'] || 0,
      ai_rejected: aiScreeningMap['rejected'] || 0,
      ai_hold: aiScreeningMap['hold'] || 0,
      interview_pending: aiInterviewMap['pending'] || 0,
      interview_passed: aiInterviewMap['passed'] || 0,
      interview_failed: aiInterviewMap['failed'] || 0,
      interview_evaluated: aiInterviewMap['evaluated'] || 0,
      shortlisted: hrMap['shortlisted'] || 0,
      scheduled: hrMap['scheduled'] || 0,
      selected: hrMap['selected'] || 0,
      offer_released: hrMap['offer_released'] || 0,
      hired: hrMap['hired'] || 0,
      rejected: hrMap['rejected'] || 0,
    },
  });
});

/**
 * GET /api/candidates
 * Return paginated candidate list as JSON.
 */
const getCandidates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters
  const filters = {};
  if (req.query.search) filters.name = req.query.search;
  if (req.query.name) filters.name = req.query.name;
  if (req.query.email) filters.email = req.query.email;
  if (req.query.job_id) filters.job_id = req.query.job_id;
  if (req.query.hr_status) filters.hr_status = req.query.hr_status;
  if (req.query.ai_status) filters.ai_status = req.query.ai_status;
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;
  if (req.query.match_score_min) filters.match_score_min = parseFloat(req.query.match_score_min);
  if (req.query.match_score_max) filters.match_score_max = parseFloat(req.query.match_score_max);
  if (req.query.interview_score_min) filters.interview_score_min = parseFloat(req.query.interview_score_min);
  if (req.query.interview_score_max) filters.interview_score_max = parseFloat(req.query.interview_score_max);

  if (req.query.sort_by) {
    filters.sort = {
      field: req.query.sort_by,
      order: req.query.sort_order || 'DESC',
    };
  }

  const { candidates, total } = await candidateService.getAllCandidates(filters, { page, limit });
  const totalPages = Math.ceil(total / limit);

  return res.json({
    success: true,
    data: candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

/**
 * GET /api/candidates/:id
 * Return single candidate detail as JSON.
 */
const getCandidateDetail = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.id, 10);
  if (!candidateId) {
    return res.status(400).json({ success: false, message: 'Invalid candidate ID.' });
  }

  const candidate = await candidateService.getCandidateById(candidateId);
  if (!candidate) {
    return res.status(404).json({ success: false, message: 'Candidate not found.' });
  }

  return res.json({
    success: true,
    data: candidate,
  });
});

/**
 * GET /api/charts
 * Return chart datasets for the dashboard.
 */
const getChartData = asyncHandler(async (req, res) => {
  // Applicants by job role
  const [applicantsByRole] = await pool.query(`
    SELECT job.applied_job_short_desc_new AS label, COUNT(dsr.id) AS value
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    GROUP BY job.applied_job_short_desc_new
    ORDER BY value DESC
    LIMIT 10
  `);

  // Match score distribution
  const [matchScoreDist] = await pool.query(`
    SELECT
      CASE
        WHEN ais.match_score >= 90 THEN '90-100'
        WHEN ais.match_score >= 80 THEN '80-89'
        WHEN ais.match_score >= 70 THEN '70-79'
        WHEN ais.match_score >= 60 THEN '60-69'
        WHEN ais.match_score >= 50 THEN '50-59'
        WHEN ais.match_score >= 40 THEN '40-49'
        WHEN ais.match_score >= 30 THEN '30-39'
        WHEN ais.match_score >= 20 THEN '20-29'
        WHEN ais.match_score >= 10 THEN '10-19'
        ELSE '0-9'
      END AS label,
      COUNT(*) AS value
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    GROUP BY label
    ORDER BY label
  `);

  // Interview score distribution
  const [interviewScoreDist] = await pool.query(`
    SELECT
      CASE
        WHEN aint.overall_score >= 90 THEN '90-100'
        WHEN aint.overall_score >= 80 THEN '80-89'
        WHEN aint.overall_score >= 70 THEN '70-79'
        WHEN aint.overall_score >= 60 THEN '60-69'
        WHEN aint.overall_score >= 50 THEN '50-59'
        WHEN aint.overall_score >= 40 THEN '40-49'
        WHEN aint.overall_score >= 30 THEN '30-39'
        WHEN aint.overall_score >= 20 THEN '20-29'
        WHEN aint.overall_score >= 10 THEN '10-19'
        ELSE '0-9'
      END AS label,
      COUNT(*) AS value
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
    WHERE aint.overall_score IS NOT NULL
    GROUP BY label
    ORDER BY label
  `);

  // Monthly trend (last 12 months)
  const [monthlyTrend] = await pool.query(`
    SELECT DATE_FORMAT(appln_date, '%Y-%m') AS label, COUNT(*) AS value
    FROM dice_staff_recruitment
    WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY label
    ORDER BY label ASC
  `);

  // Status funnel
  const [[{ total_applicants }]] = await pool.query(
    'SELECT COUNT(*) AS total_applicants FROM dice_staff_recruitment'
  );

  const [hrCounts] = await pool.query(`
    SELECT appln_status_new AS status, COUNT(*) AS cnt
    FROM dice_staff_recruitment
    GROUP BY appln_status_new
  `);
  const hrMap = {};
  hrCounts.forEach((r) => { hrMap[r.status] = r.cnt; });

  const [aiEligibleResult] = await pool.query(`
    SELECT COUNT(*) AS cnt
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    WHERE ais.screening_status = 'eligible'
  `);

  const [interviewPassedResult] = await pool.query(`
    SELECT COUNT(*) AS cnt
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
    WHERE aint.interview_status = 'passed'
  `);

  const statusFunnel = [
    { label: 'Total Applicants', value: total_applicants },
    { label: 'AI Eligible', value: aiEligibleResult[0].cnt },
    { label: 'Interview Passed', value: interviewPassedResult[0].cnt },
    { label: 'Shortlisted', value: hrMap['shortlisted'] || 0 },
    { label: 'Scheduled', value: hrMap['scheduled'] || 0 },
    { label: 'Hired', value: hrMap['hired'] || 0 },
  ];

  return res.json({
    success: true,
    charts: {
      applicantsByRole,
      matchScoreDist,
      interviewScoreDist,
      monthlyTrend,
      statusFunnel,
    },
  });
});

/**
 * GET /api/search
 * Quick search returning candidate matches as JSON (for autocomplete / live search).
 */
const searchCandidates = asyncHandler(async (req, res) => {
  const query = (req.query.q || '').trim();

  if (!query || query.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const [results] = await pool.query(`
    SELECT dsr.id, dsr.appln_id, dsr.appln_full_name, dsr.appln_email,
      dsr.appln_mobile_no, dsr.appln_status_new,
      job.applied_job_short_desc_new AS job_title
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    WHERE dsr.appln_full_name LIKE ?
       OR dsr.appln_email LIKE ?
       OR dsr.appln_mobile_no LIKE ?
       OR dsr.appln_id LIKE ?
    ORDER BY dsr.appln_full_name ASC
    LIMIT 20
  `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

  return res.json({
    success: true,
    data: results,
  });
});

/**
 * GET /api/reports
 * Return aggregated reports data as JSON.
 */
const getReportsData = asyncHandler(async (req, res) => {
  // Overview counts
  const [[overview]] = await pool.query(`
    SELECT
      COUNT(*) AS total_candidates,
      SUM(CASE WHEN appln_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_last_30_days,
      SUM(CASE WHEN appln_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new_last_7_days
    FROM dice_staff_recruitment
  `);

  // HR status breakdown
  const [hrStatusBreakdown] = await pool.query(`
    SELECT appln_status_new AS status, COUNT(*) AS count
    FROM dice_staff_recruitment
    GROUP BY appln_status_new
    ORDER BY count DESC
  `);

  // AI screening summary
  const [screeningSummary] = await pool.query(`
    SELECT
      COUNT(*) AS total_screened,
      AVG(ais.match_score) AS avg_match_score,
      MIN(ais.match_score) AS min_match_score,
      MAX(ais.match_score) AS max_match_score,
      SUM(CASE WHEN ais.screening_status = 'eligible' THEN 1 ELSE 0 END) AS eligible_count,
      SUM(CASE WHEN ais.screening_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
      SUM(CASE WHEN ais.screening_status = 'hold' THEN 1 ELSE 0 END) AS hold_count
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
  `);

  // AI interview summary
  const [interviewSummary] = await pool.query(`
    SELECT
      COUNT(*) AS total_interviewed,
      AVG(aint.overall_score) AS avg_interview_score,
      MIN(aint.overall_score) AS min_interview_score,
      MAX(aint.overall_score) AS max_interview_score,
      SUM(CASE WHEN aint.interview_status = 'passed' THEN 1 ELSE 0 END) AS passed_count,
      SUM(CASE WHEN aint.interview_status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
      SUM(CASE WHEN aint.interview_status = 'evaluated' THEN 1 ELSE 0 END) AS evaluated_count
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
  `);

  // Top job roles by applications
  const [topJobRoles] = await pool.query(`
    SELECT job.applied_job_short_desc_new AS job_title,
      COUNT(dsr.id) AS application_count
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    GROUP BY job.applied_job_short_desc_new
    ORDER BY application_count DESC
    LIMIT 15
  `);

  // Monthly hiring trend
  const [monthlyHiring] = await pool.query(`
    SELECT DATE_FORMAT(appln_date, '%Y-%m') AS month,
      COUNT(*) AS applications,
      SUM(CASE WHEN appln_status_new = 'hired' THEN 1 ELSE 0 END) AS hires
    FROM dice_staff_recruitment
    WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month ASC
  `);

  return res.json({
    success: true,
    reports: {
      overview,
      hrStatusBreakdown,
      screeningSummary: screeningSummary[0] || {},
      interviewSummary: interviewSummary[0] || {},
      topJobRoles,
      monthlyHiring,
    },
  });
});

module.exports = {
  getDashboardStats,
  getCandidates,
  getCandidateDetail,
  getChartData,
  searchCandidates,
  getReportsData,
};
