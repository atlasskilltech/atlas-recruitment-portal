/**
 * Prepend the upload base URL to a file name.
 * Returns null when fileName is falsy.
 * @param {string|null} fileName
 * @returns {string|null}
 */
function buildFileUrl(fileName) {
  if (!fileName) return null;
  const base = (process.env.UPLOAD_BASE_URL || '/uploads').replace(/\/+$/, '');
  return `${base}/${fileName}`;
}

/**
 * Return the list of file-upload column names used in the application form.
 * @returns {string[]}
 */
function getFileColumns() {
  return [
    'appln_cv',
    'appln_industry_exp_letter',
    'appln_university_exp_letter',
    'appln_statement',
    'appln_profile',
    'appln_chapter',
    'appln_article',
    'appln_article1',
    'appln_article2',
  ];
}

const FILE_LABELS = {
  appln_cv: 'Curriculum Vitae',
  appln_industry_exp_letter: 'Industry Experience Letter',
  appln_university_exp_letter: 'University Experience Letter',
  appln_statement: 'Statement of Purpose',
  appln_profile: 'Profile Document',
  appln_chapter: 'Book Chapter',
  appln_article: 'Research Article',
  appln_article1: 'Research Article 1',
  appln_article2: 'Research Article 2',
};

/**
 * Get a friendly label for a file column name.
 * @param {string} columnName
 * @returns {string}
 */
function getFileLabel(columnName) {
  return FILE_LABELS[columnName] || columnName;
}

/**
 * Truncate a string to a given length and append an ellipsis.
 * @param {string} str
 * @param {number} len
 * @returns {string}
 */
function truncate(str, len = 100) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '...';
}

/**
 * Convert a string to a URL-friendly slug.
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract up to two initials from a full name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Format a numeric score to one decimal place.
 * @param {number|string} score
 * @returns {string}
 */
function formatScore(score) {
  const num = parseFloat(score);
  if (isNaN(num)) return '0.0';
  return num.toFixed(1);
}

/**
 * Return a Tailwind CSS text-color class based on score ranges.
 * @param {number|string} score  0-100
 * @returns {string}
 */
function getScoreColor(score) {
  const num = parseFloat(score) || 0;
  if (num >= 80) return 'text-green-600';
  if (num >= 60) return 'text-blue-600';
  if (num >= 40) return 'text-yellow-600';
  if (num >= 20) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Return Tailwind badge classes for an application / job status.
 * @param {string} status
 * @returns {string}
 */
function getStatusBadgeClass(status) {
  const map = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-indigo-100 text-indigo-800',
    shortlisted: 'bg-purple-100 text-purple-800',
    interview: 'bg-cyan-100 text-cyan-800',
    offered: 'bg-emerald-100 text-emerald-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-200 text-gray-600',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-500',
  };
  return map[(status || '').toLowerCase()] || 'bg-gray-100 text-gray-700';
}

/**
 * Return a label and Tailwind class object for recommendation tags.
 * @param {string} tag
 * @returns {{ label: string, class: string }}
 */
function getRecommendationBadge(tag) {
  const badges = {
    strong_fit: {
      label: 'Strong Fit',
      class: 'bg-green-100 text-green-800 border-green-300',
    },
    moderate_fit: {
      label: 'Moderate Fit',
      class: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    weak_fit: {
      label: 'Weak Fit',
      class: 'bg-red-100 text-red-800 border-red-300',
    },
  };
  return (
    badges[(tag || '').toLowerCase()] || {
      label: tag || 'Unknown',
      class: 'bg-gray-100 text-gray-700 border-gray-300',
    }
  );
}

/**
 * Basic HTML sanitisation to prevent XSS.
 * Escapes &, <, >, ", and ' characters.
 * @param {string} str
 * @returns {string}
 */
function sanitizeHtml(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Build a pagination metadata object.
 * @param {number} page     - current page (1-based)
 * @param {number} limit    - items per page
 * @param {number} total    - total item count
 * @returns {{ page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean, offset: number }}
 */
function paginate(page = 1, limit = 10, total = 0) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, parseInt(limit, 10) || 10);
  total = Math.max(0, parseInt(total, 10) || 0);

  const totalPages = Math.ceil(total / limit) || 1;
  page = Math.min(page, totalPages);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    offset: (page - 1) * limit,
  };
}

/**
 * Generate an array of page numbers (with '...' ellipses) for pagination UI.
 * @param {number} currentPage
 * @param {number} totalPages
 * @returns {(number|string)[]}
 */
function generatePaginationArray(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];

  // Always show first page
  pages.push(1);

  if (currentPage > 3) {
    pages.push('...');
  }

  // Pages around current
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  // Always show last page
  pages.push(totalPages);

  return pages;
}

module.exports = {
  buildFileUrl,
  getFileColumns,
  getFileLabel,
  truncate,
  slugify,
  getInitials,
  formatScore,
  getScoreColor,
  getStatusBadgeClass,
  getRecommendationBadge,
  sanitizeHtml,
  paginate,
  generatePaginationArray,
};
