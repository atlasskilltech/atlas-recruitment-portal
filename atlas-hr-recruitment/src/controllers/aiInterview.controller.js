// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – AI Interview Controller
// ---------------------------------------------------------------------------
const interviewService = require('../services/interview.service');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION, INTERVIEW_STATUSES_LIST, INTERVIEW_TYPES_LIST } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /ai-interview
 * List all AI interviews for admin view with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters
  const filters = {};
  if (req.query.interview_status) filters.interview_status = req.query.interview_status;
  if (req.query.candidate_id) filters.candidate_id = parseInt(req.query.candidate_id, 10);
  if (req.query.job_id) filters.job_id = parseInt(req.query.job_id, 10);
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;
  if (req.query.score_min) filters.score_min = parseFloat(req.query.score_min);
  if (req.query.score_max) filters.score_max = parseFloat(req.query.score_max);

  const interviewRepository = require('../repositories/interview.repository');
  const [interviews, total] = await Promise.all([
    interviewRepository.getInterviewsForDashboard(filters, { page, limit }),
    interviewRepository.countInterviews(filters),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Fetch job list for filter dropdown
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  res.render('ai-interview/index', {
    title: 'AI Interviews',
    interviews,
    jobs,
    filters: req.query,
    interviewStatuses: INTERVIEW_STATUSES_LIST,
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
 * GET /ai-interview/:id
 * Show interview detail for admin.
 */
const show = asyncHandler(async (req, res) => {
  const interviewId = parseInt(req.params.id, 10);
  if (!interviewId) {
    req.flash('error', 'Invalid interview ID.');
    return res.redirect('/ai-interview');
  }

  try {
    const interview = await interviewService.getInterviewDetails(interviewId);

    // Parse JSON feedback safely
    if (interview.feedback && typeof interview.feedback === 'string') {
      try {
        interview.feedback_parsed = JSON.parse(interview.feedback);
      } catch {
        interview.feedback_parsed = interview.feedback;
      }
    }

    res.render('ai-interview/detail', {
      title: `AI Interview – ${interview.candidate_name || 'Candidate'}`,
      interview,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    logger.error(`Failed to load interview ${interviewId}`, { error: err.message });
    req.flash('error', err.message);
    return res.redirect('/ai-interview');
  }
});

/**
 * POST /ai-interview/invite
 * Create an AI interview invitation for a candidate.
 */
const invite = asyncHandler(async (req, res) => {
  const { candidate_id, screening_id, interview_type } = req.body;
  const candidateId = parseInt(candidate_id, 10);

  if (!candidateId) {
    req.flash('error', 'Candidate ID is required.');
    return res.redirect('/ai-interview');
  }

  try {
    const result = await interviewService.createInterview(
      candidateId,
      screening_id ? parseInt(screening_id, 10) : null,
      interview_type || 'technical'
    );

    logger.info(`AI interview invitation created: interview=${result.id}, candidate=${candidateId}, by user=${req.session.user?.id}`);
    req.flash('success', `AI interview invitation created successfully. ${result.questions.length} questions generated.`);
  } catch (err) {
    logger.error(`Failed to create interview invitation for candidate ${candidateId}`, { error: err.message });
    req.flash('error', `Failed to create interview: ${err.message}`);
  }

  // Redirect to referrer or candidate detail
  const returnUrl = req.get('Referer') || `/candidates/${candidateId}`;
  return res.redirect(returnUrl);
});

/**
 * GET /ai-interview/take/:token
 * Candidate-facing interview page accessed via invitation token.
 */
const showInterview = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).render('errors/error', {
      title: 'Invalid Link',
      statusCode: 400,
      message: 'Interview token is missing.',
      stack: null,
    });
  }

  try {
    const interview = await interviewService.getInterviewByToken(token);

    res.render('ai-interview/take', {
      title: 'AI Interview',
      interview,
      token,
      layout: false, // Candidate-facing pages typically use no admin layout
    });
  } catch (err) {
    logger.warn(`Invalid interview token access: ${err.message}`);
    return res.status(400).render('errors/error', {
      title: 'Interview Unavailable',
      statusCode: 400,
      message: err.message,
      stack: null,
    });
  }
});

/**
 * POST /ai-interview/take/:token/start
 * Mark interview as started by the candidate.
 */
const startInterview = asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const interview = await interviewService.startInterview(token);
    return res.json({
      success: true,
      message: 'Interview started.',
      interview_id: interview.id,
      total_questions: interview.total_questions,
      questions: interview.questions,
    });
  } catch (err) {
    logger.error(`Failed to start interview with token`, { error: err.message });
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /ai-interview/:interviewId/answer
 * Save candidate's answer for a question. Returns JSON.
 */
const submitAnswer = asyncHandler(async (req, res) => {
  const interviewId = parseInt(req.params.interviewId, 10);
  const { question_id, answer_text } = req.body;

  if (!interviewId || !question_id) {
    return res.status(400).json({
      success: false,
      message: 'Interview ID and question ID are required.',
    });
  }

  if (!answer_text || !answer_text.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Answer text is required.',
    });
  }

  try {
    const answer = await interviewService.submitAnswer(
      interviewId,
      parseInt(question_id, 10),
      answer_text.trim()
    );

    return res.json({
      success: true,
      message: 'Answer submitted successfully.',
      answer,
    });
  } catch (err) {
    logger.error(`Failed to submit answer for interview ${interviewId}`, { error: err.message });
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /ai-interview/:interviewId/complete
 * Finalize and evaluate the interview.
 */
const completeInterview = asyncHandler(async (req, res) => {
  const interviewId = parseInt(req.params.interviewId, 10);

  if (!interviewId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid interview ID.',
    });
  }

  try {
    const result = await interviewService.completeInterview(interviewId);

    return res.json({
      success: true,
      message: 'Interview completed and evaluated successfully.',
      overall_score: result.overallScore,
      recommendation: result.recommendation,
      summary: result.summary,
    });
  } catch (err) {
    logger.error(`Failed to complete interview ${interviewId}`, { error: err.message });
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = {
  index,
  show,
  invite,
  showInterview,
  startInterview,
  submitAnswer,
  completeInterview,
};
