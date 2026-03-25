const pool = require('../config/db');

class CandidateRepository {
  /**
   * Build WHERE clause and params from filters
   */
  _buildFilterClause(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.name) {
      conditions.push('dsr.appln_full_name LIKE ?');
      params.push(`%${filters.name}%`);
    }

    if (filters.email) {
      conditions.push('dsr.appln_email LIKE ?');
      params.push(`%${filters.email}%`);
    }

    if (filters.mobile) {
      conditions.push('dsr.appln_mobile_no LIKE ?');
      params.push(`%${filters.mobile}%`);
    }

    if (filters.job_id) {
      conditions.push('dsr.appln_applied_for_sub = ?');
      params.push(filters.job_id);
    }

    if (filters.department) {
      conditions.push('job.applied_job_short_desc_new LIKE ?');
      params.push(`%${filters.department}%`);
    }

    if (filters.match_score_min != null) {
      conditions.push('ais.ai_match_score >= ?');
      params.push(filters.match_score_min);
    }

    if (filters.match_score_max != null) {
      conditions.push('ais.ai_match_score <= ?');
      params.push(filters.match_score_max);
    }

    if (filters.interview_score_min != null) {
      conditions.push('aii.total_score >= ?');
      params.push(filters.interview_score_min);
    }

    if (filters.interview_score_max != null) {
      conditions.push('aii.total_score <= ?');
      params.push(filters.interview_score_max);
    }

    if (filters.ai_status) {
      conditions.push('ais.ai_status = ?');
      params.push(filters.ai_status);
    }

    if (filters.hr_status) {
      conditions.push('dsr.appln_status_new = ?');
      params.push(filters.hr_status);
    }

