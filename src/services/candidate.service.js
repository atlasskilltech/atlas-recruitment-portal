const candidateRepository = require('../repositories/candidate.repository');
const jobRepository = require('../repositories/job.repository');
const screeningRepository = require('../repositories/screening.repository');
const interviewRepository = require('../repositories/interview.repository');
const { buildFileUrl, getFileColumns, getFileLabel } = require('../utils/helpers');
const {
  APPLN_APPLIED_FOR, APPLN_CATEGORY, APPLN_QUALIFIED,
  APPLN_MARITAL_STATUS, APPLN_HIGH_QUALIFICATION,
} = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Candidate Service – business logic for candidate operations
 */
class CandidateService {
  /**
   * Get all candidates with filters, pagination, and latest screening/interview scores.
   * @param {object} filters - search/filter criteria
   * @param {object} pagination - { page, limit, sortBy, sortOrder }
   * @returns {Promise<{ candidates: object[], total: number }>}
   */
  async getAllCandidates(filters = {}, pagination = {}) {
    const [candidates, total] = await Promise.all([
      candidateRepository.findAll(filters, pagination),
      candidateRepository.countAll(filters),
    ]);

    // Attach latest screening and interview scores to each candidate row
    // Map DB column names and resolve numeric IDs to text labels
    const enriched = candidates.map((candidate) => {
      // Resolve job role: prefer applied_for_post > applied_job_short_desc_new
      const jobRole = candidate.applied_for_post
        || candidate.applied_job_short_desc_new
        || null;

      // Resolve department type from appln_applied_for numeric ID
      const deptType = APPLN_APPLIED_FOR[String(candidate.appln_applied_for)] || null;

      return {
        ...candidate,
        // Score mappings
        match_score: candidate.ai_match_score != null ? parseFloat(candidate.ai_match_score) : (candidate.match_score != null ? parseFloat(candidate.match_score) : null),
        overall_score: candidate.total_score != null ? parseFloat(candidate.total_score) : (candidate.overall_score != null ? parseFloat(candidate.overall_score) : null),
        interview_score: candidate.total_score != null ? parseFloat(candidate.total_score) : (candidate.interview_score != null ? parseFloat(candidate.interview_score) : null),
        screening_status: candidate.ai_status || candidate.screening_status || null,
        recommendation_tag: candidate.ai_recommendation_tag || candidate.recommendation_tag || null,
        // Resolved display labels
        job_role_label: jobRole,
        dept_type_label: deptType,
        qualification_label: APPLN_HIGH_QUALIFICATION[String(candidate.appln_high_qualification)] || candidate.appln_high_qualification || null,
        category_label: APPLN_CATEGORY[String(candidate.appln_category)] || null,
        qualified_label: APPLN_QUALIFIED[String(candidate.appln_qualified)] || null,
      };
    });

    return { candidates: enriched, total };
  }

  /**
   * Get a single candidate by ID with full joined data: job, screening, interview, shortlist.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async getCandidateById(id) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) return null;

    // Fetch related records in parallel
    const [screenings, interviews, shortlists] = await Promise.all([
      screeningRepository.findByCandidateId(id),
      interviewRepository.findByCandidateId(id),
      this._getShortlistsForCandidate(id),
    ]);

    const latestScreening = screenings.length > 0 ? screenings[0] : null;
    const latestInterview = interviews.length > 0 ? interviews[0] : null;

    return {
      ...candidate,
      screenings,
      interviews,
      shortlists,
      latestScreening,
      latestInterview,
      files: this.getCandidateDocuments(candidate),
    };
  }

  /**
   * Build file URLs for all file columns that have values on a candidate record.
   * @param {object} candidate - raw candidate row
   * @returns {Array<{ label: string, columnName: string, url: string, fileName: string }>}
   */
  getCandidateDocuments(candidate) {
    if (!candidate) return [];

    const fileColumns = getFileColumns();
    const documents = [];

    for (const col of fileColumns) {
      const fileName = candidate[col];
      if (fileName) {
        documents.push({
          label: getFileLabel(col),
          columnName: col,
          url: buildFileUrl(fileName),
          fileName,
        });
      }
    }

    return documents;
  }

  /**
   * Get dashboard statistics – counts for dashboard cards.
   * @returns {Promise<object>}
   */
  async getDashboardStats() {
    const stats = await candidateRepository.getDashboardStats();
    return stats;
  }

  /**
   * Get applicant status breakdown counts.
   * @returns {Promise<object>}
   */
  async getStatusCounts() {
    const counts = await candidateRepository.getStatusCounts();
    return counts;
  }

  /**
   * Internal: get shortlist records for a candidate (lazy-requires to avoid circular deps).
   * @param {number} candidateId
   * @returns {Promise<object[]>}
   */
  async _getShortlistsForCandidate(candidateId) {
    try {
      const shortlistRepository = require('../repositories/shortlist.repository');
      return await shortlistRepository.findByCandidateId(candidateId);
    } catch (err) {
      logger.error('Error fetching shortlists for candidate', { candidateId, error: err.message });
      return [];
    }
  }
}

module.exports = new CandidateService();
