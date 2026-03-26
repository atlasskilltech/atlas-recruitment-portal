const { callAI } = require('./aiProvider.service');
const resumeParser = require('./resumeParser.service');
const { getMatchScoringPrompt } = require('../../utils/promptTemplates');
const logger = require('../../utils/logger');
const axios = require('axios');

/**
 * JD Matcher Service -- matches a candidate profile against a job description
 * using AI when available, with a heuristic fallback.
 */
class JDMatcherService {
  /**
   * Try to fetch CV text content from the upload URL.
   * Returns the text content or null if unavailable.
   * @param {string} cvFileName - filename from appln_cv column
   * @returns {Promise<string|null>}
   */
  async _fetchCVContent(cvFileName) {
    if (!cvFileName) return null;

    const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
    if (!baseUrl) return null;

    const cvUrl = `${baseUrl}/${cvFileName}`;
    try {
      const response = await axios.get(cvUrl, {
        timeout: 15000,
        responseType: 'text',
        maxContentLength: 5 * 1024 * 1024, // 5MB max
        headers: { 'Accept': 'text/plain, text/html, application/pdf, */*' },
      });

      if (response.data && typeof response.data === 'string' && response.data.length > 50) {
        logger.info(`[JD_MATCHER] CV content fetched for file: ${cvFileName} (${response.data.length} chars)`);
        // Truncate to a reasonable size for AI prompt
        return response.data.substring(0, 8000);
      }
      return null;
    } catch (err) {
      logger.warn(`[JD_MATCHER] Could not fetch CV content for ${cvFileName}: ${err.message}`);
      return null;
    }
  }

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

    // Try to fetch actual CV content
    const cvText = await this._fetchCVContent(candidate.appln_cv);
    if (cvText) {
      candidateData.resumeText = cvText;
    }

    // Always try AI-based matching first via callAI (handles provider selection + mock fallback)
    try {
      const prompt = getMatchScoringPrompt(candidateData, jobData);
      const aiResult = await callAI(prompt, { temperature: 0.2 });

      if (aiResult && aiResult.overallScore != null) {
        logger.info(`[JD_MATCHER] AI match score for candidate: ${aiResult.overallScore}`);
        return {
          score: Math.round(aiResult.overallScore * 10) / 10,
          extractedSkills: aiResult.skillsAnalysis?.matched || aiResult.breakdown?.skillsMatch?.justification ? this._extractSkillsFromAI(aiResult) : [],
          extractedKeywords: this._extractKeywordsFromAI(aiResult),
          educationSummary: aiResult.breakdown?.educationFit?.justification || aiResult.educationFit || '',
          experienceSummary: aiResult.breakdown?.experienceRelevance?.justification || aiResult.experienceRelevance || '',
          skillGapAnalysis: JSON.stringify(aiResult.skillsAnalysis || aiResult.breakdown || null),
          summary: aiResult.summary || '',
          recommendationTag: this._getRecommendationTag(aiResult.overallScore),
          breakdown: aiResult.breakdown || null,
          recommendation: aiResult.recommendation || null,
          strengths: aiResult.keyStrengths || [],
          weaknesses: aiResult.keyWeaknesses || [],
          provider: this._detectProvider(),
          model: this._detectModel(),
          rawResponse: aiResult,
        };
      }
    } catch (err) {
      logger.warn(`[JD_MATCHER] AI matching failed, falling back to heuristic: ${err.message}`);
    }

    // Heuristic fallback — use CV text + structured fields
    const score = this.calculateHeuristicScore(candidateData, jobData);
    const gapAnalysis = this.generateSkillGapAnalysis(candidateData, jobData);
    const summary = this.generateRoleFitSummary(candidateData, jobData, score);

