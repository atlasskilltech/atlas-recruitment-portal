// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Job-Candidate Matching Service
// ---------------------------------------------------------------------------
// Scans candidates against a job's JD and stores match scores.
// Used for "Top 20 Matching Candidates per Job Role" feature.
// ---------------------------------------------------------------------------
const pool = require('../config/db');
const { callAI } = require('./ai/aiProvider.service');
const logger = require('../utils/logger');

class JobMatchingService {
  /**
   * Scan all recent candidates against a specific job's JD.
   * Uses heuristic keyword matching (fast) + optional AI deep scoring.
   * Results stored in atlas_rec_job_candidate_matches table.
   *
   * @param {number} jobId - isdi_admsn_applied_for.id
   * @param {object} options - { limit, useAI, forceRefresh }
   * @returns {Promise<{ scanned: number, matched: number }>}
   */
  async scanCandidatesForJob(jobId, options = {}) {
    const { limit = 200, useAI = false, forceRefresh = false } = options;

    // 1. Get the job with its JD
    const [[job]] = await pool.query(
      'SELECT * FROM isdi_admsn_applied_for WHERE id = ?', [jobId]
    );
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const jdText = [
      job.applied_for_post || '',
      job.applied_job_short_desc_new || '',
      job.applied_job_desc || '',
    ].join(' ').trim();

    if (!jdText || jdText.length < 10) {
      logger.warn(`[JOB_MATCH] Job ${jobId} has no JD content, skipping`);
      return { scanned: 0, matched: 0 };
    }

    const jdKeywords = this._extractKeywords(jdText);
    logger.info(`[JOB_MATCH] Scanning job ${jobId} (${job.applied_for_post}): ${jdKeywords.length} JD keywords`);

    // 2. Get candidates — either all or only those not yet scanned for this job
    let candidateQuery;
    let queryParams;

    if (forceRefresh) {
      // Re-scan all recent candidates
      candidateQuery = `
        SELECT id, appln_full_name, appln_high_qualification, appln_specialization,
               appln_total_experience, appln_current_designation, appln_current_organisation
        FROM dice_staff_recruitment
        WHERE appln_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
        ORDER BY appln_date DESC
        LIMIT ?
      `;
      queryParams = [limit];
    } else {
      // Only scan candidates not yet matched for this job
      candidateQuery = `
        SELECT dsr.id, dsr.appln_full_name, dsr.appln_high_qualification, dsr.appln_specialization,
               dsr.appln_total_experience, dsr.appln_current_designation, dsr.appln_current_organisation
        FROM dice_staff_recruitment dsr
        LEFT JOIN atlas_rec_job_candidate_matches m ON m.candidate_id = dsr.id AND m.job_id = ?
        WHERE m.id IS NULL
          AND dsr.appln_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
        ORDER BY dsr.appln_date DESC
        LIMIT ?
      `;
      queryParams = [jobId, limit];
    }

    const [candidates] = await pool.query(candidateQuery, queryParams);
    logger.info(`[JOB_MATCH] Found ${candidates.length} candidates to scan for job ${jobId}`);

    let matched = 0;

    for (const candidate of candidates) {
      try {
        // Build candidate profile text
        const candidateText = [
          candidate.appln_specialization || '',
          candidate.appln_high_qualification || '',
          candidate.appln_current_designation || '',
          candidate.appln_current_organisation || '',
        ].join(' ').trim();

        const candidateKeywords = this._extractKeywords(candidateText);

        // Heuristic keyword match score
        const score = this._calculateMatchScore(candidateKeywords, jdKeywords, candidate);
        const status = score >= 75 ? 'strong_fit' : score >= 50 ? 'moderate_fit' : 'weak_fit';

        // Find matched and missing skills
        const skillsMatched = candidateKeywords.filter(ck =>
          jdKeywords.some(jk => jk.includes(ck) || ck.includes(jk))
        );
        const skillsMissing = jdKeywords.filter(jk =>
          !candidateKeywords.some(ck => ck.includes(jk) || jk.includes(ck))
        ).slice(0, 10);

        const summary = `${candidate.appln_full_name || 'Candidate'} has ${score}% match. ` +
          `${skillsMatched.length} skills matched, ${skillsMissing.length} gaps identified.`;

        // Upsert match record
        await pool.query(`
          INSERT INTO atlas_rec_job_candidate_matches
          (job_id, candidate_id, match_score, match_status, skills_matched, skills_missing, match_summary, ai_provider, scanned_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'heuristic', NOW())
          ON DUPLICATE KEY UPDATE
            match_score = VALUES(match_score),
            match_status = VALUES(match_status),
            skills_matched = VALUES(skills_matched),
            skills_missing = VALUES(skills_missing),
            match_summary = VALUES(match_summary),
            ai_provider = VALUES(ai_provider),
            scanned_at = NOW()
        `, [
          jobId,
          candidate.id,
          score,
          status,
          JSON.stringify([...new Set(skillsMatched)].slice(0, 20)),
          JSON.stringify([...new Set(skillsMissing)].slice(0, 10)),
          summary,
        ]);

        if (score > 0) matched++;
      } catch (err) {
        logger.warn(`[JOB_MATCH] Error scanning candidate ${candidate.id}: ${err.message}`);
      }
    }

    logger.info(`[JOB_MATCH] Scan complete for job ${jobId}: ${candidates.length} scanned, ${matched} matched`);
    return { scanned: candidates.length, matched };
  }

