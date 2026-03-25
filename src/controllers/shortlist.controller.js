// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Shortlist Controller
// ---------------------------------------------------------------------------
const shortlistService = require('../services/shortlist.service');
const candidateService = require('../services/candidate.service');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION, HR_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /shortlist
 * List shortlisted candidates with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters
  const filters = {};
  if (req.query.shortlist_status) filters.shortlist_status = req.query.shortlist_status;
  if (req.query.job_id) filters.job_id = parseInt(req.query.job_id, 10);
  if (req.query.candidate_id) filters.candidate_id = parseInt(req.query.candidate_id, 10);
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;

  const { shortlists, total } = await shortlistService.getShortlistCandidates(filters, { page, limit });

  const totalPages = Math.ceil(total / limit);

  // Fetch job list for filter dropdown
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  res.render('shortlist/index', {
    title: 'Shortlisted Candidates',
    shortlists,
    jobs,
    filters: req.query,
    hrStatuses: HR_STATUSES,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /shortlist
 * Shortlist a candidate.
 */
const shortlist = asyncHandler(async (req, res) => {
  const { candidate_id, job_id, remarks } = req.body;
  const candidateId = parseInt(candidate_id, 10);
  const jobId = parseInt(job_id, 10);

  if (!candidateId) {
    req.flash('error', 'Candidate ID is required.');
    return res.redirect('/shortlist');
  }

  // If job_id not provided, look it up from the candidate record
  let resolvedJobId = jobId;
  if (!resolvedJobId) {
    const candidate = await candidateService.getCandidateById(candidateId);
    if (candidate) {
      resolvedJobId = candidate.job_id || candidate.appln_applied_for_sub;
    }
  }

  try {
    await shortlistService.createShortlist(candidateId, resolvedJobId, {
      shortlisted_by: req.session.user ? req.session.user.id : null,
      remarks: remarks || null,
      shortlist_status: HR_STATUSES.SHORTLISTED,
    });

    logger.info(`Candidate ${candidateId} shortlisted by user ${req.session.user?.id}`);
    req.flash('success', 'Candidate shortlisted successfully.');
  } catch (err) {
    logger.error(`Failed to shortlist candidate ${candidateId}`, { error: err.message });
    req.flash('error', `Failed to shortlist candidate: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

/**
 * POST /shortlist/:id/reject
 * Reject a shortlisted candidate.
 */
const reject = asyncHandler(async (req, res) => {
  const shortlistId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  try {
    await shortlistService.updateStatus(
      shortlistId,
      HR_STATUSES.REJECTED,
      req.session.user ? req.session.user.id : null,
      notes || null
    );

    logger.info(`Shortlist ${shortlistId} rejected by user ${req.session.user?.id}`);
    req.flash('success', 'Candidate rejected successfully.');
  } catch (err) {
    logger.error(`Failed to reject shortlist ${shortlistId}`, { error: err.message });
    req.flash('error', `Failed to reject candidate: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

/**
 * POST /shortlist/:id/hold
 * Put a shortlisted candidate on hold.
 */
const hold = asyncHandler(async (req, res) => {
  const shortlistId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  try {
    await shortlistService.updateStatus(
      shortlistId,
      HR_STATUSES.HOLD,
      req.session.user ? req.session.user.id : null,
      notes || null
    );

    logger.info(`Shortlist ${shortlistId} put on hold by user ${req.session.user?.id}`);
    req.flash('success', 'Candidate put on hold successfully.');
  } catch (err) {
    logger.error(`Failed to put shortlist ${shortlistId} on hold`, { error: err.message });
    req.flash('error', `Failed to update candidate status: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

/**
 * POST /shortlist/:id/select
 * Mark a shortlisted candidate as selected.
 */
const select = asyncHandler(async (req, res) => {
  const shortlistId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  try {
    await shortlistService.updateStatus(
      shortlistId,
      HR_STATUSES.SELECTED,
      req.session.user ? req.session.user.id : null,
      notes || null
    );

    logger.info(`Shortlist ${shortlistId} marked as selected by user ${req.session.user?.id}`);
    req.flash('success', 'Candidate marked as selected.');
  } catch (err) {
    logger.error(`Failed to select shortlist ${shortlistId}`, { error: err.message });
    req.flash('error', `Failed to update candidate status: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

/**
 * POST /shortlist/:id/release-offer
 * Mark offer as released for a selected candidate.
 */
const releaseOffer = asyncHandler(async (req, res) => {
  const shortlistId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  try {
    await shortlistService.updateStatus(
      shortlistId,
      HR_STATUSES.OFFER_RELEASED,
      req.session.user ? req.session.user.id : null,
      notes || null
    );

    logger.info(`Offer released for shortlist ${shortlistId} by user ${req.session.user?.id}`);
    req.flash('success', 'Offer released successfully.');
  } catch (err) {
    logger.error(`Failed to release offer for shortlist ${shortlistId}`, { error: err.message });
    req.flash('error', `Failed to release offer: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

/**
 * POST /shortlist/:id/hire
 * Mark a candidate as hired.
 */
const markHired = asyncHandler(async (req, res) => {
  const shortlistId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  try {
    await shortlistService.updateStatus(
      shortlistId,
      HR_STATUSES.HIRED,
      req.session.user ? req.session.user.id : null,
      notes || null
    );

    logger.info(`Shortlist ${shortlistId} marked as hired by user ${req.session.user?.id}`);
    req.flash('success', 'Candidate marked as hired.');
  } catch (err) {
    logger.error(`Failed to mark shortlist ${shortlistId} as hired`, { error: err.message });
    req.flash('error', `Failed to mark candidate as hired: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || '/shortlist';
  return res.redirect(returnUrl);
});

module.exports = {
  index,
  shortlist,
  reject,
  hold,
  select,
  releaseOffer,
  markHired,
};
