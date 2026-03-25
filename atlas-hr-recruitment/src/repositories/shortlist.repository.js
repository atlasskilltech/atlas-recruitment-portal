const pool = require('../config/db');

class ShortlistRepository {
  /**
   * Create a new shortlist record
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_hr_shortlists
        (candidate_id, job_id, shortlisted_by, shortlist_status, remarks,
         screening_id, interview_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.candidate_id,
        data.job_id || null,
        data.shortlisted_by || null,
        data.shortlist_status || 'shortlisted',
        data.remarks || null,
        data.screening_id || null,
        data.interview_id || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`ShortlistRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Find a shortlist record by ID
   */
  async findById(id) {
    try {
      const sql = `
        SELECT sl.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          dsr.appln_total_experience, dsr.appln_high_qualification,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_hr_shortlists sl
        LEFT JOIN dice_staff_recruitment dsr ON sl.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sl.job_id = job.id
        WHERE sl.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`ShortlistRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Find shortlist records by candidate ID
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT sl.*,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_hr_shortlists sl
        LEFT JOIN isdi_admsn_applied_for job ON sl.job_id = job.id
        WHERE sl.candidate_id = ?
        ORDER BY sl.created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`ShortlistRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Build filter clause for shortlist queries
   */
  _buildFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.candidate_id) {
      conditions.push('sl.candidate_id = ?');
      params.push(filters.candidate_id);
    }

    if (filters.job_id) {
      conditions.push('sl.job_id = ?');
      params.push(filters.job_id);
    }

    if (filters.shortlist_status) {
      conditions.push('sl.shortlist_status = ?');
      params.push(filters.shortlist_status);
    }

    if (filters.shortlisted_by) {
      conditions.push('sl.shortlisted_by = ?');
      params.push(filters.shortlisted_by);
    }

    if (filters.date_from) {
      conditions.push('sl.created_at >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('sl.created_at <= ?');
      params.push(filters.date_to);
    }

    if (filters.name) {
      conditions.push('dsr.appln_full_name LIKE ?');
      params.push(`%${filters.name}%`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    return { whereClause, params };
  }

  /**
   * Find all shortlist records with filters and pagination
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        SELECT sl.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          dsr.appln_total_experience, dsr.appln_high_qualification,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_hr_shortlists sl
        LEFT JOIN dice_staff_recruitment dsr ON sl.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sl.job_id = job.id
        ${whereClause}
        ORDER BY sl.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`ShortlistRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Update a shortlist record
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      const allowedFields = [
        'shortlist_status', 'remarks', 'shortlisted_by',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(data[field]);
        }
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE atlas_rec_hr_shortlists
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`ShortlistRepository.update failed: ${error.message}`);
    }
  }

  /**
   * Count shortlist records with filters
   */
  async countAll(filters = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const sql = `
        SELECT COUNT(*) AS total
        FROM atlas_rec_hr_shortlists sl
        LEFT JOIN dice_staff_recruitment dsr ON sl.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sl.job_id = job.id
        ${whereClause}
      `;

      const [rows] = await pool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`ShortlistRepository.countAll failed: ${error.message}`);
    }
  }
}

module.exports = new ShortlistRepository();
