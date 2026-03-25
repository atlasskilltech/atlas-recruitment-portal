// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Application Constants
// ---------------------------------------------------------------------------

// ---- User Roles -----------------------------------------------------------
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR_MANAGER: 'hr_manager',
  RECRUITER: 'recruiter',
  INTERVIEWER: 'interviewer',
};

const ROLES_LIST = Object.values(ROLES);

// ---- AI Screening Statuses ------------------------------------------------
const AI_STATUSES = {
  ELIGIBLE: 'eligible',
  HOLD: 'hold',
  REJECTED: 'rejected',
};

const AI_STATUSES_LIST = Object.values(AI_STATUSES);

// ---- HR / Application Pipeline Statuses -----------------------------------
const HR_STATUSES = {
  NEW: 'new',
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  HOLD: 'hold',
  SCHEDULED: 'scheduled',
  SELECTED: 'selected',
  OFFER_RELEASED: 'offer_released',
  HIRED: 'hired',
};

const HR_STATUSES_LIST = Object.values(HR_STATUSES);

// ---- Interview Statuses ---------------------------------------------------
const INTERVIEW_STATUSES = {
  PENDING: 'pending',
  INVITED: 'invited',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  EVALUATED: 'evaluated',
  PASSED: 'passed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

const INTERVIEW_STATUSES_LIST = Object.values(INTERVIEW_STATUSES);

// ---- Recommendation Tags --------------------------------------------------
const RECOMMENDATION_TAGS = {
  STRONG_FIT: 'strong_fit',
  MODERATE_FIT: 'moderate_fit',
  WEAK_FIT: 'weak_fit',
};

const RECOMMENDATION_TAGS_LIST = Object.values(RECOMMENDATION_TAGS);

// ---- Interview Types ------------------------------------------------------
const INTERVIEW_TYPES = {
  TECHNICAL: 'technical',
  HR: 'hr',
  MANAGERIAL: 'managerial',
  PANEL: 'panel',
};

const INTERVIEW_TYPES_LIST = Object.values(INTERVIEW_TYPES);

// ---- Scoring Weights (must total 1.0 / 100%) -----------------------------
const SCORING_WEIGHTS = {
  COMMUNICATION: 0.20,     // 20%
  DOMAIN_KNOWLEDGE: 0.30,  // 30%
  PROBLEM_SOLVING: 0.30,   // 30%
  CONFIDENCE: 0.20,        // 20%
};

// ---- AI Match Score Thresholds --------------------------------------------
const AI_MATCH_THRESHOLDS = {
  STRONG: { min: 75, label: 'strong_fit' },
  MODERATE: { min: 50, max: 74.99, label: 'moderate_fit' },
  WEAK: { max: 49.99, label: 'weak_fit' },
};

/**
 * Derive a recommendation tag from an AI match score.
 * @param {number} score – numeric match score (0-100)
 * @returns {string} recommendation tag
 */
function getRecommendationFromScore(score) {
  if (score >= AI_MATCH_THRESHOLDS.STRONG.min) {
    return RECOMMENDATION_TAGS.STRONG_FIT;
  }
  if (score >= AI_MATCH_THRESHOLDS.MODERATE.min) {
    return RECOMMENDATION_TAGS.MODERATE_FIT;
  }
  return RECOMMENDATION_TAGS.WEAK_FIT;
}

// ---- File Upload Configuration --------------------------------------------
const FILE_UPLOAD_BASE_URL = '/uploads';

const FILE_COLUMNS = {
  RESUME: 'resume_path',
  COVER_LETTER: 'cover_letter_path',
  PROFILE_PHOTO: 'profile_photo_path',
  SUPPORTING_DOC: 'supporting_doc_path',
};

const ALLOWED_FILE_TYPES = {
  RESUME: ['.pdf', '.doc', '.docx'],
  COVER_LETTER: ['.pdf', '.doc', '.docx'],
  PROFILE_PHOTO: ['.jpg', '.jpeg', '.png'],
  SUPPORTING_DOC: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
};

// ---- Pagination Defaults --------------------------------------------------
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ROLES,
  ROLES_LIST,
  AI_STATUSES,
  AI_STATUSES_LIST,
  HR_STATUSES,
  HR_STATUSES_LIST,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUSES_LIST,
  RECOMMENDATION_TAGS,
  RECOMMENDATION_TAGS_LIST,
  INTERVIEW_TYPES,
  INTERVIEW_TYPES_LIST,
  SCORING_WEIGHTS,
  AI_MATCH_THRESHOLDS,
  getRecommendationFromScore,
  FILE_UPLOAD_BASE_URL,
  FILE_COLUMNS,
  ALLOWED_FILE_TYPES,
  PAGINATION,
};
