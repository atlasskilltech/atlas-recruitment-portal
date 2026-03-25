// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – API Routes (JSON endpoints)
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');

// GET /api/dashboard-stats – dashboard statistics
router.get('/dashboard-stats', apiController.getDashboardStats);

// GET /api/candidates – candidate list (JSON)
router.get('/candidates', apiController.getCandidates);

// GET /api/candidates/:id – single candidate detail (JSON)
router.get('/candidates/:id', apiController.getCandidateDetail);

// GET /api/chart-data – chart data for dashboard graphs
router.get('/chart-data', apiController.getChartData);

// GET /api/search – global search endpoint
router.get('/search', apiController.searchCandidates);

// GET /api/reports – report data (JSON)
router.get('/reports', apiController.getReportsData);

module.exports = router;
