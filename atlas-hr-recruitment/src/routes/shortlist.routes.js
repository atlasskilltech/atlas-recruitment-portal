// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Shortlist Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const shortlistController = require('../controllers/shortlist.controller');

// GET /shortlist – view shortlisted candidates
router.get('/', shortlistController.index);

// POST /shortlist/:candidateId/shortlist – add candidate to shortlist
router.post('/:candidateId/shortlist', shortlistController.shortlist);

// POST /shortlist/:candidateId/reject – reject candidate
router.post('/:candidateId/reject', shortlistController.reject);

// POST /shortlist/:candidateId/hold – put candidate on hold
router.post('/:candidateId/hold', shortlistController.hold);

// POST /shortlist/:candidateId/select – select candidate
router.post('/:candidateId/select', shortlistController.select);

// POST /shortlist/:candidateId/offer – release offer to candidate
router.post('/:candidateId/offer', shortlistController.releaseOffer);

// POST /shortlist/:candidateId/hired – mark candidate as hired
router.post('/:candidateId/hired', shortlistController.markHired);

module.exports = router;