    return {
      score,
      extractedSkills: [
        ...(candidateData.skills?.technical || []),
        ...(candidateData.skills?.domain || []),
        ...(candidateData.skills?.inferred || []),
      ],
      extractedKeywords: this._extractKeywords(
        `${candidateData.specialization || ''} ${candidateData.highestQualification || ''}`
      ),
      educationSummary: `Highest qualification: ${candidateData.highestQualification || 'Not specified'}.`,
      experienceSummary: `Total experience: ${candidateData.currentRole?.totalExperience || 0} years.`,
      skillGapAnalysis: JSON.stringify(gapAnalysis),
      summary,
      recommendationTag: this._getRecommendationTag(score),
      breakdown: null,
      recommendation: score >= 75 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : score >= 30 ? 'Maybe' : 'Not Recommended',
      strengths: gapAnalysis.matched || [],
      weaknesses: gapAnalysis.missing || [],
      provider: 'heuristic',
      model: 'deterministic-v1',
      rawResponse: null,
    };
  }

  /**
   * Heuristic scoring when no AI API key is configured.
   * Breakdown: Qualification 30pts, Specialization 25pts, Experience 20pts, Research 15pts, Role 10pts.
   * Also uses CV text keywords when structured fields are empty.
   * @param {object} candidateData - parsed candidate profile
   * @param {object} jobData - { title, description, requirements }
   * @returns {number} score 0-100
   */
  calculateHeuristicScore(candidateData, jobData) {
    let score = 0;

    // --- Qualification match (30 points) ---
    const qual = (candidateData.highestQualification || '').toLowerCase();
    const cvText = (candidateData.resumeText || '').toLowerCase();

    // Check structured field first, then CV text
    const qualSource = qual || cvText;
    if (qualSource.includes('phd') || qualSource.includes('doctorate') || qualSource.includes('ph.d')) {
      score += 30;
    } else if (qualSource.includes('post') || qualSource.includes('master') || qualSource.includes('m.tech') || qualSource.includes('mba') || qualSource.includes('m.sc') || qualSource.includes('m.e.') || qualSource.includes('mca')) {
      score += 20;
    } else if (qualSource.includes('b.tech') || qualSource.includes('b.e.') || qualSource.includes('bachelor') || qualSource.includes('b.sc') || qualSource.includes('bca') || qualSource.includes('b.com') || qualSource.includes('b.a.')) {
      score += 10;
    } else if (qualSource.includes('diploma') || qualSource.includes('certificate') || qualSource.includes('12th') || qualSource.includes('hsc')) {
      score += 5;
    }

    // --- Specialization keyword match (25 points) ---
    const specText = candidateData.specialization || '';
    // Also include CV text keywords for better matching
    const combinedCandidateText = `${specText} ${candidateData.resumeText || ''} ${candidateData.currentRole?.designation || ''}`;
    const specKeywords = this._extractKeywords(combinedCandidateText);
    const jobKeywords = this._extractKeywords(
      `${jobData.title || ''} ${jobData.description || ''} ${jobData.requirements || ''}`
    );

    if (specKeywords.length > 0 && jobKeywords.length > 0) {
      const matched = specKeywords.filter((sk) =>
        jobKeywords.some((jk) => jk.includes(sk) || sk.includes(jk))
      );
      // Use min of both lengths for ratio to avoid penalizing candidates with more keywords
      const matchRatio = matched.length / Math.max(Math.min(specKeywords.length, jobKeywords.length), 1);
      score += Math.round(Math.min(1, matchRatio) * 25);
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
    } else if (cvText) {
      // Try to infer experience from CV text
      const expMatch = cvText.match(/(\d+)\s*(?:\+\s*)?(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
      if (expMatch) {
        const years = parseInt(expMatch[1], 10);
        if (years >= 15) score += 20;
        else if (years >= 10) score += 16;
        else if (years >= 5) score += 12;
        else if (years >= 2) score += 8;
        else if (years > 0) score += 4;
      }
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

    // Also extract keywords from CV text if available
    if (candidateData.resumeText) {
      const cvKeywords = this._extractKeywords(candidateData.resumeText);
      candidateSkills.push(...cvKeywords);
    }

    const uniqueSkills = [...new Set(candidateSkills)];

    const jobKeywords = this._extractKeywords(
      `${jobData.title || ''} ${jobData.description || ''} ${jobData.requirements || ''}`
    );

    const matched = [];
    const missing = [];
    const additional = [];

    for (const jk of jobKeywords) {
      if (uniqueSkills.some((cs) => cs.includes(jk) || jk.includes(cs))) {
        matched.push(jk);
      } else {
        missing.push(jk);
      }
    }

    for (const cs of uniqueSkills) {
      if (!jobKeywords.some((jk) => jk.includes(cs) || cs.includes(jk))) {
        additional.push(cs);
      }
    }

    return {
      matched: [...new Set(matched)],
      missing: [...new Set(missing)],
      additional: [...new Set(additional)].slice(0, 20), // Limit additional skills
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

  _getRecommendationTag(score) {
    const s = parseFloat(score) || 0;
    if (s >= 75) return 'strong_fit';
    if (s >= 50) return 'moderate_fit';
    return 'weak_fit';
  }

  _detectProvider() {
    const explicit = (process.env.AI_PROVIDER || '').toLowerCase();
    if (explicit && explicit !== 'mock') return explicit;
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.AZURE_OPENAI_API_KEY) return 'azure';
    if (process.env.OPENROUTER_API_KEY) return 'openrouter';
    return 'mock';
  }

  _detectModel() {
    const explicit = (process.env.AI_PROVIDER || '').toLowerCase();
    if (explicit === 'openai' || process.env.OPENAI_API_KEY) return process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    if (explicit === 'azure' || process.env.AZURE_OPENAI_API_KEY) return process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
    if (explicit === 'openrouter' || process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
    return 'mock-v1';
  }

  _extractSkillsFromAI(aiResult) {
    const skills = [];
    if (aiResult.skillsAnalysis?.matched) skills.push(...aiResult.skillsAnalysis.matched);
    if (aiResult.skillsAnalysis?.additional) skills.push(...aiResult.skillsAnalysis.additional);
    return [...new Set(skills)];
  }

  _extractKeywordsFromAI(aiResult) {
    const keywords = [];
    if (aiResult.keyStrengths) keywords.push(...aiResult.keyStrengths);
    if (aiResult.skillsAnalysis?.matched) keywords.push(...aiResult.skillsAnalysis.matched);
    return [...new Set(keywords)].slice(0, 20);
  }

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
