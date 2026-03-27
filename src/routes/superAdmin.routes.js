// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Super Admin Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdmin.controller');

// GET /admin/jobs – Job openings card view
router.get('/jobs', superAdminController.jobOpenings);

module.exports = router;
