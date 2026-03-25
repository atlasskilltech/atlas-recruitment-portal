// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Dashboard Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const candidateService = require('../services/candidate.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /dashboard
 * Render the main dashboard with stats, charts, and recent applicants.
 */
const index = asyncHandler(async (req, res) => {
  // ---- Aggregate statistics ------------------------------------------------
  const [[{ total_applicants }]] = await pool.query(
    'SELECT COUNT(*) AS total_applicants FROM dice_staff_recruitment'
  );

  const [[{ new_applicants }]] = await pool.query(
    `SELECT COUNT(*) AS new_applicants FROM dice_staff_recruitment
     WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );

  // AI screening counts (latest screening per candidate)
  const [aiScreeningRows] = await pool.query(`
    SELECT ais.ai_status, COUNT(*) AS cnt
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening
      GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
    GROUP BY ais.ai_status
  `);

  const aiScreeningMap = {};
  aiScreeningRows.forEach((r) => { aiScreeningMap[r.ai_status] = r.cnt; });

  const ai_eligible = aiScreeningMap['eligible'] || 0;
  const ai_rejected = aiScreeningMap['rejected'] || 0;

  // AI interview counts (latest interview per candidate)
  const [aiInterviewRows] = await pool.query(`
    SELECT aint.status AS interview_status, COUNT(*) AS cnt
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews
      GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
    GROUP BY aint.status
  `);

  const aiInterviewMap = {};
  aiInterviewRows.forEach((r) => { aiInterviewMap[r.interview_status] = r.cnt; });

  const interview_pending = aiInterviewMap['pending'] || 0;
  const interview_passed = aiInterviewMap['passed'] || 0;

  // HR status counts
  const [hrStatusRows] = await pool.query(`
    SELECT appln_status_new AS status, COUNT(*) AS cnt
    FROM dice_staff_recruitment
    GROUP BY appln_status_new
  `);

  const hrMap = {};
  hrStatusRows.forEach((r) => { hrMap[r.status] = r.cnt; });

  const shortlisted = hrMap['shortlisted'] || 0;
  const scheduled = hrMap['scheduled'] || 0;
  const hired = hrMap['hired'] || 0;
  const rejected = hrMap['rejected'] || 0;

  const stats = {
    total_applicants,
    new_applicants,
    ai_eligible,
    ai_rejected,
    interview_pending,
    interview_passed,
    shortlisted,
    scheduled,
    hired,
    rejected,
  };

  // ---- Chart data ----------------------------------------------------------

  // Applicants by job role
  const [applicantsByRole] = await pool.query(`
    SELECT job.applied_job_short_desc_new AS label, COUNT(dsr.id) AS value
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    GROUP BY job.applied_job_short_desc_new
    ORDER BY value DESC
    LIMIT 10
  `);

  // Match score distribution (buckets of 10)
  const [matchScoreDist] = await pool.query(`
    SELECT
      CASE
        WHEN ais.ai_match_score >= 90 THEN '90-100'
        WHEN ais.ai_match_score >= 80 THEN '80-89'
        WHEN ais.ai_match_score >= 70 THEN '70-79'
        WHEN ais.ai_match_score >= 60 THEN '60-69'
        WHEN ais.ai_match_score >= 50 THEN '50-59'
        WHEN ais.ai_match_score >= 40 THEN '40-49'
        WHEN ais.ai_match_score >= 30 THEN '30-39'
        WHEN ais.ai_match_score >= 20 THEN '20-29'
        WHEN ais.ai_match_score >= 10 THEN '10-19'
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

  // Interview score distribution (buckets of 10)
  const [interviewScoreDist] = await pool.query(`
    SELECT
      CASE
        WHEN aint.total_score >= 90 THEN '90-100'
        WHEN aint.total_score >= 80 THEN '80-89'
        WHEN aint.total_score >= 70 THEN '70-79'
        WHEN aint.total_score >= 60 THEN '60-69'
        WHEN aint.total_score >= 50 THEN '50-59'
        WHEN aint.total_score >= 40 THEN '40-49'
        WHEN aint.total_score >= 30 THEN '30-39'
        WHEN aint.total_score >= 20 THEN '20-29'
        WHEN aint.total_score >= 10 THEN '10-19'
        ELSE '0-9'
      END AS label,
      COUNT(*) AS value
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
    WHERE aint.total_score IS NOT NULL
    GROUP BY label
    ORDER BY label
  `);

  // Monthly application trend (last 12 months)
  const [monthlyTrend] = await pool.query(`
    SELECT DATE_FORMAT(appln_date, '%Y-%m') AS label, COUNT(*) AS value
    FROM dice_staff_recruitment
    WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY label
    ORDER BY label ASC
  `);

  // Status funnel
  const statusFunnel = [
    { label: 'Total Applicants', value: total_applicants },
    { label: 'AI Eligible', value: ai_eligible },
    { label: 'Interview Passed', value: interview_passed },
    { label: 'Shortlisted', value: shortlisted },
    { label: 'Scheduled', value: scheduled },
    { label: 'Hired', value: hired },
  ];

  const charts = {
    applicantsByRole,
    matchScoreDist,
    interviewScoreDist,
    monthlyTrend,
    statusFunnel,
  };

  // ---- Recent applicants ---------------------------------------------------
  const [recentApplicants] = await pool.query(`
    SELECT dsr.id, dsr.appln_id, dsr.appln_full_name, dsr.appln_email,
      dsr.appln_date, dsr.appln_status_new,
      job.applied_job_short_desc_new AS job_title,
      ais.ai_match_score, ais.ai_status AS ai_screening_status,
      aint.total_score AS interview_score, aint.status AS ai_interview_status
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
      AND ais.id = (
        SELECT MAX(s2.id) FROM atlas_rec_candidate_ai_screening s2
        WHERE s2.candidate_id = dsr.id
      )
    LEFT JOIN atlas_rec_ai_interviews aint ON aint.candidate_id = dsr.id
      AND aint.id = (
        SELECT MAX(i2.id) FROM atlas_rec_ai_interviews i2
        WHERE i2.candidate_id = dsr.id
      )
    ORDER BY dsr.appln_date DESC
    LIMIT 10
  `);

  res.render('dashboard/index', {
    title: 'Dashboard',
    stats,
    charts,
    recentApplicants,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

module.exports = {
  index,
};
