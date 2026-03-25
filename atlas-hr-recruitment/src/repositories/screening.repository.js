const pool = require('../config/db');

class ScreeningRepository {
  /**
   * Create a new screening record
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_candidate_ai_screening
        (candidate_id, job_id, cv_file_name, cv_file_url, cover_letter_file_name,
         cover_letter_file_url, jd_snapshot, extracted_skills, extracted_keywords,
         extracted_education_summary, extracted_experience_summary, ai_match_score,
         skill_gap_analysis, role_fit_summary, ai_recommendation_tag, ai_status,
         ai_provider, ai_model, raw_ai_response, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.candidate_id,
        data.job_id || null,
        data.cv_file_name || null,
        data.cv_file_url || null,
        data.cover_letter_file_name || null,
        data.cover_letter_file_url || null,
        data.jd_snapshot || null,
        data.extracted_skills || null,
        data.extracted_keywords || null,
        data.extracted_education_summary || null,
        data.extracted_experience_summary || null,
        data.ai_match_score || null,
        data.skill_gap_analysis || null,
        data.role_fit_summary || null,
        data.ai_recommendation_tag || 'weak_fit',
        data.ai_status || 'hold',
        data.ai_provider || null,
        data.ai_model || null,
        data.raw_ai_response || null,
        data.processed_at || new Date(),
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`ScreeningRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Find all screenings for a candidate
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT ais.*, job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_candidate_ai_screening ais
        LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
        WHERE ais.candidate_id = ?
        ORDER BY ais.created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`ScreeningRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Find the latest screening for a candidate
   */
  async findLatestByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT ais.*, job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_candidate_ai_screening ais
        LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
        WHERE ais.candidate_id = ?
        ORDER BY ais.created_at DESC
        LIMIT 1
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`ScreeningRepository.findLatestByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Find a screening by ID
   */
  async findById(id) {
    try {
      const sql = `
        SELECT ais.*,
          dsr.appln_full_name, dsr.appln_email, dsr.appln_mobile_no,
          job.applied_job_short_desc_new, job.applied_location
        FROM atlas_rec_candidate_ai_screening ais
        LEFT JOIN dice_staff_recruitment dsr ON ais.candidate_id = dsr.id
        LEFT JOIN isdi_admsn_applied_for job ON ais.job_id = job.id
        WHERE ais.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`ScreeningRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Update a screening record
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      if (data.match_score != null) {
        fields.push('match_score = ?');
        params.push(data.match_score);
      }

      if (data.screening_status !== undefined) {
        fields.push('screening_status = ?');
        params.push(data.screening_status);
      }

      if (data.skills_analysis !== undefined) {
        fields.push('skills_analysis = ?');
        params.push(data.skills_analysis ? JSON.stringify(data.skills_analysis) : null);
      }

      if (data.experience_analysis !== undefined) {
        fields.push('experience_analysis = ?');
        params.push(data.experience_analysis ? JSON.stringify(data.experience_analysis) : null);
      }

      if (data.education_analysis !== undefined) {
        fields.push('education_analysis = ?');
        params.push(data.education_analysis ? JSON.stringify(data.education_analysis) : null);
      }

      if (data.overall_summary !== undefined) {
        fields.push('overall_summary = ?');
        params.push(data.overall_summary);
      }

      if (data.recommendation !== undefined) {
        fields.push('recommendation = ?');
        params.push(data.recommendation);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE atlas_rec_candidate_ai_screening
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`ScreeningRepository.update failed: ${error.message}`);
    }
  }
}

module.exports = new ScreeningRepository();
