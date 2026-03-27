// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Super Admin Controller
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * GET /admin/jobs
 * Job openings card view for super admin.
 */
const jobOpenings = asyncHandler(async (req, res) => {
  const scopeFilter = req.query.scope || '';
  const searchFilter = req.query.search || '';
  const roleFilter = req.query.role || '';

  let where = [];
  let params = [];

  if (scopeFilter) {
    where.push('job.applied_for_post_id = ?');
    params.push(scopeFilter);
  }
  if (searchFilter) {
    where.push('(job.applied_for_post LIKE ? OR job.applied_job_short_desc_new LIKE ? OR job.applied_job_desc LIKE ?)');
    params.push(`%${searchFilter}%`, `%${searchFilter}%`, `%${searchFilter}%`);
  }
  if (roleFilter) {
    where.push('job.applied_for_post = ?');
    params.push(roleFilter);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [jobs] = await pool.query(`
    SELECT
      job.id,
      COALESCE(job.applied_for_post_id, 0) AS scope_id,
      CASE COALESCE(job.applied_for_post_id, 0)
        WHEN 1 THEN 'Academics / Teaching'
        WHEN 2 THEN 'Administration / Non-Teaching'
        ELSE 'Other'
      END AS scope,
      COALESCE(job.applied_for_post, job.applied_job_short_desc_new, 'Untitled') AS post_name,
      job.applied_job_short_desc_new AS short_desc,
      job.applied_location AS location,
      COUNT(dsr.id) AS applicant_count
    FROM isdi_admsn_applied_for job
    LEFT JOIN dice_staff_recruitment dsr ON dsr.appln_applied_for_sub = job.id
    ${whereClause}
    GROUP BY job.id, job.applied_for_post_id, job.applied_for_post,
             job.applied_job_short_desc_new, job.applied_job_desc, job.applied_location
    ORDER BY applicant_count DESC
  `, params);

  const totalJobs = jobs.length;
  const academicJobs = jobs.filter(j => j.scope_id == 1).length;
  const adminJobs = jobs.filter(j => j.scope_id == 2).length;
  const totalApplicants = jobs.reduce((s, j) => s + (j.applicant_count || 0), 0);

  // Unique job roles for filter - fetch ALL roles (not filtered)
  const [allRoles] = await pool.query(`
    SELECT DISTINCT COALESCE(applied_for_post, applied_job_short_desc_new) AS role_name
    FROM isdi_admsn_applied_for
    WHERE applied_for_post IS NOT NULL AND applied_for_post != ''
    ORDER BY applied_for_post
  `);
  const jobRoles = allRoles.map(r => r.role_name);

  res.render('super-admin/jobs', {
    title: 'Job Openings',
    jobs,
    totalJobs,
    academicJobs,
    adminJobs,
    totalApplicants,
    jobRoles,
    filters: req.query,
  });
});

module.exports = {
  jobOpenings,
};
