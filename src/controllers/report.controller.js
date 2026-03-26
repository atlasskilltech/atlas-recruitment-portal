// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Report Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * GET /reports
 * Show reports and analytics dashboard.
 */
const index = asyncHandler(async (req, res) => {
  // Applicants by job role (use applied_for_post for role name)
  const [applicantsByRole] = await pool.query(`
    SELECT COALESCE(job.applied_for_post, job.applied_job_short_desc_new, 'Unknown') AS label,
           COUNT(dsr.id) AS value
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    GROUP BY label
    ORDER BY value DESC
    LIMIT 15
  `);

  // Monthly trend (last 12 months)
  const [monthlyTrend] = await pool.query(`
    SELECT DATE_FORMAT(appln_date, '%Y-%m') AS label, COUNT(*) AS value
    FROM dice_staff_recruitment
    WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY label
    ORDER BY label ASC
  `);

  // AI match pass rate (eligible = score >= 50)
  const [[aiPassRate]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN ais.ai_match_score >= 50 THEN 1 ELSE 0 END) AS passed,
      SUM(CASE WHEN ais.ai_status = 'eligible' THEN 1 ELSE 0 END) AS eligible,
      SUM(CASE WHEN ais.ai_status = 'hold' THEN 1 ELSE 0 END) AS hold,
      SUM(CASE WHEN ais.ai_status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM atlas_rec_candidate_ai_screening ais
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_candidate_ai_screening GROUP BY candidate_id
    ) latest ON ais.id = latest.max_id
  `);

  // Interview completion & pass rates (evaluated/passed/failed = completed)
  const [[interviewRates]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN aint.status IN ('evaluated','passed','failed','submitted') THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN aint.status IN ('passed') OR (aint.status = 'evaluated' AND aint.total_score >= 50) THEN 1 ELSE 0 END) AS passed,
      SUM(CASE WHEN aint.status = 'invited' THEN 1 ELSE 0 END) AS invited,
      SUM(CASE WHEN aint.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
  `);

  // Hiring funnel
  const [[totalApplicants]] = await pool.query('SELECT COUNT(*) AS cnt FROM dice_staff_recruitment');
  const [[aiEligible]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_candidate_ai_screening WHERE ai_status = 'eligible'
  `);
  const [[interviewed]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_ai_interviews WHERE status IN ('evaluated','passed')
  `);
  const [[shortlisted]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_hr_shortlists WHERE hr_status = 'shortlisted'
  `);
  const [[scheduled]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_interview_schedules WHERE status = 'scheduled'
  `);
  const [[selected]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_hr_shortlists WHERE hr_status = 'selected'
  `);
  const [[hired]] = await pool.query(`
    SELECT COUNT(DISTINCT candidate_id) AS cnt FROM atlas_rec_hr_shortlists WHERE hr_status = 'hired'
  `);

  const hiringFunnel = [
    { label: 'Applied', value: totalApplicants.cnt || 0 },
    { label: 'AI Eligible', value: aiEligible.cnt || 0 },
    { label: 'Interviewed', value: interviewed.cnt || 0 },
    { label: 'Shortlisted', value: shortlisted.cnt || 0 },
    { label: 'Scheduled', value: scheduled.cnt || 0 },
    { label: 'Selected', value: selected.cnt || 0 },
    { label: 'Hired', value: hired.cnt || 0 },
  ];

  // Top performing jobs
  const [topJobs] = await pool.query(`
    SELECT COALESCE(job.applied_for_post, job.applied_job_short_desc_new, 'Unknown') AS title,
           COUNT(dsr.id) AS applicant_count
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    GROUP BY title
    ORDER BY applicant_count DESC
    LIMIT 10
  `);

  const reportData = {
    applicantsByRole,
    monthlyTrend,
    aiPassRate: {
      total: aiPassRate.total || 0,
      passed: aiPassRate.passed || 0,
      eligible: aiPassRate.eligible || 0,
      hold: aiPassRate.hold || 0,
      rejected: aiPassRate.rejected || 0,
      rate: aiPassRate.total > 0 ? Math.round((aiPassRate.passed / aiPassRate.total) * 100) : 0,
    },
    interviewRates: {
      total: interviewRates.total || 0,
      completed: interviewRates.completed || 0,
      passed: interviewRates.passed || 0,
      invited: interviewRates.invited || 0,
      in_progress: interviewRates.in_progress || 0,
      completionRate: interviewRates.total > 0 ? Math.round((interviewRates.completed / interviewRates.total) * 100) : 0,
      passRate: interviewRates.completed > 0 ? Math.round((interviewRates.passed / interviewRates.completed) * 100) : 0,
    },
    hiringFunnel,
    topJobs,
  };

  res.render('reports/index', {
    title: 'Reports & Analytics',
    reportData,
  });
});

module.exports = {
  index,
};
