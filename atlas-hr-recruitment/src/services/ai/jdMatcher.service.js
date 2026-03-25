const { callAI } = require('./aiProvider.service');
const resumeParser = require('./resumeParser.service');
const { getJDMatchPrompt, getMatchScoringPrompt } = require('../../utils/promptTemplates');
const logger = require('../../utils/logger');

/**
 * JD Matcher Service -- matches a candidate profile against a job description
 * using AI when available, with a heuristic fallback.
 */
class JDMatcherService {
  /**
   * Full matching logic: parse candidate, call AI (or fallback), return structured result.
   * @param {object} candidate - raw candidate row
   * @param {object} job - job row from isdi_admsn_applied_for
   * @returns {Promise<{ score: number, skillsAnalysis: object, experienceAnalysis: string, qualificationAnalysis: string, summary: string }>}
   */
  async matchCandidateToJob(candidate, job) {
    const candidateData = resumeParser.parseCandidate(candidate);
    const jobData = {
      title: job.applied_job_short_desc_new || '',
      description: job.applied_job_desc || '',
      requirements: job.applied_job_requirements || job.applied_job_desc || '',
      department: job.applied_for_post_id || '',
      location: job.applied_location || '',
    };

    // Try AI-based matching first
    const hasAIKey = !!(
      process.env.OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );

    if (hasAIKey) {
      try {
        const prompt = getMatchScoringPrompt(candidateData, jobData);
        const aiResult = await callAI(prompt, { temperature: 0.2 });

        if (aiResult && aiResult.overallScore != null) {
          return {
            score: Math.round(aiResult.overallScore * 10) / 10,
            skillsAnalysis: aiResult.breakdown?.skillsMatch || aiResult.skillsAnalysis || null,
            experienceAnalysis: aiResult.breakdown?.experienceRelevance?.justification || aiResult.experienceRelevance || '',
            qualificationAnalysis: aiResult.breakdown?.educationFit?.justification || aiResult.educationFit || '',
            summary: aiResult.summary || '',
            breakdown: aiResult.breakdown || null,
            recommendation: aiResult.recommendation || null,
            strengths: aiResult.keyStrengths || [],
            weaknesses: aiResult.keyWeaknesses || [],
            source: 'ai',
          };
        }
      } catch (err) {
        logger.warn('AI matching failed, falling back to heuristic', { error: err.message });
      }
    }

    // Heuristic fallback
    const score = this.calculateHeuristicScore(candidateData, jobData);
    const gapAnalysis = this.generateSkillGapAnalysis(candidateData, jobData);
    const summary = this.generateRoleFitSummary(candidateData, jobData, score);

    return {
      score,
      skillsAnalysis: gapAnalysis,
      experienceAnalysis: `Total experience: ${candidateData.currentRole?.totalExperience || 0} years.`,
      qualificationAnalysis: `Highest qualification: ${candidateData.highestQualification || 'Not specified'}.`,
      summary,
      breakdown: null,
      recommendation: score >= 75 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : score >= 30 ? 'Maybe' : 'Not Recommended',
      strengths: gapAnalysis.matched || [],
      weaknesses: gapAnalysis.missing || [],
      source: 'heuristic',
    };
  }

