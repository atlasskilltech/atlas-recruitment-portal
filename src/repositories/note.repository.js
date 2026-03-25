const pool = require('../config/db');

class NoteRepository {
  /**
   * Create a new note
   */
  async create(data) {
    try {
      const sql = `
        INSERT INTO atlas_rec_hr_notes
        (candidate_id, note_text, note_type, created_by, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;

      const params = [
        data.candidate_id,
        data.note_text,
        data.note_type || 'general',
        data.created_by || null,
      ];

      const [result] = await pool.query(sql, params);
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`NoteRepository.create failed: ${error.message}`);
    }
  }

  /**
   * Find all notes for a candidate
   */
  async findByCandidateId(candidateId) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_hr_notes
        WHERE candidate_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await pool.query(sql, [candidateId]);
      return rows;
    } catch (error) {
      throw new Error(`NoteRepository.findByCandidateId failed: ${error.message}`);
    }
  }

  /**
   * Find a note by ID
   */
  async findById(id) {
    try {
      const sql = `
        SELECT *
        FROM atlas_rec_hr_notes
        WHERE id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`NoteRepository.findById failed: ${error.message}`);
    }
  }

  /**
   * Update a note
   */
  async update(id, data) {
    try {
      const fields = [];
      const params = [];

      if (data.note_text !== undefined) {
        fields.push('note_text = ?');
        params.push(data.note_text);
      }

      if (data.note_type !== undefined) {
        fields.push('note_type = ?');
        params.push(data.note_type);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updated_at = NOW()');
      params.push(id);

      const sql = `
        UPDATE atlas_rec_hr_notes
        SET ${fields.join(', ')}
        WHERE id = ?
      `;

      await pool.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`NoteRepository.update failed: ${error.message}`);
    }
  }

  /**
   * Delete a note by ID
   */
  async delete(id) {
    try {
      const sql = `
        DELETE FROM atlas_rec_hr_notes
        WHERE id = ?
      `;

      const [result] = await pool.query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`NoteRepository.delete failed: ${error.message}`);
    }
  }
}

module.exports = new NoteRepository();
