// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Candidate Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidates.controller');

// GET /candidates/export – export candidate list (must be before /:id)
router.get('/export', candidateController.exportList);

// GET /candidates – list all candidates
router.get('/', candidateController.index);

// GET /candidates/:id – show candidate detail
router.get('/:id', candidateController.show);

// POST /candidates/:id/run-ai-match – run AI match for a single candidate
router.post('/:id/run-ai-match', candidateController.runAIMatch);

// POST /candidates/bulk/run-ai-match – run AI match for multiple candidates
router.post('/bulk/run-ai-match', candidateController.bulkAIMatch);

// POST /candidates/:id/add-note – add a note to a candidate
router.post('/:id/add-note', candidateController.addNote);

module.exports = router;
