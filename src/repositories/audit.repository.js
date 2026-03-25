const pool = require('../config/db');

class AuditRepository {
  /**
   * Create a new activity log entry
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_activity_logs
        (candidate_id, user_id, action, entity_type, entity_id,
         old_value, new_value, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.candidate_id || null,
        data.user_id || null,
        data.action,
        data.entity_type || null,
        data.entity_id || null,
        data.old_value ? JSON.stringify(data.old_value) : null,
        data.new_value ? JSON.stringify(data.new_value) : null,
        data.ip_address || null,
        data.user_agent || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`AuditRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Build filter clause for activity log queries
   */
  _buildFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.candidate_id) {
      conditions.push('candidate_id = ?');
      params.push(filters.candidate_id);
    }

    if (filters.user_id) {
      conditions.push('user_id = ?');
      params.push(filters.user_id);
    }

    if (filters.action) {
      conditions.push('action = ?');
      params.push(filters.action);
    }

    if (filters.entity_type) {
      conditions.push('entity_type = ?');
      params.push(filters.entity_type);
    }

    if (filters.entity_id) {
      conditions.push('entity_id = ?');
      params.push(filters.entity_id);
    }

    if (filters.date_from) {
      conditions.push('created_at >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('created_at <= ?');
      params.push(filters.date_to);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    return { whereClause, params };
  }

  /**
   * Find all activity logs with filters and pagination
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        SELECT *
        FROM atlas_rec_activity_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`AuditRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Find activity logs by candidate ID
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_activity_logs
        WHERE candidate_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`AuditRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Create a status history entry
   */
  async createStatusHistory(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_status_history
        (candidate_id, status_type, old_status, new_status,
         changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.candidate_id,
        data.status_type || 'hr_status',
        data.old_status || null,
        data.new_status,
        data.changed_by || null,
        data.reason || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`AuditRepository.createStatusHistory failed: ${error.message}`);
    }
  }

  /**
   * Get status history for a candidate
   */
  async getStatusHistory(candidateId) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_status_history
        WHERE candidate_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`AuditRepository.getStatusHistory failed: ${error.message}`);
    }
  }
}

module.exports = new AuditRepository();
