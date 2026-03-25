const { SCORING_WEIGHTS } = require('../../config/constants');

/**
 * Scoring Service -- centralized score calculation and recommendation logic.
 */
class ScoringService {
  /**
   * Calculate a match score (0-100) from structured candidate and job data.
   * Delegates to the JD matcher heuristic when used standalone.
   * @param {object} candidateData - parsed candidate profile
   * @param {object} jobData - { title, description, requirements }
   * @returns {number} 0-100
   */
  calculateMatchScore(candidateData, jobData) {
    const jdMatcher = require('./jdMatcher.service');
    return jdMatcher.calculateHeuristicScore(candidateData, jobData);
  }

  /**
   * Calculate a weighted interview score from individual answer evaluation scores.
   * Uses dimension weights: communication 20%, domain_knowledge 30%, problem_solving 30%, confidence 20%.
   * @param {Array<{ score: number, keyword_relevance_score?: number, quality_score?: number }>} scores
   * @returns {number} 0-100 weighted score
   */
  calculateInterviewScore(scores) {
    if (!scores || scores.length === 0) return 0;

    // Derive dimension estimates from available evaluation data
    const avgKeywordRelevance = this._average(scores.map((s) => s.keyword_relevance_score ?? (s.score / 10) * 100));
    const avgQuality = this._average(scores.map((s) => s.quality_score ?? (s.score / 10) * 100));

    // Map to dimensions (approximation without per-question dimension tagging)
    const communication = avgQuality;                          // quality reflects communication
    const domainKnowledge = avgKeywordRelevance;              // keyword relevance reflects domain knowledge
    const problemSolving = (avgKeywordRelevance + avgQuality) / 2; // blend
    const confidence = avgQuality;                             // quality as proxy for confidence

    const weighted =
      (Math.min(100, communication) * SCORING_WEIGHTS.COMMUNICATION) +
      (Math.min(100, domainKnowledge) * SCORING_WEIGHTS.DOMAIN_KNOWLEDGE) +
      (Math.min(100, problemSolving) * SCORING_WEIGHTS.PROBLEM_SOLVING) +
      (Math.min(100, confidence) * SCORING_WEIGHTS.CONFIDENCE);

    return Math.round(weighted * 10) / 10;
  }

  /**
   * Calculate a final recommendation score combining match, interview, and HR scores.
   * Formula: 40% match + 40% interview + 20% HR
   * @param {number} matchScore - AI/heuristic match score (0-100)
   * @param {number} interviewScore - interview score (0-100)
   * @param {number} hrScore - HR manual score (0-100), defaults to 50 if not provided
   * @returns {number} 0-100
   */
  calculateFinalRecommendation(matchScore, interviewScore, hrScore = 50) {
    const ms = this._clamp(matchScore);
    const is = this._clamp(interviewScore);
    const hs = this._clamp(hrScore);

    const final = (ms * 0.40) + (is * 0.40) + (hs * 0.20);
    return Math.round(final * 10) / 10;
  }

  /**
   * Get a recommendation tag based on a score.
   * - strong_fit: score >= 75
   * - moderate_fit: 50 <= score < 75
   * - weak_fit: score < 50
   * @param {number} score
   * @returns {string}
   */
  getRecommendationTag(score) {
    const s = parseFloat(score) || 0;
    if (s >= 75) return 'strong_fit';
    if (s >= 50) return 'moderate_fit';
    return 'weak_fit';
  }

  /**
   * Get an AI screening status based on a match score.
   * - eligible: score >= 50
   * - hold: 30 <= score < 50
   * - rejected: score < 30
   * @param {number} score
   * @returns {string}
   */
  getAIStatus(score) {
    const s = parseFloat(score) || 0;
    if (s >= 50) return 'eligible';
    if (s >= 30) return 'hold';
    return 'rejected';
  }

  // --- Private helpers ---

  _average(nums) {
    if (!nums || nums.length === 0) return 0;
    const sum = nums.reduce((a, b) => a + (b || 0), 0);
    return sum / nums.length;
  }

  _clamp(value, min = 0, max = 100) {
    const num = parseFloat(value) || 0;
    return Math.min(max, Math.max(min, num));
  }
}

module.exports = new ScoringService();
