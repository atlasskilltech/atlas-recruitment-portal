const env = require('../config/env');

/**
 * File-column definitions: database column name to human-friendly label.
 */
const FILE_COLUMN_MAP = [
  { columnName: 'appln_cv', label: 'CV/Resume' },
  { columnName: 'appln_industry_exp_letter', label: 'Industry Experience Letter' },
  { columnName: 'appln_university_exp_letter', label: 'University Experience Letter' },
  { columnName: 'appln_statement', label: 'Statement of Purpose' },
  { columnName: 'appln_profile', label: 'Profile Photo' },
  { columnName: 'appln_chapter', label: 'Book Chapter' },
  { columnName: 'appln_article', label: 'Research Article 1' },
  { columnName: 'appln_article1', label: 'Research Article 2' },
  { columnName: 'appln_article2', label: 'Research Article 3' },
];

/**
 * FileUrl Service -- builds download URLs and collects candidate file metadata
 */
class FileUrlService {
  /**
   * Build a full URL for a given file name using the configured upload base URL.
   * Returns null if fileName is null, undefined, or empty string.
   * @param {string|null} fileName
   * @returns {string|null}
   */
  buildFileUrl(fileName) {
    if (!fileName || (typeof fileName === 'string' && fileName.trim() === '')) {
      return null;
    }

    const baseUrl = (
      process.env.UPLOAD_BASE_URL || env.APP_URL + '/uploads'
    ).replace(/\/+$/, '');

    return `${baseUrl}/${fileName}`;
  }

  /**
   * Get an array of file descriptors for all file columns that have values on a candidate record.
   * @param {object} candidate - raw candidate row from the database
   * @returns {Array<{ label: string, columnName: string, url: string, fileName: string }>}
   */
  getCandidateFiles(candidate) {
    if (!candidate) return [];

    const files = [];

    for (const { columnName, label } of FILE_COLUMN_MAP) {
      const fileName = candidate[columnName];
      if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
        files.push({
          label,
          columnName,
          url: this.buildFileUrl(fileName),
          fileName,
        });
      }
    }

    return files;
  }
}

module.exports = new FileUrlService();
