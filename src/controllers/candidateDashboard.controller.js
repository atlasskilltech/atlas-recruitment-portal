const { asyncHandler } = require('../middlewares/error.middleware');
const portalService = require('../services/candidatePortal.service');
const statusService = require('../services/candidateStatus.service');

const index = asyncHandler(async (req, res) => {
  const email = req.session.candidate.email;
  const candidateIds = req.session.candidate.candidate_ids;

  const applications = await portalService.getApplicationsForEmail(email);
  const notifications = await portalService.getNotificationsForCandidate(candidateIds, 5);
  const upcomingSchedules = await portalService.getUpcomingSchedules(candidateIds);

  // Compute status for each application
  const appsWithStatus = applications.map(app => ({
    ...app,
    statusInfo: statusService.mapToStage(
      app,
      app.ai_status ? { ai_status: app.ai_status, ai_match_score: app.ai_match_score } : null,
      app.interview_status ? { status: app.interview_status, total_score: app.interview_score } : null,
      app.hr_status ? { hr_status: app.hr_status } : null,
      app.scheduled_date ? { scheduled_date: app.scheduled_date } : null
    ),
  }));

  // Summary stats
  const stats = {
    total: applications.length,
    active: applications.filter(a => !['rejected', 'hired'].includes(String(a.appln_status_new || '').toLowerCase())).length,
    aiEligible: applications.filter(a => String(a.ai_status || '').toLowerCase() === 'eligible').length,
    interviewPending: applications.filter(a => ['pending', 'invited'].includes(String(a.interview_status || '').toLowerCase())).length,
    scheduled: applications.filter(a => a.scheduled_date).length,
    selected: applications.filter(a => ['hired', 'selected', 'offer_released'].includes(String(a.hr_status || '').toLowerCase())).length,
  };

  res.render('candidate/dashboard/index', {
    layout: 'candidate/layouts/candidate-main',
    title: 'My Dashboard',
    applications: appsWithStatus,
    stats,
    notifications,
    upcomingSchedules,
    candidate: req.session.candidate,
  });
});

module.exports = { index };
