const pool = require('../config/db');

async function getApplicationsForEmail(email) {
  const [rows] = await pool.query(`
    SELECT dsr.id, dsr.appln_id, dsr.appln_full_name, dsr.appln_email,
      dsr.appln_date, dsr.appln_status, dsr.appln_status_new,
      dsr.appln_mobile_no, dsr.appln_high_qualification, dsr.appln_specialization,
      dsr.appln_total_experience, dsr.appln_current_organisation, dsr.appln_current_designation,
      job.applied_job_short_desc_new AS job_title, job.applied_location AS job_location,
      ais.ai_match_score, ais.ai_status, ais.role_fit_summary,
      aint.status AS interview_status, aint.total_score AS interview_score,
      aint.id AS interview_id, aint.invitation_token,
      sh.hr_status,
      sch.scheduled_date, sch.scheduled_time, sch.mode AS schedule_mode,
      sch.location AS schedule_location, sch.meeting_link, sch.status AS schedule_status
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
      AND ais.id = (SELECT MAX(s2.id) FROM atlas_rec_candidate_ai_screening s2 WHERE s2.candidate_id = dsr.id)
    LEFT JOIN atlas_rec_ai_interviews aint ON aint.candidate_id = dsr.id
      AND aint.id = (SELECT MAX(i2.id) FROM atlas_rec_ai_interviews i2 WHERE i2.candidate_id = dsr.id)
    LEFT JOIN atlas_rec_hr_shortlists sh ON sh.candidate_id = dsr.id
      AND sh.id = (SELECT MAX(sh2.id) FROM atlas_rec_hr_shortlists sh2 WHERE sh2.candidate_id = dsr.id)
    LEFT JOIN atlas_rec_interview_schedules sch ON sch.candidate_id = dsr.id
      AND sch.id = (SELECT MAX(sch2.id) FROM atlas_rec_interview_schedules sch2 WHERE sch2.candidate_id = dsr.id)
    WHERE dsr.appln_email = ?
    ORDER BY dsr.appln_date DESC
  `, [email.trim().toLowerCase()]);
  return rows;
}

async function getApplicationById(id, email) {
  const apps = await getApplicationsForEmail(email);
  return apps.find(a => a.id === id) || null;
}

async function getDocumentsForCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT appln_cv, appln_industry_exp_letter, appln_university_exp_letter,
      appln_statement, appln_profile, appln_chapter, appln_article, appln_article1, appln_article2
    FROM dice_staff_recruitment WHERE id = ?`,
    [candidateId]
  );
  if (rows.length === 0) return [];

  const baseUrl = 'https://www.atlasuniversity.edu.in/careers/uploads/';
  const c = rows[0];
  const docs = [
    { type: 'CV / Resume', key: 'appln_cv', file: c.appln_cv },
    { type: 'Industry Experience Letter', key: 'appln_industry_exp_letter', file: c.appln_industry_exp_letter },
    { type: 'University Experience Letter', key: 'appln_university_exp_letter', file: c.appln_university_exp_letter },
    { type: 'Statement', key: 'appln_statement', file: c.appln_statement },
    { type: 'Profile', key: 'appln_profile', file: c.appln_profile },
    { type: 'Chapter', key: 'appln_chapter', file: c.appln_chapter },
    { type: 'Article', key: 'appln_article', file: c.appln_article },
    { type: 'Article 1', key: 'appln_article1', file: c.appln_article1 },
    { type: 'Article 2', key: 'appln_article2', file: c.appln_article2 },
  ];

  return docs.map(d => ({
    ...d,
    available: !!d.file,
    url: d.file ? baseUrl + d.file : null,
  }));
}

async function getNotificationsForCandidate(candidateIds, limit = 20) {
  if (!candidateIds || candidateIds.length === 0) return [];
  const placeholders = candidateIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT * FROM atlas_rec_notifications WHERE candidate_id IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`,
    [...candidateIds, limit]
  );
  return rows;
}

async function getUpcomingSchedules(candidateIds) {
  if (!candidateIds || candidateIds.length === 0) return [];
  const placeholders = candidateIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT sch.*, dsr.appln_full_name, job.applied_job_short_desc_new AS job_title
    FROM atlas_rec_interview_schedules sch
    LEFT JOIN dice_staff_recruitment dsr ON sch.candidate_id = dsr.id
    LEFT JOIN isdi_admsn_applied_for job ON sch.job_id = job.id
    WHERE sch.candidate_id IN (${placeholders}) AND sch.scheduled_date >= CURDATE() AND sch.status IN ('scheduled','confirmed')
    ORDER BY sch.scheduled_date ASC LIMIT 5`,
    candidateIds
  );
  return rows;
}

module.exports = { getApplicationsForEmail, getApplicationById, getDocumentsForCandidate, getNotificationsForCandidate, getUpcomingSchedules };