  /**
   * Heuristic scoring when no AI API key is configured.
   * Breakdown: Qualification 30pts, Specialization 25pts, Experience 20pts, Research 15pts, Role 10pts.
   * @param {object} candidateData - parsed candidate profile
   * @param {object} jobData - { title, description, requirements }
   * @returns {number} score 0-100
   */
  calculateHeuristicScore(candidateData, jobData) {
    let score = 0;

    // --- Qualification match (30 points) ---
    const qual = (candidateData.highestQualification || '').toLowerCase();
    if (qual.includes('phd') || qual.includes('doctorate') || qual.includes('ph.d')) {
      score += 30;
    } else if (qual.includes('post') || qual.includes('master') || qual.includes('m.tech') || qual.includes('mba') || qual.includes('m.sc') || qual.includes('m.e.')) {
      score += 20;
    } else if (qual.includes('b.tech') || qual.includes('b.e.') || qual.includes('bachelor') || qual.includes('b.sc') || qual.includes('bca')) {
      score += 10;
    }

    // --- Specialization keyword match (25 points) ---
    const specKeywords = this._extractKeywords(candidateData.specialization || '');
    const jobKeywords = this._extractKeywords(
      `${jobData.title || ''} ${jobData.description || ''} ${jobData.requirements || ''}`
    );

    if (specKeywords.length > 0 && jobKeywords.length > 0) {
      const matched = specKeywords.filter((sk) =>
        jobKeywords.some((jk) => jk.includes(sk) || sk.includes(jk))
      );
      const matchRatio = matched.length / Math.max(specKeywords.length, 1);
      score += Math.round(matchRatio * 25);
    }

    // --- Experience score (20 points) ---
    const totalExp = candidateData.currentRole?.totalExperience || 0;
    if (totalExp >= 15) {
      score += 20;
    } else if (totalExp >= 10) {
      score += 16;
    } else if (totalExp >= 5) {
      score += 12;
    } else if (totalExp >= 2) {
      score += 8;
    } else if (totalExp > 0) {
      score += 4;
    }

    // --- Research score (15 points) ---
    const research = candidateData.research || {};
    const journals = research.journalPapers || 0;
    const books = research.books || 0;
    const patents = research.patents || 0;
    const researchItems = journals + books + patents;

    if (researchItems >= 20) {
      score += 15;
    } else if (researchItems >= 10) {
      score += 12;
    } else if (researchItems >= 5) {
      score += 8;
    } else if (researchItems >= 1) {
      score += 4;
    }

    // --- Current role relevance (10 points) ---
    const designation = (candidateData.currentRole?.designation || '').toLowerCase();
    const jobTitle = (jobData.title || '').toLowerCase();

    if (designation && jobTitle) {
      const designationWords = this._extractKeywords(designation);
      const titleWords = this._extractKeywords(jobTitle);
      const overlap = designationWords.filter((dw) =>
        titleWords.some((tw) => tw.includes(dw) || dw.includes(tw))
      );
      if (overlap.length > 0) {
        score += Math.min(10, overlap.length * 5);
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate a skill gap analysis comparing candidate skills against job requirements.
   * @param {object} candidateData
   * @param {object} jobData
   * @returns {{ matched: string[], missing: string[], additional: string[] }}
   */
  generateSkillGapAnalysis(candidateData, jobData) {
    const candidateSkills = [
      ...(candidateData.skills?.technical || []),
      ...(candidateData.skills?.domain || []),
      ...(candidateData.skills?.inferred || []),
    ].map((s) => s.toLowerCase().trim()).filter(Boolean);

    const jobKeywords = this._extractKeywords(
      `${jobData.title || ''} ${jobData.description || ''} ${jobData.requirements || ''}`
    );

    const matched = [];
    const missing = [];
    const additional = [];

    for (const jk of jobKeywords) {
      if (candidateSkills.some((cs) => cs.includes(jk) || jk.includes(cs))) {
        matched.push(jk);
      } else {
        missing.push(jk);
      }
    }

    for (const cs of candidateSkills) {
      if (!jobKeywords.some((jk) => jk.includes(cs) || cs.includes(jk))) {
        additional.push(cs);
      }
    }

    return {
      matched: [...new Set(matched)],
      missing: [...new Set(missing)],
      additional: [...new Set(additional)],
    };
  }

  /**
   * Generate a human-readable role-fit summary.
   * @param {object} candidateData
   * @param {object} jobData
   * @param {number} score
   * @returns {string}
   */
  generateRoleFitSummary(candidateData, jobData, score) {
    const name = candidateData.personal?.name || 'The candidate';
    const qual = candidateData.highestQualification || 'unspecified qualification';
    const exp = candidateData.currentRole?.totalExperience || 0;
    const jobTitle = jobData.title || 'the position';

    let fitLevel;
    if (score >= 75) fitLevel = 'a strong fit';
    else if (score >= 50) fitLevel = 'a moderate fit';
    else if (score >= 30) fitLevel = 'a potential fit with gaps';
    else fitLevel = 'a weak fit';

    const research = candidateData.research || {};
    const researchNote = (research.journalPapers || 0) > 0
      ? ` They have published ${research.journalPapers} journal paper(s).`
      : '';

    return `${name} holds a ${qual} with ${exp} year(s) of experience and is ${fitLevel} for ${jobTitle} (score: ${score}/100).${researchNote}`;
  }

  // --- Private helpers ---

  /**
   * Extract meaningful keywords from a text string.
   */
  _extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'must', 'not', 'no', 'nor',
      'so', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'it',
      'its', 'from', 'up', 'out', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'same', 'each', 'every', 'all',
      'any', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
      'own', 'very', 'just', 'also', 'about', 'over', 'under', 'again',
      'further', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
      'what', 'which', 'who', 'whom', 'we', 'they', 'you', 'he', 'she',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }
}

module.exports = new JDMatcherService();
