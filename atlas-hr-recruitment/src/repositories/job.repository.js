const pool = require('../config/db');

class JobRepository {
  /**
   * Find all jobs
   */
  async findAll() {
    try {
      const sql = `
        SELECT
          id, applied_for_post_id, applied_job_short_desc_new,
          applied_job_desc, applied_location
        FROM isdi_admsn_applied_for
        ORDER BY id DESC
      `;

      const [rows] = await pool.query(sql);
      return rows;
    } catch (error) {
      throw new Error(`JobRepository.findAll failed: ${error.message}`);
    }
  }

  /**
   * Find a job by ID
   */
  async findById(id) {
    try {
      const sql = `
        SELECT *
        FROM isdi_admsn_applied_for
        WHERE id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`JobRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Get applicant counts grouped by job
   */
  async getApplicantCountsByJob() {
    try {
      const sql = `
        SELECT
          job.id AS job_id,
          job.applied_for_post_id,
          job.applied_job_short_desc_new,
          job.applied_location,
          COUNT(dsr.id) AS applicant_count
        FROM isdi_admsn_applied_for job
        LEFT JOIN dice_staff_recruitment dsr ON dsr.appln_applied_for_sub = job.id
        GROUP BY job.id, job.applied_for_post_id,
                 job.applied_job_short_desc_new, job.applied_location
        ORDER BY applicant_count DESC
      `;

      const [rows] = await pool.query(sql);
      return rows;
    } catch (error) {
      throw new Error(`JobRepository.getApplicantCountsByJob failed: ${error.message}`);
    }
  }
}

module.exports = new JobRepository();
