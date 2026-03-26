// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – AI Interview Auto-Invite Cron Job
// ---------------------------------------------------------------------------
// Runs every 2 minutes to auto-invite eligible candidates (ai_match_score >= 50)
// to AI interviews. Sends interview link email to admin only.
// ---------------------------------------------------------------------------
const cron = require('node-cron');
const pool = require('../config/db');
const interviewService = require('../services/interview.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

let isRunning = false;

async function inviteEligibleCandidates() {
  if (isRunning) {
    logger.info('[INTERVIEW_CRON] Skipping – previous run still in progress');
    return;
  }

  isRunning = true;

  try {
    // Find eligible candidates (ai_match_score >= 50) who have NO interview yet
    const [eligible] = await pool.query(`
      SELECT ais.candidate_id, ais.id AS screening_id,
             ais.ai_match_score, ais.ai_status,
             dsr.appln_full_name, dsr.appln_applied_for
      FROM atlas_rec_candidate_ai_screening ais
      INNER JOIN (
        SELECT candidate_id, MAX(id) AS max_id
        FROM atlas_rec_candidate_ai_screening
        GROUP BY candidate_id
      ) latest ON ais.id = latest.max_id
      LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
      LEFT JOIN atlas_rec_ai_interviews aint ON aint.candidate_id = ais.candidate_id
      WHERE ais.ai_status = 'eligible'
        AND ais.ai_match_score >= 50
        AND aint.id IS NULL
      ORDER BY ais.ai_match_score DESC
      LIMIT 10
    `);

    if (eligible.length === 0) {
      logger.info('[INTERVIEW_CRON] No eligible candidates without interviews found');
      isRunning = false;
      return;
    }

    logger.info(`[INTERVIEW_CRON] Found ${eligible.length} eligible candidate(s) to auto-invite`);

    let successCount = 0;
    let errorCount = 0;

    for (const candidate of eligible) {
      try {
        // Always use behavioral+hr interview type with hard difficulty
        const interviewType = 'hr';

        logger.info(`[INTERVIEW_CRON] Auto-inviting candidate ${candidate.candidate_id} (${candidate.appln_full_name || 'N/A'}) for behavioral+hr interview (score: ${candidate.ai_match_score})`);

        const result = await interviewService.createInterview(
          candidate.candidate_id,
          candidate.screening_id,
          interviewType
        );

        // Build interview link
        const appUrl = process.env.APP_URL || 'https://recruitment.atlasskilltech.app';
        const interviewLink = `${appUrl}/ai/interview/${result.token}`;

        logger.info(`[INTERVIEW_CRON] Interview created: id=${result.id}, link=${interviewLink.substring(0, 80)}...`);

        // Send interview link email to admin only (for testing)
        try {
          const templateData = notificationService.getTemplateMessage('ai_interview_invite', {
            candidateName: candidate.appln_full_name || 'Candidate',
            jobTitle: 'Position',
            interviewLink: interviewLink,
            expiresIn: '10 days',
          });

          if (templateData) {
            await notificationService.sendNotification({
              candidate_id: candidate.candidate_id,
              type: 'interview_invite',
              title: templateData.subject,
              message: templateData.message,
              channel: 'email',
            });
            logger.info(`[INTERVIEW_CRON] Interview link email sent to admin for candidate ${candidate.candidate_id}`);
          }
        } catch (emailErr) {
          logger.warn(`[INTERVIEW_CRON] Email notification failed: ${emailErr.message}`);
        }

        successCount++;
      } catch (err) {
        logger.error(`[INTERVIEW_CRON] Failed to invite candidate ${candidate.candidate_id}: ${err.message}`);
        errorCount++;
      }
    }

    logger.info(`[INTERVIEW_CRON] Completed: ${successCount} invited, ${errorCount} failed`);
  } catch (error) {
    logger.error(`[INTERVIEW_CRON] Job error: ${error.message}`, { stack: error.stack });
  } finally {
    isRunning = false;
  }
}

function startAIInterviewCron() {
  // Run every 2 minutes (offset by 1 minute from screening cron to avoid overlap)
  cron.schedule('1-59/2 * * * *', () => {
    logger.info('[INTERVIEW_CRON] Running scheduled auto-invite check...');
    inviteEligibleCandidates();
  });

  logger.info('[INTERVIEW_CRON] AI interview auto-invite cron started (every 2 minutes, batch 10)');

  // Also run once on startup after screening cron has had time to process (30 seconds)
  setTimeout(() => {
    logger.info('[INTERVIEW_CRON] Running initial auto-invite check...');
    inviteEligibleCandidates();
  }, 30000);
}

module.exports = { startAIInterviewCron, inviteEligibleCandidates };
