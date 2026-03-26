const screeningRepository = require('../repositories/screening.repository');
const candidateRepository = require('../repositories/candidate.repository');
const jobRepository = require('../repositories/job.repository');
const { callAI } = require('./ai/aiProvider.service');
const auditService = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Screening Service – orchestrates AI-powered candidate screening
 */
class ScreeningService {
  /**
   * Run full AI matching for a single candidate.
   * Fetches candidate and job data, calls AI provider, saves results, logs activity.
   * @param {number} candidateId
   * @returns {Promise<object>} screening result
   */
  async runAIMatch(candidateId) {
    logger.info(`Running AI match for candidate ${candidateId}`);

    // 1. Get candidate
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    // 2. Get associated job — handle appln_applied_for_sub = 0 or NULL
    const rawJobId = candidate.job_id || candidate.appln_applied_for_sub;
    const jobId = (rawJobId && parseInt(rawJobId, 10) > 0) ? parseInt(rawJobId, 10) : null;
    const job = jobId ? await jobRepository.findById(jobId) : null;

    if (!job) {
      logger.warn(`No valid job found for candidate ${candidateId} (appln_applied_for_sub=${candidate.appln_applied_for_sub}). Using placeholder job data.`);
    }

    // Build a job object even when no job record exists, using whatever info we have
    const effectiveJob = job || {
      id: 0,
      applied_job_short_desc_new: candidate.appln_applied_for_sub_text || candidate.appln_post_applied || 'General Application',
      applied_job_desc: candidate.appln_applied_for_sub_text || candidate.appln_post_applied || '',
      applied_job_requirements: '',
      applied_for_post_id: '',
      applied_location: '',
    };

    // 3. Use the JD matcher service (which falls back to heuristic if no AI key)
    const jdMatcher = require('./ai/jdMatcher.service');
    const matchResult = await jdMatcher.matchCandidateToJob(candidate, effectiveJob);

    // 4. Determine screening status based on score
    const scoringService = require('./ai/scoring.service');
    const screeningStatus = scoringService.getAIStatus(matchResult.score);

    // 5. Build file URLs
    const fileUrlService = require('./fileUrl.service');
    const cvUrl = fileUrlService.buildFileUrl(candidate.appln_cv);
    const coverUrl = fileUrlService.buildFileUrl(candidate.appln_industry_exp_letter);

    // 6. Save screening result
    const screening = await screeningRepository.create({
      candidate_id: candidateId,
      job_id: effectiveJob.id || 0,
      cv_file_name: candidate.appln_cv || null,
      cv_file_url: cvUrl,
      cover_letter_file_name: candidate.appln_industry_exp_letter || null,
      cover_letter_file_url: coverUrl,
      jd_snapshot: effectiveJob.applied_job_desc || null,
      extracted_skills: JSON.stringify(matchResult.extractedSkills || []),
      extracted_keywords: JSON.stringify(matchResult.extractedKeywords || []),
      extracted_education_summary: matchResult.educationSummary || null,
      extracted_experience_summary: matchResult.experienceSummary || null,
      ai_match_score: matchResult.score,
      skill_gap_analysis: matchResult.skillGapAnalysis || null,
      role_fit_summary: matchResult.summary || null,
      ai_recommendation_tag: matchResult.recommendationTag || 'weak_fit',
      ai_status: screeningStatus,
      ai_provider: matchResult.provider || 'heuristic',
      ai_model: matchResult.model || 'deterministic-v1',
      raw_ai_response: JSON.stringify(matchResult.rawResponse || null),
      processed_at: new Date(),
    });

    // 7. Log activity
    await auditService.logActivity({
      candidate_id: candidateId,
      job_id: effectiveJob.id || 0,
      action_key: 'ai_screening_completed',
      action_label: `AI screening completed with score ${matchResult.score}`,
      metadata: JSON.stringify({
        screening_id: screening.id,
        score: matchResult.score,
        status: screeningStatus,
        provider: matchResult.provider,
        had_job: !!job,
        had_cv: !!candidate.appln_cv,
      }),
    });

    logger.info(`AI match completed for candidate ${candidateId}: score=${matchResult.score}, status=${screeningStatus}, provider=${matchResult.provider}`);

    return screening;
  }

  /**
   * Run AI matching for multiple candidates in sequence.
   * @param {number[]} candidateIds
   * @returns {Promise<{ results: object[], errors: object[] }>}
   */
  async runBulkAIMatch(candidateIds) {
    const results = [];
    const errors = [];

    for (const candidateId of candidateIds) {
      try {
        const result = await this.runAIMatch(candidateId);
        results.push({ candidateId, screening: result });
      } catch (err) {
        logger.error(`Bulk AI match failed for candidate ${candidateId}`, { error: err.message });
        errors.push({ candidateId, error: err.message });
      }
    }

    logger.info(`Bulk AI match completed: ${results.length} succeeded, ${errors.length} failed`);
    return { results, errors };
  }

  /**
   * Get the latest screening result for a candidate.
   * @param {number} candidateId
   * @returns {Promise<object|null>}
   */
  async getScreeningResult(candidateId) {
    return await screeningRepository.findLatestByCandidateId(candidateId);
  }

  /**
   * Retry AI matching for an existing screening record.
   * @param {number} screeningId
   * @returns {Promise<object>} new screening result
   */
  async retryAIMatch(screeningId) {
    const existing = await screeningRepository.findById(screeningId);
    if (!existing) {
      throw new Error(`Screening record not found: ${screeningId}`);
    }

    logger.info(`Retrying AI match for screening ${screeningId}, candidate ${existing.candidate_id}`);
    return await this.runAIMatch(existing.candidate_id);
  }
}

module.exports = new ScreeningService();