  /**
   * Get top N candidates for a job from the matches table.
   */
  async getTopMatches(jobId, limit = 20) {
    const [rows] = await pool.query(`
      SELECT m.*,
        dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
        dsr.appln_high_qualification, dsr.appln_specialization,
        dsr.appln_total_experience, dsr.appln_current_designation,
        dsr.appln_current_organisation, dsr.appln_cv,
        ais.ai_match_score AS screening_score, ais.ai_status AS screening_status,
        aint.total_score AS interview_score, aint.status AS interview_status
      FROM atlas_rec_job_candidate_matches m
      LEFT JOIN dice_staff_recruitment dsr ON m.candidate_id = dsr.id
      LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
        AND ais.id = (SELECT MAX(s.id) FROM atlas_rec_candidate_ai_screening s WHERE s.candidate_id = dsr.id)
      LEFT JOIN atlas_rec_ai_interviews aint ON aint.candidate_id = dsr.id
        AND aint.id = (SELECT MAX(i.id) FROM atlas_rec_ai_interviews i WHERE i.candidate_id = dsr.id)
      WHERE m.job_id = ? AND m.match_score > 0
      ORDER BY m.match_score DESC
      LIMIT ?
    `, [jobId, limit]);

    return rows;
  }

  /**
   * Get match stats for a job.
   */
  async getMatchStats(jobId) {
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_scanned,
        SUM(CASE WHEN match_score > 0 THEN 1 ELSE 0 END) AS total_matched,
        SUM(CASE WHEN match_status = 'strong_fit' THEN 1 ELSE 0 END) AS strong_fit,
        SUM(CASE WHEN match_status = 'moderate_fit' THEN 1 ELSE 0 END) AS moderate_fit,
        SUM(CASE WHEN match_status = 'weak_fit' THEN 1 ELSE 0 END) AS weak_fit,
        ROUND(AVG(CASE WHEN match_score > 0 THEN match_score END), 1) AS avg_score,
        MAX(scanned_at) AS last_scanned
      FROM atlas_rec_job_candidate_matches
      WHERE job_id = ?
    `, [jobId]);
    return stats || {};
  }

  // --- Private helpers ---

  _calculateMatchScore(candidateKeywords, jdKeywords, candidate) {
    let score = 0;

    // Keyword match (40 points)
    if (candidateKeywords.length > 0 && jdKeywords.length > 0) {
      const matched = candidateKeywords.filter(ck =>
        jdKeywords.some(jk => jk.includes(ck) || ck.includes(jk))
      );
      const ratio = matched.length / Math.max(Math.min(candidateKeywords.length, jdKeywords.length), 1);
      score += Math.round(Math.min(1, ratio) * 40);
    }

    // Qualification (25 points)
    const qual = String(candidate.appln_high_qualification || '').toLowerCase();
    if (qual.includes('phd') || qual === '1') score += 25;
    else if (qual.includes('master') || qual === '2') score += 18;
    else if (qual.includes('bachelor') || qual === '3') score += 12;
    else if (qual === '4') score += 8;

    // Experience (20 points)
    const exp = parseFloat(candidate.appln_total_experience) || 0;
    if (exp >= 15) score += 20;
    else if (exp >= 10) score += 16;
    else if (exp >= 5) score += 12;
    else if (exp >= 2) score += 8;
    else if (exp > 0) score += 4;

    // Role relevance (15 points)
    const designation = (candidate.appln_current_designation || '').toLowerCase();
    const jdTitle = jdKeywords.slice(0, 5).join(' ');
    const designWords = this._extractKeywords(designation);
    const titleOverlap = designWords.filter(d => jdTitle.includes(d) || d.includes(jdTitle.split(' ')[0]));
    score += Math.min(15, titleOverlap.length * 5);

    return Math.min(100, Math.max(0, score));
  }

  _extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set([
      'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
      'is','are','was','were','be','been','have','has','had','do','does','did',
      'will','would','could','should','may','might','not','no','so','if','then',
      'than','that','this','it','its','from','up','out','as','into','through',
      'during','before','after','above','below','between','all','any','both',
      'each','every','more','most','other','some','such','very','just','also',
    ]);
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }
}

module.exports = new JobMatchingService();
