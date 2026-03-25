// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Candidates Controller
// ---------------------------------------------------------------------------
const candidateService = require('../services/candidate.service');
const screeningService = require('../services/screening.service');
const noteRepository = require('../repositories/note.repository');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION, HR_STATUSES_LIST, AI_STATUSES_LIST } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /candidates
 * List candidates with filters, search, and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters from query params
  const filters = {};
  if (req.query.search) {
    filters.name = req.query.search;
  }
  if (req.query.name) filters.name = req.query.name;
  if (req.query.email) filters.email = req.query.email;
  if (req.query.mobile) filters.mobile = req.query.mobile;
  if (req.query.job_id) filters.job_id = req.query.job_id;
  if (req.query.department) filters.department = req.query.department;
  if (req.query.hr_status) filters.hr_status = req.query.hr_status;
  if (req.query.ai_status) filters.ai_status = req.query.ai_status;
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;
  if (req.query.match_score_min) filters.match_score_min = parseFloat(req.query.match_score_min);
  if (req.query.match_score_max) filters.match_score_max = parseFloat(req.query.match_score_max);
  if (req.query.interview_score_min) filters.interview_score_min = parseFloat(req.query.interview_score_min);
  if (req.query.interview_score_max) filters.interview_score_max = parseFloat(req.query.interview_score_max);
  if (req.query.qualification) filters.qualification = req.query.qualification;
  if (req.query.experience_min) filters.experience_min = parseFloat(req.query.experience_min);
  if (req.query.experience_max) filters.experience_max = parseFloat(req.query.experience_max);
  if (req.query.location) filters.location = req.query.location;

  // Sorting
  if (req.query.sort_by) {
    filters.sort = {
      field: req.query.sort_by,
      order: req.query.sort_order || 'DESC',
    };
  }

  const { candidates, total } = await candidateService.getAllCandidates(filters, { page, limit });

  const totalPages = Math.ceil(total / limit);

  // Fetch job list for filter dropdown
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  res.render('candidates/index', {
    title: 'Candidates',
    candidates,
    jobs,
    filters: req.query,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    hrStatuses: HR_STATUSES_LIST,
    aiStatuses: AI_STATUSES_LIST,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * GET /candidates/:id
 * Full candidate detail page with all tabs data.
 */
const show = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.id, 10);
  if (!candidateId) {
    req.flash('error', 'Invalid candidate ID.');
    return res.redirect('/candidates');
  }

  const candidate = await candidateService.getCandidateById(candidateId);
  if (!candidate) {
    req.flash('error', 'Candidate not found.');
    return res.redirect('/candidates');
  }

  // Fetch HR notes for the candidate
  const notes = await noteRepository.findByCandidateId(candidateId);

  // Fetch activity/audit logs
  const [activityLogs] = await pool.query(
    `SELECT * FROM atlas_rec_activity_logs
     WHERE candidate_id = ?
     ORDER BY created_at DESC LIMIT 50`,
    [candidateId]
  );

  // Fetch status history
  const [statusHistory] = await pool.query(
    `SELECT * FROM atlas_rec_status_history
     WHERE candidate_id = ?
     ORDER BY created_at DESC`,
    [candidateId]
  );

  res.render('candidates/detail', {
    title: `Candidate – ${candidate.appln_full_name}`,
    candidate,
    notes,
    activityLogs,
    statusHistory,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /candidates/:id/notes
 * Save an HR note for a candidate.
 */
const addNote = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.id, 10);
  const { note_text, note_type } = req.body;

  if (!note_text || !note_text.trim()) {
    req.flash('error', 'Note text is required.');
    return res.redirect(`/candidates/${candidateId}`);
  }

  await noteRepository.create({
    candidate_id: candidateId,
    user_id: req.session.user ? req.session.user.id : null,
    note_type: note_type || 'general',
    note_text: note_text.trim(),
  });

  logger.info(`HR note added for candidate ${candidateId} by user ${req.session.user?.id}`);
  req.flash('success', 'Note added successfully.');
  return res.redirect(`/candidates/${candidateId}`);
});

/**
 * POST /candidates/:id/ai-match
 * Run AI screening match for a single candidate.
 */
const runAIMatch = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.id, 10);

  try {
    const result = await screeningService.runAIMatch(candidateId);
    req.flash('success', `AI screening completed. Match score: ${result.match_score || 'N/A'}`);
  } catch (err) {
    logger.error(`AI match failed for candidate ${candidateId}`, { error: err.message });
    req.flash('error', `AI screening failed: ${err.message}`);
  }

  return res.redirect(`/candidates/${candidateId}`);
});

/**
 * POST /candidates/bulk-ai-match
 * Run AI match for selected candidates.
 */
const bulkAIMatch = asyncHandler(async (req, res) => {
  const { candidate_ids } = req.body;

  if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
    req.flash('error', 'Please select at least one candidate.');
    return res.redirect('/candidates');
  }

  const ids = candidate_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const { results, errors } = await screeningService.runBulkAIMatch(ids);

  if (errors.length > 0) {
    req.flash('error', `AI screening completed with ${errors.length} error(s) out of ${ids.length} candidate(s).`);
  } else {
    req.flash('success', `AI screening completed successfully for ${results.length} candidate(s).`);
  }

  return res.redirect('/candidates');
});

/**
 * GET /candidates/export
 * Export filtered candidate list as CSV, Excel, or PDF.
 */
const exportList = asyncHandler(async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();

  // Build filters from query params (same as index)
  const filters = {};
  if (req.query.search) filters.name = req.query.search;
  if (req.query.name) filters.name = req.query.name;
  if (req.query.email) filters.email = req.query.email;
  if (req.query.job_id) filters.job_id = req.query.job_id;
  if (req.query.hr_status) filters.hr_status = req.query.hr_status;
  if (req.query.ai_status) filters.ai_status = req.query.ai_status;
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;
  if (req.query.match_score_min) filters.match_score_min = parseFloat(req.query.match_score_min);
  if (req.query.match_score_max) filters.match_score_max = parseFloat(req.query.match_score_max);

  // Fetch all matching candidates (no pagination limit for export)
  const { candidates } = await candidateService.getAllCandidates(filters, { page: 1, limit: 5000 });

  if (format === 'csv') {
    // Generate CSV
    const csvHeaders = [
      'ID', 'Name', 'Email', 'Mobile', 'Job Title', 'Experience',
      'Qualification', 'Application Date', 'HR Status', 'AI Status',
      'Match Score', 'Interview Score',
    ];

    const csvRows = candidates.map((c) => [
      c.id,
      `"${(c.appln_full_name || '').replace(/"/g, '""')}"`,
      c.appln_email || '',
      c.appln_mobile_no || '',
      `"${(c.applied_job_short_desc_new || '').replace(/"/g, '""')}"`,
      c.appln_total_experience || '',
      `"${(c.appln_high_qualification || '').replace(/"/g, '""')}"`,
      c.appln_date || '',
      c.appln_status_new || '',
      c.screening_status || '',
      c.match_score != null ? c.match_score : '',
      c.overall_score != null ? c.overall_score : '',
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="candidates_export_${Date.now()}.csv"`);
    return res.send(csvContent);
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="candidates_export_${Date.now()}.json"`);
    return res.json({ candidates });
  }

  // Default: return CSV for unsupported formats
  req.flash('error', `Export format "${format}" is not supported. Please use CSV or JSON.`);
  return res.redirect('/candidates');
});

module.exports = {
  index,
  show,
  addNote,
  runAIMatch,
  bulkAIMatch,
  exportList,
};
