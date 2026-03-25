// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Schedule Controller
// ---------------------------------------------------------------------------
const scheduleRepository = require('../repositories/schedule.repository');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /schedules
 * List all scheduled interviews with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.candidate_id) filters.candidate_id = parseInt(req.query.candidate_id, 10);
  if (req.query.job_id) filters.job_id = parseInt(req.query.job_id, 10);
  if (req.query.interview_type) filters.interview_type = req.query.interview_type;
  if (req.query.interviewer_name) filters.interviewer_name = req.query.interviewer_name;
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;

  const [schedules, total] = await Promise.all([
    scheduleRepository.findAll(filters, { page, limit }),
    scheduleRepository.countAll(filters),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Fetch upcoming schedules for sidebar/widget
  const upcoming = await scheduleRepository.findUpcoming();

  // Fetch job list for filter dropdown
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  res.render('schedules/index', {
    title: 'Interview Schedules',
    schedules,
    upcoming,
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
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * GET /schedules/create
 * Show the schedule creation form.
 */
const create = asyncHandler(async (req, res) => {
  // Pre-fill candidate if provided in query
  let candidate = null;
  if (req.query.candidate_id) {
    const candidateService = require('../services/candidate.service');
    candidate = await candidateService.getCandidateById(parseInt(req.query.candidate_id, 10));
  }

  // Fetch job list
  const [jobs] = await pool.query(
    'SELECT id, applied_job_short_desc_new AS title FROM isdi_admsn_applied_for ORDER BY applied_job_short_desc_new'
  );

  // Fetch shortlisted candidates for selection dropdown
  const [candidates] = await pool.query(`
    SELECT dsr.id, dsr.appln_full_name, dsr.appln_email,
      job.applied_job_short_desc_new AS job_title
    FROM dice_staff_recruitment dsr
    LEFT JOIN isdi_admsn_applied_for job ON dsr.appln_applied_for_sub = job.id
    WHERE dsr.appln_status_new IN ('shortlisted', 'selected', 'scheduled')
    ORDER BY dsr.appln_full_name
  `);

  res.render('schedules/create', {
    title: 'Schedule Interview',
    candidate,
    candidates,
    jobs,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /schedules
 * Save a new interview schedule.
 */
const store = asyncHandler(async (req, res) => {
  const {
    candidate_id, job_id, shortlist_id, interview_type,
    interviewer_name, interviewer_email,
    scheduled_date, scheduled_time, duration_minutes,
    meeting_link, location, notes,
  } = req.body;

  const candidateId = parseInt(candidate_id, 10);

  if (!candidateId || !scheduled_date || !scheduled_time) {
    req.flash('error', 'Candidate, date, and time are required to schedule an interview.');
    return res.redirect('/schedules/create');
  }

  try {
    const schedule = await scheduleRepository.create({
      candidate_id: candidateId,
      job_id: job_id ? parseInt(job_id, 10) : null,
      shortlist_id: shortlist_id ? parseInt(shortlist_id, 10) : null,
      interview_type: interview_type || 'in-person',
      interviewer_name: interviewer_name || null,
      interviewer_email: interviewer_email || null,
      scheduled_date,
      scheduled_time,
      duration_minutes: duration_minutes ? parseInt(duration_minutes, 10) : 60,
      meeting_link: meeting_link || null,
      location: location || null,
      status: 'scheduled',
      notes: notes || null,
      created_by: req.session.user ? req.session.user.id : null,
    });

    // Update candidate status to 'scheduled'
    await pool.query(
      'UPDATE dice_staff_recruitment SET appln_status_new = ? WHERE id = ?',
      ['scheduled', candidateId]
    );

    logger.info(`Interview scheduled: id=${schedule.id}, candidate=${candidateId}, date=${scheduled_date}, by user=${req.session.user?.id}`);
    req.flash('success', 'Interview scheduled successfully.');
    return res.redirect(`/schedules/${schedule.id}`);
  } catch (err) {
    logger.error('Failed to create interview schedule', { error: err.message });
    req.flash('error', `Failed to schedule interview: ${err.message}`);
    return res.redirect('/schedules/create');
  }
});

/**
 * GET /schedules/:id
 * Show schedule detail.
 */
const show = asyncHandler(async (req, res) => {
  const scheduleId = parseInt(req.params.id, 10);
  if (!scheduleId) {
    req.flash('error', 'Invalid schedule ID.');
    return res.redirect('/schedules');
  }

  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule) {
    req.flash('error', 'Schedule not found.');
    return res.redirect('/schedules');
  }

  res.render('schedules/detail', {
    title: `Schedule – ${schedule.candidate_name || 'Interview'}`,
    schedule,
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

/**
 * POST /schedules/:id/reschedule
 * Update an existing schedule (reschedule).
 */
const reschedule = asyncHandler(async (req, res) => {
  const scheduleId = parseInt(req.params.id, 10);
  const {
    scheduled_date, scheduled_time, duration_minutes,
    interviewer_name, interviewer_email,
    meeting_link, location, interview_type, notes,
  } = req.body;

  if (!scheduleId) {
    req.flash('error', 'Invalid schedule ID.');
    return res.redirect('/schedules');
  }

  try {
    const updateData = {};
    if (scheduled_date) updateData.scheduled_date = scheduled_date;
    if (scheduled_time) updateData.scheduled_time = scheduled_time;
    if (duration_minutes) updateData.duration_minutes = parseInt(duration_minutes, 10);
    if (interviewer_name !== undefined) updateData.interviewer_name = interviewer_name;
    if (interviewer_email !== undefined) updateData.interviewer_email = interviewer_email;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (location !== undefined) updateData.location = location;
    if (interview_type) updateData.interview_type = interview_type;
    if (notes !== undefined) updateData.notes = notes;
    updateData.status = 'rescheduled';

    await scheduleRepository.update(scheduleId, updateData);

    logger.info(`Schedule ${scheduleId} rescheduled by user ${req.session.user?.id}`);
    req.flash('success', 'Interview rescheduled successfully.');
  } catch (err) {
    logger.error(`Failed to reschedule schedule ${scheduleId}`, { error: err.message });
    req.flash('error', `Failed to reschedule: ${err.message}`);
  }

  return res.redirect(`/schedules/${scheduleId}`);
});

/**
 * POST /schedules/:id/cancel
 * Cancel a scheduled interview.
 */
const cancel = asyncHandler(async (req, res) => {
  const scheduleId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  if (!scheduleId) {
    req.flash('error', 'Invalid schedule ID.');
    return res.redirect('/schedules');
  }

  try {
    await scheduleRepository.update(scheduleId, {
      status: 'cancelled',
      notes: notes || undefined,
    });

    logger.info(`Schedule ${scheduleId} cancelled by user ${req.session.user?.id}`);
    req.flash('success', 'Interview cancelled successfully.');
  } catch (err) {
    logger.error(`Failed to cancel schedule ${scheduleId}`, { error: err.message });
    req.flash('error', `Failed to cancel interview: ${err.message}`);
  }

  return res.redirect('/schedules');
});

module.exports = {
  index,
  create,
  store,
  show,
  reschedule,
  cancel,
};
