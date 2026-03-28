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
      COUNT(dsr.id) AS applicant_count,
      COALESCE(jcm.ai_matched, 0) AS ai_matched
    FROM isdi_admsn_applied_for job
    LEFT JOIN dice_staff_recruitment dsr ON dsr.appln_applied_for_sub = job.id
    LEFT JOIN (
      /* AI Resume Matched count logic:
         - Applied candidates (appln_applied_for_sub = job_id): match_score >= 50%
         - Non-applied candidates: match_score >= 90% */
      SELECT m.job_id, COUNT(*) AS ai_matched
      FROM atlas_rec_job_candidate_matches m
      LEFT JOIN dice_staff_recruitment dsr ON dsr.id = m.candidate_id
      WHERE (
        (dsr.appln_applied_for_sub = m.job_id AND m.match_score >= 50)
        OR
        (COALESCE(dsr.appln_applied_for_sub, 0) != m.job_id AND m.match_score >= 90)
      )
      GROUP BY m.job_id
    ) jcm ON jcm.job_id = job.id
    ${whereClause}
    GROUP BY job.id, job.applied_for_post_id, job.applied_for_post,
             job.applied_job_short_desc_new, job.applied_job_desc, job.applied_location, jcm.ai_matched
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

/**
 * GET /admin/jobs/:id
 * Job detail with auto-scan and top 50 matching candidates.
 */
const jobDetail = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  if (!jobId) {
    req.flash('error', 'Invalid job ID.');
    return res.redirect('/admin/jobs');
  }

  // Get job details
  const [[job]] = await pool.query(`
    SELECT *,
      COALESCE(applied_for_post, applied_job_short_desc_new, 'Untitled') AS post_name,
      CASE COALESCE(applied_for_post_id, 0)
        WHEN 1 THEN 'Academics / Teaching'
        WHEN 2 THEN 'Administration / Non-Teaching'
        ELSE 'Other'
      END AS scope
    FROM isdi_admsn_applied_for WHERE id = ?
  `, [jobId]);

  if (!job) {
    req.flash('error', 'Job not found.');
    return res.redirect('/admin/jobs');
  }

  // Count applicants for this job
  const [[{ applicant_count }]] = await pool.query(
    'SELECT COUNT(*) AS applicant_count FROM dice_staff_recruitment WHERE appln_applied_for_sub = ?',
    [jobId]
  );

  // Auto-scan: run scan if not scanned yet or if requested
  const jobMatchingService = require('../services/jobMatching.service');
  const forceRefresh = req.query.refresh === '1';

  // Check if already scanned
  let stats = await jobMatchingService.getMatchStats(jobId);

  if (!stats.total_scanned || forceRefresh) {
    // Run scan
    try {
      await jobMatchingService.scanCandidatesForJob(jobId, { limit: 5000, forceRefresh });
      stats = await jobMatchingService.getMatchStats(jobId);
    } catch (err) {
      req.flash('error', 'Scan failed: ' + err.message);
    }
  }

  // Get all matches from entire database (score > 0)
  const topMatches = await jobMatchingService.getTopMatches(jobId, 10000);

  // Get candidates who APPLIED for this specific job
  const [appliedCandidates] = await pool.query(`
    SELECT dsr.id AS candidate_id, dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
           dsr.appln_high_qualification, dsr.appln_total_experience,
           ais.ai_match_score AS screening_score, ais.ai_status AS screening_status,
           aint.total_score AS interview_score, aint.status AS interview_status,
           jcm.match_score, jcm.match_status
    FROM dice_staff_recruitment dsr
    LEFT JOIN (
      SELECT candidate_id, ai_match_score, ai_status
      FROM atlas_rec_candidate_ai_screening s1
      WHERE s1.id = (SELECT MAX(s2.id) FROM atlas_rec_candidate_ai_screening s2 WHERE s2.candidate_id = s1.candidate_id)
    ) ais ON dsr.id = ais.candidate_id
    LEFT JOIN (
      SELECT candidate_id, total_score, status
      FROM atlas_rec_ai_interviews i1
      WHERE i1.id = (SELECT MAX(i2.id) FROM atlas_rec_ai_interviews i2 WHERE i2.candidate_id = i1.candidate_id)
    ) aint ON dsr.id = aint.candidate_id
    LEFT JOIN atlas_rec_job_candidate_matches jcm ON jcm.candidate_id = dsr.id AND jcm.job_id = ?
    WHERE dsr.appln_applied_for_sub = ?
    ORDER BY COALESCE(jcm.match_score, ais.ai_match_score, 0) DESC
  `, [jobId, jobId]);

  const view = req.query.view || 'applied';
  const stage = req.query.stage || null;

  // Funnel stats - separate for each view, never mixed
  // NOTE: AI Resume Match thresholds: 50% for applied candidates, 90% for non-applied
  const appliedFunnel = {
    total: applicant_count || 0,
    cvMatch: appliedCandidates.filter(c => (parseFloat(c.match_score) || 0) >= 50).length,
    interviewTaken: appliedCandidates.filter(c => c.interview_status && ['evaluated', 'submitted', 'passed', 'failed'].includes(c.interview_status)).length,
    interviewPass: appliedCandidates.filter(c => (parseFloat(c.interview_score) || 0) >= 75).length,
  };
  const matchesFunnel = {
    total: topMatches.length,
    cvMatch: topMatches.filter(c => (parseFloat(c.match_score) || 0) >= 90).length,
    interviewTaken: topMatches.filter(c => c.interview_status && ['evaluated', 'submitted', 'passed', 'failed'].includes(c.interview_status)).length,
    interviewPass: topMatches.filter(c => (parseFloat(c.interview_score) || 0) >= 75).length,
  };

  const funnel = view === 'matches' ? matchesFunnel : appliedFunnel;

  res.render('super-admin/job-detail', {
    title: `${job.post_name} - Top Matches`,
    job,
    applicantCount: applicant_count || 0,
    stats,
    topMatches,
    appliedCandidates,
    view,
    stage,
    funnel: {
      applied: funnel.total,
      cvMatch: funnel.cvMatch,
      interviewTaken: funnel.interviewTaken,
      interviewPass: funnel.interviewPass,
    },
  });
});

