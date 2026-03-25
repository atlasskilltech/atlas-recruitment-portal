// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – AI Routes (Screening & Interviews)
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const aiScreeningController = require('../controllers/aiScreening.controller');
const aiInterviewController = require('../controllers/aiInterview.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');

// ---- AI Screening (all protected) ----------------------------------------

router.get('/screening', aiScreeningController.index);
router.get('/screening/:id', aiScreeningController.show);
router.post('/screening/:candidateId/run', aiScreeningController.runMatch);
router.post('/screening/bulk-run', aiScreeningController.bulkMatch);
router.post('/screening/:id/retry', aiScreeningController.retry);

// ---- AI Interview – Admin views (protected) --------------------------------

router.get('/interviews', aiInterviewController.index);
router.get('/interviews/:id', aiInterviewController.show);
router.post('/interviews/:candidateId/invite', aiInterviewController.invite);

// ---- AI Interview – Candidate-facing (public, no auth) ---------------------
// These routes are accessed by candidates via a unique token link.
// They are mounted here but explicitly skip the isAuthenticated guard that
// wraps the parent /ai router in web.routes.js by being re-mounted at the
// web-router level. See web.routes.js for the public mount.

module.exports = router;

// Also export a separate router for the public candidate interview routes
// so they can be mounted outside the authenticated boundary.
const publicRouter = express.Router();

publicRouter.get('/interview/:token', aiInterviewController.showInterview);
publicRouter.post('/interview/:token/start', aiInterviewController.startInterview);
publicRouter.post('/interview/:token/answer', aiInterviewController.submitAnswer);
publicRouter.post('/interview/:token/submit', aiInterviewController.completeInterview);

module.exports.publicRouter = publicRouter;
