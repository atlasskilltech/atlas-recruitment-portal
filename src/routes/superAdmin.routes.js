// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Super Admin Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdmin.controller');

// GET /admin/jobs – Job openings card view
router.get('/jobs', superAdminController.jobOpenings);

// GET /admin/jobs/:id – Job detail with top matches
router.get('/jobs/:id', superAdminController.jobDetail);

// POST /admin/jobs/:id/bulk-invite – Send AI interview to selected candidates
router.post('/jobs/:id/bulk-invite', superAdminController.bulkInvite);

module.exports = router;
