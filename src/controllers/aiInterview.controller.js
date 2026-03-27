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
    `SELECT id, COALESCE(applied_for_post, applied_job_short_desc_new) AS title,
            applied_for_post_id FROM isdi_admsn_applied_for ORDER BY applied_for_post_id, applied_for_post`
  );

  // Compute interview stats for the summary cards
  const [statsRows] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN aint.status = 'pending' OR aint.status = 'invited' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN aint.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN aint.status IN ('evaluated','submitted') THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN aint.status = 'passed' OR (aint.status = 'evaluated' AND aint.total_score >= 50) THEN 1 ELSE 0 END) AS passed,
      SUM(CASE WHEN aint.status = 'failed' OR (aint.status = 'evaluated' AND aint.total_score < 50) THEN 1 ELSE 0 END) AS failed
    FROM atlas_rec_ai_interviews aint
    INNER JOIN (
      SELECT candidate_id, MAX(id) AS max_id
      FROM atlas_rec_ai_interviews GROUP BY candidate_id
    ) latest ON aint.id = latest.max_id
  `);
  const interviewStats = statsRows[0] || { total: 0, pending: 0, in_progress: 0, completed: 0, passed: 0, failed: 0 };

  res.render('ai-interview/index', {
    title: 'AI Interviews',
    interviews,
    stats: interviewStats,
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
      questions: interview.questions || [],
      answers: interview.answers || [],
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
 * POST /ai-interview/:interviewId/answer  (admin route, uses interviewId)
 * POST /ai/interview/:token/answer        (public route, uses token)
 * Save candidate's answer for a question. Returns JSON.
 */
const submitAnswer = asyncHandler(async (req, res) => {
  let interviewId = parseInt(req.params.interviewId, 10);
  const { question_id, answer_text } = req.body;

  // If accessed via token (public route), resolve interviewId from token
  if (!interviewId && req.params.token) {
    try {
      const interview = await interviewService.getInterviewByToken(req.params.token);
      interviewId = interview.id;
      logger.info(`[INTERVIEW] Answer via token: resolved interviewId=${interviewId}`);
    } catch (err) {
      logger.error(`[INTERVIEW] Token resolve failed: ${err.message}`);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  logger.info(`[INTERVIEW] submitAnswer: interviewId=${interviewId}, questionId=${question_id}, answerLen=${(answer_text || '').length}`);

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
 * POST /ai-interview/:interviewId/complete  (admin route)
 * POST /ai/interview/:token/submit          (public route, uses token)
 * Finalize and evaluate the interview.
 */
const completeInterview = asyncHandler(async (req, res) => {
  let interviewId = parseInt(req.params.interviewId, 10);

  // If accessed via token (public route), resolve interviewId from token
  if (!interviewId && req.params.token) {
    try {
      const interview = await interviewService.getInterviewByToken(req.params.token);
      interviewId = interview.id;
      logger.info(`[INTERVIEW] Complete via token: resolved interviewId=${interviewId}`);
    } catch (err) {
      logger.error(`[INTERVIEW] Complete token resolve failed: ${err.message}`);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  logger.info(`[INTERVIEW] completeInterview called: interviewId=${interviewId}`);

  if (!interviewId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid interview ID.',
    });
  }

  try {
    // Immediately mark as submitted and respond — evaluation runs in background
    const interviewRepository = require('../repositories/interview.repository');
    await interviewRepository.update(interviewId, {
      interview_status: 'submitted',
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    logger.info(`[INTERVIEW] Interview ${interviewId} marked as submitted, starting background evaluation`);

    // Respond immediately so the candidate sees "Interview Submitted!"
    res.json({
      success: true,
      message: 'Interview submitted. Evaluation in progress.',
    });

    // Run evaluation in background (after response is sent)
    setTimeout(() => {
      interviewService.completeInterview(interviewId)
        .then((result) => {
          logger.info(`[INTERVIEW] Background evaluation completed for ${interviewId}: score=${result.overallScore}`);
        })
        .catch((evalErr) => {
          logger.error(`[INTERVIEW] Background evaluation FAILED for ${interviewId}: ${evalErr.message}`, { stack: evalErr.stack });
        });
    }, 1000);
  } catch (err) {
    logger.error(`Failed to submit interview ${interviewId}`, { error: err.message });
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /ai-interviews/invite/:candidateId
 * Create interview (if not exists) + send email with link. Redirects back.
 */
const inviteGet = asyncHandler(async (req, res) => {
  const candidateId = parseInt(req.params.candidateId, 10);

  if (!candidateId) {
    req.flash('error', 'Candidate ID is required.');
    return res.redirect('/ai-interviews');
  }

  try {
    // Check if candidate already has an active interview
    const interviewRepository = require('../repositories/interview.repository');
    const existing = await interviewRepository.findByCandidateId(candidateId);
    // Only reuse if candidate has actually started or completed the interview
    const activeInterview = existing.find(iv => {
      const s = iv.interview_status || iv.status;
      return ['in_progress', 'evaluated', 'passed', 'submitted'].includes(s);
    });

    let interviewLink;
    let result;

    if (activeInterview) {
      // Interview started/completed — reuse the link
      interviewLink = `${process.env.APP_URL || 'https://recruitment.atlasskilltech.app'}/ai/interview/${activeInterview.invitation_token}`;
      result = activeInterview;
      logger.info(`[INTERVIEW] Reusing active interview for candidate ${candidateId}: id=${result.id}`);
    } else {
      // Delete any old invited/expired/pending interviews and create fresh
      for (const old of existing) {
        const s = old.interview_status || old.status;
        if (['invited', 'expired', 'pending', 'failed'].includes(s)) {
          logger.info(`[INTERVIEW] Deleting old interview ${old.id} (status=${s}) for candidate ${candidateId}`);
          await pool.query('DELETE FROM atlas_rec_ai_interview_answers WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interview_questions WHERE interview_id = ?', [old.id]);
          await pool.query('DELETE FROM atlas_rec_ai_interviews WHERE id = ?', [old.id]);
        }
      }

      // Create new interview with fresh AI questions
      result = await interviewService.createInterview(candidateId, null, 'hr');
      interviewLink = `${process.env.APP_URL || 'https://recruitment.atlasskilltech.app'}/ai/interview/${result.token}`;
      logger.info(`[INTERVIEW] New interview created for candidate ${candidateId}: id=${result.id}`);
    }

    // Send email with interview link to admin
    try {
      const notificationService = require('../services/notification.service');
      // Get candidate name
      const candidateRepo = require('../repositories/candidate.repository');
      const candidate = await candidateRepo.findById(candidateId);
      const candidateName = candidate?.appln_full_name || 'Candidate';

      const templateData = notificationService.getTemplateMessage('ai_interview_invite', {
        candidateName: candidateName,
        jobTitle: candidate?.applied_for_post || candidate?.applied_job_short_desc_new || candidate?.job_title || 'the applied position',
        interviewLink: interviewLink,
        expiresIn: '10 days',
      });

      if (templateData) {
        await notificationService.sendNotification({
          candidate_id: candidateId,
          type: 'interview_invite',
          title: templateData.subject,
          message: templateData.message,
          channel: 'email',
        });
      }

      req.flash('success', `Interview invitation created and email sent. Link: ${interviewLink}`);
    } catch (emailErr) {
      logger.warn(`[INTERVIEW] Email failed: ${emailErr.message}`);
      req.flash('success', `Interview created but email failed. Link: ${interviewLink}`);
    }
  } catch (err) {
    logger.error(`[INTERVIEW] Invite failed for candidate ${candidateId}`, { error: err.message });
    req.flash('error', `Failed to create interview: ${err.message}`);
  }

  const returnUrl = req.get('Referer') || `/candidates/${candidateId}`;
  return res.redirect(returnUrl);
});

module.exports = {
  index,
  show,
  invite,
  inviteGet,
  showInterview,
  startInterview,
  submitAnswer,
  completeInterview,
};
