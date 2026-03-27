// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Report Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// GET /reports – show reports dashboard
router.get('/', reportController.index);

// GET /reports/export/:format – export report data (csv, pdf, excel)
router.get('/export/:format', reportController.exportReport);

module.exports = router;
