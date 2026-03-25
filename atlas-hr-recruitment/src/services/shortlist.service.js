const shortlistRepository = require('../repositories/shortlist.repository');
const candidateRepository = require('../repositories/candidate.repository');
const screeningRepository = require('../repositories/screening.repository');
const interviewRepository = require('../repositories/interview.repository');
const auditService = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Shortlist Service – manages HR shortlisting decisions
 */
class ShortlistService {
  /**
   * Create a new shortlist entry for a candidate.
   * @param {number} candidateId
   * @param {number} jobId
   * @param {object} data - { shortlisted_by, remarks, screening_id, interview_id }
   * @returns {Promise<object>} created shortlist record
   */
  async createShortlist(candidateId, jobId, data = {}) {
    // Validate candidate exists
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    // Get latest screening and interview if not provided
    let screeningId = data.screening_id || null;
    let interviewId = data.interview_id || null;

    if (!screeningId) {
      const latestScreening = await screeningRepository.findLatestByCandidateId(candidateId);
      if (latestScreening) screeningId = latestScreening.id;
    }

    if (!interviewId) {
      const interviews = await interviewRepository.findByCandidateId(candidateId);
      if (interviews.length > 0) interviewId = interviews[0].id;
    }

    // Create shortlist record
    const shortlist = await shortlistRepository.create({
      candidate_id: candidateId,
      job_id: jobId,
      screening_id: screeningId,
      interview_id: interviewId,
      shortlisted_by: data.shortlisted_by || null,
      shortlist_status: data.shortlist_status || 'shortlisted',
      remarks: data.remarks || null,
    });

    // Log activity
    await auditService.logActivity({
      candidate_id: candidateId,
      job_id: jobId,
      user_id: data.shortlisted_by || null,
      action_key: 'candidate_shortlisted',
      action_label: `Candidate shortlisted for job`,
      metadata: JSON.stringify({
        shortlist_id: shortlist.id,
        remarks: data.remarks || null,
      }),
    });

    // Log status change
    await auditService.logStatusChange({
      candidate_id: candidateId,
      from_status: candidate.appln_status_new || 'new',
      to_status: 'shortlisted',
      changed_by: data.shortlisted_by || null,
      notes: data.remarks || null,
    });

    logger.info(`Candidate ${candidateId} shortlisted for job ${jobId}: shortlist_id=${shortlist.id}`);

    return shortlist;
  }

  /**
   * Update the HR status of a shortlist entry.
   * @param {number} shortlistId
   * @param {string} status - new status value
   * @param {number|null} userId - user making the change
   * @param {string|null} notes - optional notes
   * @returns {Promise<object>} updated shortlist record
   */
  async updateStatus(shortlistId, status, userId = null, notes = null) {
    const existing = await shortlistRepository.findById(shortlistId);
    if (!existing) {
      throw new Error(`Shortlist record not found: ${shortlistId}`);
    }

    const previousStatus = existing.shortlist_status;

    // Update shortlist
    const updated = await shortlistRepository.update(shortlistId, {
      shortlist_status: status,
      remarks: notes || existing.remarks,
    });

    // Log activity
    await auditService.logActivity({
      candidate_id: existing.candidate_id,
      job_id: existing.job_id,
      user_id: userId,
      action_key: 'shortlist_status_updated',
      action_label: `Shortlist status changed from ${previousStatus} to ${status}`,
      metadata: JSON.stringify({
        shortlist_id: shortlistId,
        from_status: previousStatus,
        to_status: status,
        notes,
      }),
    });

    // Log status change
    await auditService.logStatusChange({
      candidate_id: existing.candidate_id,
      from_status: previousStatus,
      to_status: status,
      changed_by: userId,
      notes,
    });

    logger.info(`Shortlist ${shortlistId} status updated: ${previousStatus} -> ${status}`);

    return updated;
  }

  /**
   * Get shortlisted candidates with filters and pagination.
   * @param {object} filters
   * @param {object} pagination
   * @returns {Promise<{ shortlists: object[], total: number }>}
   */
  async getShortlistCandidates(filters = {}, pagination = {}) {
    const [shortlists, total] = await Promise.all([
      shortlistRepository.findAll(filters, pagination),
      shortlistRepository.countAll(filters),
    ]);

    return { shortlists, total };
  }

  /**
   * Get a single shortlist record by ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async getShortlistById(id) {
    return await shortlistRepository.findById(id);
  }
}

module.exports = new ShortlistService();