    if (filters.date_from) {
      conditions.push('dsr.appln_date >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('dsr.appln_date <= ?');
      params.push(filters.date_to);
    }

    if (filters.qualification) {
      conditions.push('dsr.appln_high_qualification LIKE ?');
      params.push(`%${filters.qualification}%`);
    }

    if (filters.experience_min != null) {
      conditions.push('dsr.appln_total_experience >= ?');
      params.push(filters.experience_min);
    }

    if (filters.experience_max != null) {
      conditions.push('dsr.appln_total_experience <= ?');
      params.push(filters.experience_max);
    }

    if (filters.location) {
      conditions.push('job.applied_location LIKE ?');
      params.push(`%${filters.location}%`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    return { whereClause, params };
  }

  /**
   * Build ORDER BY clause from sorting options
   */
  _buildSortClause(sort = {}) {
    const allowedColumns = {
      name: 'dsr.appln_full_name',
      email: 'dsr.appln_email',
      date: 'dsr.appln_date',
      experience: 'dsr.appln_total_experience',
      match_score: 'ais.ai_match_score',
      interview_score: 'aii.total_score',
      recommendation: 'ais.ai_recommendation_tag',
      status: 'dsr.appln_status_new',
      id: 'dsr.id',
    };

    const column = allowedColumns[sort.field] || 'dsr.appln_date';
    const direction = sort.order && sort.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return `ORDER BY ${column} ${direction}`;
  }

  /**
   * Base SELECT and JOIN used across list queries
   */
  _baseQuery() {
    return `
      SELECT
        dsr.id, dsr.appln_id, dsr.appln_full_name, dsr.appln_email,
        dsr.appln_mobile_no, dsr.appln_total_experience,
        dsr.appln_high_qualification, dsr.appln_specialization,
        dsr.appln_current_organisation, dsr.appln_current_designation,
        dsr.appln_date, dsr.appln_status, dsr.appln_status_new,
        dsr.appln_cv, dsr.appln_industry_exp_letter,
        job.id AS job_id, job.applied_for_post_id,
        job.applied_job_short_desc_new, job.applied_job_desc,
        job.applied_location,
        ais.id AS screening_id, ais.ai_match_score, ais.ai_status,
        ais.ai_recommendation_tag, ais.processed_at AS screening_date,
        aii.id AS interview_id, aii.total_score, aii.status AS interview_status,
        aii.started_at AS interview_date
      FROM dice_staff_recruitment dsr
      LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
      LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
        AND ais.id = (
          SELECT MAX(s.id) FROM atlas_rec_candidate_ai_screening s WHERE s.candidate_id = dsr.id
        )
      LEFT JOIN atlas_rec_ai_interviews aii ON aii.candidate_id = dsr.id
        AND aii.id = (
          SELECT MAX(i.id) FROM atlas_rec_ai_interviews i WHERE i.candidate_id = dsr.id
        )
    `;
  }

  /**
   * Find all candidates with filters, sorting, and pagination
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildFilterClause(filters);
      const sortClause = this._buildSortClause(filters.sort);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        ${this._baseQuery()}
        ${whereClause}
        ${sortClause}
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`CandidateRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Count all candidates matching filters
   */
  async countAll(filters = {}) {
    try {
      const { whereClause, params } = this._buildFilterClause(filters);

      const sql = `
        SELECT COUNT(*) AS total
        FROM dice_staff_recruitment dsr
        LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
        LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
          AND ais.id = (
            SELECT MAX(s.id) FROM atlas_rec_candidate_ai_screening s WHERE s.candidate_id = dsr.id
          )
        LEFT JOIN atlas_rec_ai_interviews aii ON aii.candidate_id = dsr.id
          AND aii.id = (
            SELECT MAX(i.id) FROM atlas_rec_ai_interviews i WHERE i.candidate_id = dsr.id
          )
        ${whereClause}
      `;

      const [rows] = await pool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`CandidateRepository.countAll failed: ${error.message}`);
    }
  }

  /**
   * Find a single candidate by ID with full details
   */
  async findById(id) {
    try {
      const sql = `
        SELECT
          dsr.*,
          job.id AS job_id, job.applied_for_post_id,
          job.applied_job_short_desc_new, job.applied_job_desc,
          job.applied_location,
          ais.id AS screening_id, ais.ai_match_score, ais.ai_status,
          ais.extracted_skills, ais.extracted_keywords,
          ais.extracted_education_summary, ais.extracted_experience_summary,
          ais.skill_gap_analysis, ais.role_fit_summary,
          ais.ai_recommendation_tag, ais.processed_at AS screening_date,
          aii.id AS interview_id, aii.total_score, aii.status AS interview_status,
          aii.started_at AS interview_date, aii.invitation_token AS interview_token,
          aii.communication_score, aii.domain_knowledge_score,
          aii.problem_solving_score, aii.confidence_score, aii.ai_feedback
        FROM dice_staff_recruitment dsr
        LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
        LEFT JOIN atlas_rec_candidate_ai_screening ais ON ais.candidate_id = dsr.id
          AND ais.id = (
            SELECT MAX(s.id) FROM atlas_rec_candidate_ai_screening s WHERE s.candidate_id = dsr.id
          )
        LEFT JOIN atlas_rec_ai_interviews aii ON aii.candidate_id = dsr.id
          AND aii.id = (
            SELECT MAX(i.id) FROM atlas_rec_ai_interviews i WHERE i.candidate_id = dsr.id
          )
        WHERE dsr.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`CandidateRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Get counts grouped by various statuses
   */
  async getStatusCounts() {
    try {
      const sql = `
        SELECT
          dsr.appln_status_new AS status,
          COUNT(*) AS count
        FROM dice_staff_recruitment dsr
        GROUP BY dsr.appln_status_new
      `;

      const [statusRows] = await pool.query(sql);

      const screeningSql = `
        SELECT
          ais.ai_status AS status,
          COUNT(*) AS count
        FROM atlas_rec_candidate_ai_screening ais
        WHERE ais.id IN (
          SELECT MAX(s.id) FROM atlas_rec_candidate_ai_screening s GROUP BY s.candidate_id
        )
        GROUP BY ais.ai_status
      `;
      /* screening_status -> ai_status is already correct */

      const [screeningRows] = await pool.query(screeningSql);

      const interviewSql = `
        SELECT
          aii.status AS interview_status AS status,
          COUNT(*) AS count
        FROM atlas_rec_ai_interviews aii
        WHERE aii.id IN (
          SELECT MAX(i.id) FROM atlas_rec_ai_interviews i GROUP BY i.candidate_id
        )
        GROUP BY aii.status AS interview_status
      `;

      const [interviewRows] = await pool.query(interviewSql);

      return {
        hr_status: statusRows,
        screening_status: screeningRows,
        interview_status: interviewRows,
      };
    } catch (error) {
      throw new Error(`CandidateRepository.getStatusCounts failed: ${error.message}`);
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const sql = `
        SELECT
          COUNT(*) AS total_candidates,
          SUM(CASE WHEN dsr.appln_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_last_30_days,
          SUM(CASE WHEN dsr.appln_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new_last_7_days,
          SUM(CASE WHEN dsr.appln_date = CURDATE() THEN 1 ELSE 0 END) AS new_today
        FROM dice_staff_recruitment dsr
      `;

      const [rows] = await pool.query(sql);

      const screenedSql = `
        SELECT COUNT(DISTINCT candidate_id) AS screened_count
        FROM atlas_rec_candidate_ai_screening
      `;

      const [screenedRows] = await pool.query(screenedSql);

      const interviewedSql = `
        SELECT
          COUNT(DISTINCT candidate_id) AS interviewed_count,
          SUM(CASE WHEN status IN ('evaluated','passed') THEN 1 ELSE 0 END) AS completed_interviews,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_interviews
        FROM atlas_rec_ai_interviews
      `;

      const [interviewedRows] = await pool.query(interviewedSql);

      return {
        ...rows[0],
        screened_count: screenedRows[0].screened_count,
        ...interviewedRows[0],
      };
    } catch (error) {
      throw new Error(`CandidateRepository.getDashboardStats failed: ${error.message}`);
    }
  }
}

module.exports = new CandidateRepository();
