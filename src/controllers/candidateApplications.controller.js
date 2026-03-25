const { asyncHandler } = require('../middlewares/error.middleware');
const portalService = require('../services/candidatePortal.service');
const statusService = require('../services/candidateStatus.service');

const list = asyncHandler(async (req, res) => {
  const email = req.session.candidate.email;
  const applications = await portalService.getApplicationsForEmail(email);

  const appsWithStatus = applications.map(app => ({
    ...app,
    statusInfo: statusService.mapToStage(
      app,
      app.ai_status ? { ai_status: app.ai_status } : null,
      app.interview_status ? { status: app.interview_status } : null,
      app.hr_status ? { hr_status: app.hr_status } : null,
      app.scheduled_date ? { scheduled_date: app.scheduled_date } : null
    ),
  }));

  res.render('candidate/applications/index', {
    layout: 'candidate/layouts/candidate-main',
    title: 'My Applications',
    applications: appsWithStatus,
  });
});

const detail = asyncHandler(async (req, res) => {
  const email = req.session.candidate.email;
  const id = parseInt(req.params.id, 10);
  const app = await portalService.getApplicationById(id, email);

  if (!app) {
    req.flash('error', 'Application not found.');
    return res.redirect('/candidate/applications');
  }

  const documents = await portalService.getDocumentsForCandidate(id);
  const statusInfo = statusService.mapToStage(
    app,
    app.ai_status ? { ai_status: app.ai_status, ai_match_score: app.ai_match_score, role_fit_summary: app.role_fit_summary } : null,
    app.interview_status ? { status: app.interview_status, total_score: app.interview_score } : null,
    app.hr_status ? { hr_status: app.hr_status } : null,
    app.scheduled_date ? { scheduled_date: app.scheduled_date } : null
  );

  res.render('candidate/applications/detail', {
    layout: 'candidate/layouts/candidate-main',
    title: `Application - ${app.job_title || 'Details'}`,
    app,
    documents,
    statusInfo,
  });
});

module.exports = { list, detail };
