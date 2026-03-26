// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – AI Screening Cron Job
// ---------------------------------------------------------------------------
// Runs every 2 minutes to auto-screen candidates who haven't been screened yet.
// Processes up to 15 candidates per run.
// ---------------------------------------------------------------------------
const cron = require('node-cron');
const pool = require('../config/db');
const screeningService = require('../services/screening.service');
const logger = require('../utils/logger');

let isRunning = false;

async function runPendingScreenings() {
  if (isRunning) {
    logger.info('[AI_CRON] Skipping – previous run still in progress');
    return;
  }

  isRunning = true;

  try {
    // Find candidates who have NO screening record yet (only recent applicants)
    const [unscreened] = await pool.query(`
      SELECT dsr.id, dsr.appln_full_name, dsr.appln_applied_for_sub, dsr.appln_cv
      FROM dice_staff_recruitment dsr
      LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
      WHERE ais.id IS NULL
        AND dsr.appln_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      ORDER BY dsr.appln_date DESC
      LIMIT 5
    `);

    if (unscreened.length === 0) {
      logger.info('[AI_CRON] No unscreened candidates found');
      isRunning = false;
      return;
    }

    const candidateIds = unscreened.map(r => r.id);
    logger.info(`[AI_CRON] Found ${candidateIds.length} unscreened candidate(s): ${candidateIds.join(', ')}`);

    // Log details for debugging
    unscreened.forEach(c => {
      logger.info(`[AI_CRON]   - ID=${c.id}, Name=${c.appln_full_name || 'N/A'}, JobRef=${c.appln_applied_for_sub || 'NONE'}, CV=${c.appln_cv || 'NONE'}`);
    });

    const { results, errors } = await screeningService.runBulkAIMatch(candidateIds);

    logger.info(`[AI_CRON] Completed: ${results.length} success, ${errors.length} failed`);

    // Log successful results with scores
    results.forEach(r => {
      logger.info(`[AI_CRON]   - Candidate ${r.candidateId}: score=${r.screening?.ai_match_score}, status=${r.screening?.ai_status}`);
    });

    if (errors.length > 0) {
      errors.forEach(e => logger.warn(`[AI_CRON] Failed candidate ${e.candidateId}: ${e.error}`));
    }
  } catch (error) {
    logger.error(`[AI_CRON] Job error: ${error.message}`, { stack: error.stack });
  } finally {
    isRunning = false;
  }
}

function startAIScreeningCron() {
  // Run every 5 minutes to avoid OpenAI rate limits
  cron.schedule('*/5 * * * *', () => {
    logger.info('[AI_CRON] Running scheduled AI screening check...');
    runPendingScreenings();
  });

  logger.info('[AI_CRON] AI screening cron job started (every 5 minutes, batch size 5)');

  // Also run once on startup after a short delay
  setTimeout(() => {
    logger.info('[AI_CRON] Running initial AI screening check...');
    runPendingScreenings();
  }, 10000);
}

module.exports = { startAIScreeningCron, runPendingScreenings };
