// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Super Admin Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdmin.controller');
const candidateController = require('../controllers/candidates.controller');
const aiInterviewController = require('../controllers/aiInterview.controller');

// GET /admin/jobs – Job openings card view
router.get('/jobs', superAdminController.jobOpenings);

// GET /admin/jobs/:id – Job detail with top matches
router.get('/jobs/:id', superAdminController.jobDetail);

// POST /admin/jobs/:id/bulk-invite – Send AI interview to selected candidates
router.post('/jobs/:id/bulk-invite', superAdminController.bulkInvite);

// GET /admin/candidates/:id – Candidate detail (admin context)
router.get('/candidates/:id', candidateController.show);

// POST /admin/candidates/:id/run-ai-match
router.post('/candidates/:id/run-ai-match', candidateController.runAIMatch);

// POST /admin/candidates/:id/add-note
router.post('/candidates/:id/add-note', candidateController.addNote);

// GET /admin/interviews/:id – AI interview detail (admin context)
router.get('/interviews/:id', aiInterviewController.show);

module.exports = router;
