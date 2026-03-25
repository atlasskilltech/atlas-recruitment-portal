const auditRepository = require('../repositories/audit.repository');
const logger = require('../utils/logger');

/**
 * Audit Service -- activity logging and status history tracking
 */
class AuditService {
  /**
   * Create an activity log entry.
   * @param {object} data - { candidate_id, job_id, user_id, action_key, action_label, metadata, ip_address, user_agent }
   * @returns {Promise<object>} created log entry
   */
  async logActivity(data) {
    try {
      const entry = await auditRepository.create({
        candidate_id: data.candidate_id || null,
        user_id: data.user_id || null,
        action: data.action_key || data.action || 'unknown',
        entity_type: data.entity_type || 'candidate',
        entity_id: data.entity_id || data.candidate_id || null,
        old_value: data.old_value || null,
        new_value: data.new_value || (data.metadata ? { action_label: data.action_label, metadata: data.metadata } : null),
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null,
      });

      logger.debug(`Activity logged: ${data.action_key || data.action}`, {
        candidate_id: data.candidate_id,
        job_id: data.job_id,
      });

      return entry;
    } catch (err) {
      logger.error('Failed to log activity', { error: err.message, data });
      // Do not throw -- audit failures should not break business logic
      return null;
    }
  }

  /**
   * Create a status history entry recording a status transition.
   * @param {object} data - { candidate_id, from_status, to_status, changed_by, notes }
   * @returns {Promise<object>} created status history entry
   */
  async logStatusChange(data) {
    try {
      const entry = await auditRepository.createStatusHistory({
        candidate_id: data.candidate_id,
        status_type: data.status_type || 'hr_status',
        old_status: data.from_status || data.old_status || null,
        new_status: data.to_status || data.new_status,
        changed_by: data.changed_by || data.user_id || null,
        reason: data.notes || data.reason || null,
      });

      logger.debug(`Status change logged: ${data.from_status} -> ${data.to_status}`, {
        candidate_id: data.candidate_id,
      });

      return entry;
    } catch (err) {
      logger.error('Failed to log status change', { error: err.message, data });
      return null;
    }
  }

  /**
   * Get the full timeline for a candidate: activity logs + status history merged and sorted by date.
   * @param {number} candidateId
   * @returns {Promise<object[]>} sorted timeline entries
   */
  async getCandidateTimeline(candidateId) {
    const [activityLogs, statusHistory] = await Promise.all([
      auditRepository.findByCandidateId(candidateId),
      auditRepository.getStatusHistory(candidateId),
    ]);

    // Normalize entries into a common shape
    const timeline = [];

    for (const log of activityLogs) {
      timeline.push({
        type: 'activity',
        id: log.id,
        action: log.action,
        description: log.new_value
          ? (typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value))
          : log.action,
        user_id: log.user_id,
        ip_address: log.ip_address,
        date: log.created_at,
        raw: log,
      });
    }

    for (const sh of statusHistory) {
      timeline.push({
        type: 'status_change',
        id: sh.id,
        action: `status_change:${sh.status_type}`,
        description: `${sh.old_status || 'none'} -> ${sh.new_status}`,
        user_id: sh.changed_by,
        reason: sh.reason,
        date: sh.created_at,
        raw: sh,
      });
    }

    // Sort by date descending (most recent first)
    timeline.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    return timeline;
  }

  /**
   * Get the most recent activity across all candidates.
   * @param {number} limit - max entries to return (default 20)
   * @returns {Promise<object[]>}
   */
  async getRecentActivity(limit = 20) {
    const logs = await auditRepository.findAll({}, { page: 1, limit });
    return logs;
  }
}

module.exports = new AuditService();
