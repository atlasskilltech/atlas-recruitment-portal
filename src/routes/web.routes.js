// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Main Web Router
// ---------------------------------------------------------------------------
// Mounts all sub-routers and applies authentication guards where needed.
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// Sub-routers
const authRoutes = require('./auth.routes');
const candidateRoutes = require('./candidate.routes');
const aiRoutes = require('./ai.routes');
const { publicRouter: aiPublicRoutes } = require('./ai.routes');
const aiScreeningRoutes = require('./aiScreening.routes');
const aiInterviewRoutes = require('./aiInterview.routes');
const shortlistRoutes = require('./shortlist.routes');
const scheduleRoutes = require('./schedule.routes');
const jobRoutes = require('./job.routes');
const notificationRoutes = require('./notification.routes');
const reportRoutes = require('./report.routes');
const apiRoutes = require('./api.routes');

// ---- Root redirect --------------------------------------------------------
router.get('/', (req, res) => res.redirect('/dashboard'));

// ---- Auth routes (login / logout) – no auth guard -------------------------
router.use('/', authRoutes);

// ---- Dashboard (protected) ------------------------------------------------
router.get('/dashboard', isAuthenticated, dashboardController.index);

// ---- Public AI interview routes (candidate-facing, no auth) ---------------
router.use('/ai', aiPublicRoutes);

// ---- Protected routes -----------------------------------------------------
router.use('/candidates', isAuthenticated, candidateRoutes);
router.use('/ai', isAuthenticated, aiRoutes);
router.use('/ai-screening', isAuthenticated, aiScreeningRoutes);
router.use('/ai-interviews', isAuthenticated, aiInterviewRoutes);
router.use('/ai-interview', isAuthenticated, aiInterviewRoutes); // alias (singular)
router.use('/jobs', isAuthenticated, jobRoutes);
router.use('/shortlist', isAuthenticated, shortlistRoutes);
router.use('/schedules', isAuthenticated, scheduleRoutes);
router.use('/notifications', isAuthenticated, notificationRoutes);
router.use('/reports', isAuthenticated, reportRoutes);
router.use('/api', isAuthenticated, apiRoutes);

module.exports = router;
