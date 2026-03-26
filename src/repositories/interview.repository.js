const pool = require('../config/db');

class InterviewRepository {
  /**
   * Create a new interview record
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_ai_interviews
        (candidate_id, job_id, screening_id, interview_type, difficulty_level,
         invitation_token, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.candidate_id,
        data.job_id || null,
        data.screening_id || null,
        data.interview_type || 'hr',
        data.difficulty_level || 'high',
        data.interview_token || null,
        data.interview_status || 'pending',
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`InterviewRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Find an interview by ID
   */
  async findById(id) {
    try {
      const sql = `
        SELECT aii.*,
          dsr.appln_full_name AS candidate_name, dsr.appln_email, dsr.appln_mobile_no,
          dsr.appln_total_experience, dsr.appln_high_qualification,
          COALESCE(job.applied_for_post, job.applied_job_short_desc_new) AS job_title,
          job.applied_location
        FROM atlas_rec_ai_interviews aii
        LEFT JOIN dice_staff_recruitment dsr ON aii.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON aii.job_id = job.id
        WHERE aii.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`InterviewRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Find an interview by token
   */
  async findByToken(token) {
    try {
      const sql = `
        SELECT aii.*,
          dsr.appln_full_name AS candidate_name, dsr.appln_email, dsr.appln_mobile_no,
          dsr.appln_total_experience, dsr.appln_high_qualification,
          COALESCE(job.applied_for_post, job.applied_job_short_desc_new) AS job_title,
          job.applied_job_desc, job.applied_location
        FROM atlas_rec_ai_interviews aii
        LEFT JOIN dice_staff_recruitment dsr ON aii.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON aii.job_id = job.id
        WHERE aii.invitation_token = ?
      `;

      const [rows] = await pool.query(sql, [token]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`InterviewRepository.findByToken failed: ${error.message}`);
    }
  }

  /**
   * Find all interviews for a candidate
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT aii.*,
          COALESCE(job.applied_for_post, job.applied_job_short_desc_new) AS job_title,
          job.applied_location
        FROM atlas_rec_ai_interviews aii
        LEFT JOIN isdi_admsn_applied_for job ON aii.job_id = job.id
        WHERE aii.candidate_id = ?
        ORDER BY aii.created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`InterviewRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Update an interview record
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      const allowedFields = [
        'status', 'interview_type', 'total_score',
        'communication_score', 'domain_knowledge_score', 'problem_solving_score',
        'confidence_score', 'ai_feedback', 'ai_summary', 'started_at',
        'submitted_at', 'evaluated_at',
      ];

      // Map common aliases to actual column names
      if (data.interview_status !== undefined) {
        data.status = data.interview_status;
        delete data.interview_status;
      }
      if (data.overall_score !== undefined) {
        data.total_score = data.overall_score;
        delete data.overall_score;
      }
      if (data.completed_at !== undefined) {
        data.submitted_at = data.completed_at;
        delete data.completed_at;
      }
      if (data.feedback !== undefined) {
        data.ai_feedback = data.feedback;
        delete data.feedback;
      }

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
        UPDATE atlas_rec_ai_interviews
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`InterviewRepository.update failed: ${error.message}`);
    }
  }

  /**
   * Create a question for an interview
   */
  async createQuestion(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_ai_interview_questions
        (interview_id, question_order, question_text, question_type,
         expected_keywords, max_duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.interview_id,
        data.question_number || data.question_order || 0,
        data.question_text,
        data.question_type || 'text',
        data.expected_answer || data.expected_keywords || null,
        data.max_duration_seconds || 300,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`InterviewRepository.createQuestion failed: ${error.message}`);
    }
  }

  /**
   * Get all questions for an interview
   */
  async getQuestions(interviewId) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_ai_interview_questions
        WHERE interview_id = ?
        ORDER BY question_order ASC
      `;

      const [rows] = await pool.query(sql, [interviewId]);
      return rows;
    } catch (error) {
      throw new Error(`InterviewRepository.getQuestions failed: ${error.message}`);
    }
  }

  /**
   * Create an answer for an interview question
   */
  async createAnswer(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_ai_interview_answers
        (interview_id, question_id, answer_text, answer_audio_url, answer_video_url,
         score, keyword_relevance_score, quality_score, ai_feedback, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.interview_id,
        data.question_id,
        data.answer_text || null,
        data.answer_audio_url || null,
        data.answer_video_url || null,
        data.score || null,
        data.keyword_relevance_score || null,
        data.quality_score || null,
        data.ai_feedback || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`InterviewRepository.createAnswer failed: ${error.message}`);
    }
  }

  /**
   * Get all answers for an interview
   */
  async getAnswers(interviewId) {
    try {
      const sql = `
        SELECT ans.*, q.question_text, q.question_type, q.question_order, q.max_score
        FROM atlas_rec_ai_interview_answers ans
        LEFT JOIN atlas_rec_ai_interview_questions q ON ans.question_id = q.id
        WHERE ans.interview_id = ?
        ORDER BY q.question_order ASC
      `;

      const [rows] = await pool.query(sql, [interviewId]);
      return rows;
    } catch (error) {
      throw new Error(`InterviewRepository.getAnswers failed: ${error.message}`);
    }
  }

  /**
   * Update an answer
   */
  async updateAnswer(id, data) {
    try {
      const fields = [];
      const params = [];

      const allowedFields = [
        'answer_text', 'answer_audio_url', 'answer_video_url', 'score',
        'keyword_relevance_score', 'quality_score', 'ai_feedback', 'submitted_at',
      ];

      // Map common aliases
      if (data.ai_score !== undefined) { data.score = data.ai_score; delete data.ai_score; }
      if (data.ai_evaluation !== undefined) { data.ai_feedback = data.ai_evaluation; delete data.ai_evaluation; }

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(data[field]);
        }
      }

      if (fields.length === 0) {
        const [rows] = await pool.query(
          'SELECT * FROM atlas_rec_ai_interview_answers WHERE id = ?', [id]
        );
        return rows.length > 0 ? rows[0] : null;
      }

      fields.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE atlas_rec_ai_interview_answers
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);

      const [rows] = await pool.query(
        'SELECT * FROM atlas_rec_ai_interview_answers WHERE id = ?', [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`InterviewRepository.updateAnswer failed: ${error.message}`);
    }
  }

  /**
   * Build filter clause for interview listing
   */
  _buildInterviewFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.candidate_id) {
      conditions.push('aii.candidate_id = ?');
      params.push(filters.candidate_id);
    }

    if (filters.job_id) {
      conditions.push('aii.job_id = ?');
      params.push(filters.job_id);
    }

    if (filters.interview_status) {
      conditions.push('aii.status = ?');
      params.push(filters.interview_status);
    }

    if (filters.interview_type) {
      conditions.push('aii.interview_type = ?');
      params.push(filters.interview_type);
    }

    if (filters.date_from) {
      conditions.push('aii.created_at >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('aii.created_at <= ?');
      params.push(filters.date_to);
    }

    if (filters.score_min != null) {
      conditions.push('aii.total_score >= ?');
      params.push(filters.score_min);
    }

    if (filters.score_max != null) {
      conditions.push('aii.total_score <= ?');
      params.push(filters.score_max);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    return { whereClause, params };
  }

  /**
   * Get interviews for dashboard with filters and pagination
   */
  async getInterviewsForDashboard(filters = {}, pagination = {}) {
    try {
      const { whereClause, params } = this._buildInterviewFilters(filters);

      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const sql = `
        SELECT aii.*,
          dsr.appln_full_name AS candidate_name, dsr.appln_email, dsr.appln_mobile_no,
          COALESCE(job.applied_for_post, job.applied_job_short_desc_new) AS job_title,
          job.applied_location
        FROM atlas_rec_ai_interviews aii
        LEFT JOIN dice_staff_recruitment dsr ON aii.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON aii.job_id = job.id
        ${whereClause}
        ORDER BY aii.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = [...params, limit, offset];
      const [rows] = await pool.query(sql, queryParams);
      return rows;
    } catch (error) {
      throw new Error(`InterviewRepository.getInterviewsForDashboard failed: ${error.message}`);
    }
  }

  /**
   * Count interviews with filters
   */
  async countInterviews(filters = {}) {
    try {
      const { whereClause, params } = this._buildInterviewFilters(filters);

      const sql = `
        SELECT COUNT(*) AS total
        FROM atlas_rec_ai_interviews aii
        ${whereClause}
      `;

      const [rows] = await pool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error(`InterviewRepository.countInterviews failed: ${error.message}`);
    }
  }
}

module.exports = new InterviewRepository();
