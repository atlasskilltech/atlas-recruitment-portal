const pool = require('../config/db');

class NotificationRepository {
  /**
   * Create a new notification
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_notifications
        (candidate_id, channel, template_key, recipient, subject, message, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.candidate_id || null,
        data.channel || 'email',
        data.template_key || data.type || null,
        data.recipient_email || data.recipient || null,
        data.title || data.subject || null,
        data.message,
        data.status || 'queued',
        data.sent_at || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`NotificationRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Build filter clause for notification queries
   */
  _buildFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.candidate_id) {
      conditions.push('candidate_id = ?');
      params.push(filters.candidate_id);
    }

    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (filters.channel) {
      conditions.push('channel = ?');
      params.push(filters.channel);
    }

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
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
   * Find all notifications with filters and pagination
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        SELECT *
        FROM atlas_rec_notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`NotificationRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Find notifications by candidate ID
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_notifications
        WHERE candidate_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`NotificationRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Update a notification
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      const allowedFields = [
        'status', 'sent_at', 'provider_response',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(data[field]);
        }
      }

      if (fields.length === 0) {
        const [rows] = await pool.query(
          'SELECT * FROM atlas_rec_notifications WHERE id = ?', [id]
        );
        return rows.length > 0 ? rows[0] : null;
      }

      fields.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE atlas_rec_notifications
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);

      const [rows] = await pool.query(
        'SELECT * FROM atlas_rec_notifications WHERE id = ?', [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`NotificationRepository.update failed: ${error.message}`);
    }
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(limit = 10) {
    try {
      const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

      const sql = `
        SELECT n.*,
          dsr.appln_full_name
        FROM atlas_rec_notifications n
        LEFT JOIN dice_staff_recruitment dsr ON n.candidate_id = dsr.id
        ORDER BY n.created_at DESC
        LIMIT ?
      `;

      const [rows] = await pool.query(sql, [safeLimit]);
      return rows;
    } catch (error) {
      throw new Error(`NotificationRepository.getRecentNotifications failed: ${error.message}`);
    }
  }
}

module.exports = new NotificationRepository();
