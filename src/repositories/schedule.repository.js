const pool = require('../config/db');

class ScheduleRepository {
  /**
   * Create a new interview schedule
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_interview_schedules
        (candidate_id, job_id, interview_id, scheduled_date, scheduled_time,
         duration_minutes, interview_type, interviewer_name, interviewer_email,
         location, meeting_link, schedule_status, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.candidate_id,
        data.job_id || null,
        data.interview_id || null,
        data.scheduled_date,
        data.scheduled_time || null,
        data.duration_minutes || 60,
        data.interview_type || 'online',
        data.interviewer_name || null,
        data.interviewer_email || null,
        data.location || null,
        data.meeting_link || null,
        data.schedule_status || 'scheduled',
        data.notes || null,
        data.created_by || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`ScheduleRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Find a schedule by ID with candidate and job info
   */
  async findById(id) {
    try {
      const sql = `
        SELECT sch.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          dsr.appln_total_experience, dsr.appln_high_qualification,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_interview_schedules sch
        LEFT JOIN dice_staff_recruitment dsr ON sch.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sch.job_id = job.id
        WHERE sch.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`ScheduleRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Build filter clause for schedule queries
   */
  _buildFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.candidate_id) {
      conditions.push('sch.candidate_id = ?');
      params.push(filters.candidate_id);
    }

    if (filters.job_id) {
      conditions.push('sch.job_id = ?');
      params.push(filters.job_id);
    }

    if (filters.schedule_status) {
      conditions.push('sch.schedule_status = ?');
      params.push(filters.schedule_status);
    }

    if (filters.interview_type) {
      conditions.push('sch.interview_type = ?');
      params.push(filters.interview_type);
    }

    if (filters.interviewer_name) {
      conditions.push('sch.interviewer_name LIKE ?');
      params.push(`%${filters.interviewer_name}%`);
    }

    if (filters.date_from) {
      conditions.push('sch.scheduled_date >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('sch.scheduled_date <= ?');
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
   * Find all schedules with filters and pagination
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        SELECT sch.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_interview_schedules sch
        LEFT JOIN dice_staff_recruitment dsr ON sch.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sch.job_id = job.id
        ${whereClause}
        ORDER BY sch.scheduled_date ASC, sch.scheduled_time ASC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`ScheduleRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Update a schedule record
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      const allowedFields = [
        'scheduled_date', 'scheduled_time', 'duration_minutes',
        'interview_type', 'interviewer_name', 'interviewer_email',
        'location', 'meeting_link', 'schedule_status', 'notes',
        'cancellation_reason',
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
        UPDATE atlas_rec_interview_schedules
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`ScheduleRepository.update failed: ${error.message}`);
    }
  }

  /**
   * Find upcoming schedules (today and future)
   */
  async findUpcoming() {
    try {
      const sql = `
        SELECT sch.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_interview_schedules sch
        LEFT JOIN dice_staff_recruitment dsr ON sch.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sch.job_id = job.id
        WHERE sch.scheduled_date >= CURDATE()
          AND sch.schedule_status IN ('scheduled', 'confirmed')
        ORDER BY sch.scheduled_date ASC, sch.scheduled_time ASC
        LIMIT 50
      `;

      const [rows] = await pool.query(sql);
      return rows;
    } catch (error) {
      throw new Error(`ScheduleRepository.findUpcoming failed: ${error.message}`);
    }
  }

  /**
   * Count schedules with filters
   */
  async countAll(filters = {}) {
    try {
      const { whereClause, params } = this._buildFilters(filters);

      const sql = `
        SELECT COUNT(*) AS total
        FROM atlas_rec_interview_schedules sch
        LEFT JOIN dice_staff_recruitment dsr ON sch.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON sch.job_id = job.id
        ${whereClause}
      `;

      const [rows] = await pool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`ScheduleRepository.countAll failed: ${error.message}`);
    }
  }
}

module.exports = new ScheduleRepository();