/**
 * POST /admin/jobs/:id/bulk-invite
 * Send AI interview invitations to selected candidates.
 */
const bulkInvite = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  let candidateIds = req.body.candidate_ids || [];

  // Normalize to array
  if (!Array.isArray(candidateIds)) candidateIds = [candidateIds];
  candidateIds = candidateIds.map(id => parseInt(id, 10)).filter(id => id > 0);

  if (candidateIds.length === 0) {
    req.flash('error', 'No candidates selected.');
    return res.redirect(`/admin/jobs/${jobId}`);
  }

  const interviewService = require('../services/interview.service');
  const notificationService = require('../services/notification.service');
  const candidateRepo = require('../repositories/candidate.repository');
  const logger = require('../utils/logger');

  let successCount = 0;
  let failCount = 0;

  for (const candidateId of candidateIds) {
    try {
      // Delete ALL existing interviews for this candidate (answers, questions, then interview)
      const interviewRepository = require('../repositories/interview.repository');
      const existing = await interviewRepository.findByCandidateId(candidateId);
      for (const old of existing) {
        try {
          await pool.query('DELETE FROM atlas_rec_ai_interview_answers WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interview_questions WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interviews WHERE id = ?', [old.id]);
        } catch (delErr) {
          logger.warn(`[BULK_INVITE] Error deleting old interview ${old.id}: ${delErr.message}`);
        }
      }

      // Create new interview
      const result = await interviewService.createInterview(candidateId, null, 'hr');
      const interviewLink = `${process.env.APP_URL || 'https://recruitment.atlasskilltech.app'}/ai/interview/${result.token}`;

      // Send email notification
      const candidate = await candidateRepo.findById(candidateId);
      const candidateName = candidate?.appln_full_name || 'Candidate';
      const jobTitle = candidate?.applied_for_post || candidate?.applied_job_short_desc_new || 'the applied position';

      const templateData = notificationService.getTemplateMessage('ai_interview_invite', {
        candidateName,
        jobTitle,
        interviewLink,
        expiresIn: '10 days',
      });

      if (templateData) {
        await notificationService.sendNotification({
          candidate_id: candidateId,
          type: 'interview_invite',
          title: templateData.subject,
          message: templateData.message,
          channel: 'email',
        });
      }

      successCount++;
      logger.info(`[BULK_INVITE] Interview sent to candidate ${candidateId} for job ${jobId}`);
    } catch (err) {
      failCount++;
      logger.error(`[BULK_INVITE] Failed for candidate ${candidateId}: ${err.message}`);
    }
  }

  if (successCount > 0) {
    req.flash('success', `AI Interview invitation sent to ${successCount} candidate(s).${failCount > 0 ? ` ${failCount} failed.` : ''}`);
  } else {
    req.flash('error', `Failed to send invitations. ${failCount} error(s).`);
  }

  return res.redirect(`/admin/jobs/${jobId}`);
});

module.exports = {
  jobOpenings,
  jobDetail,
  bulkInvite,
};
