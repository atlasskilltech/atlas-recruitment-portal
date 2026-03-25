const express = require('express');
const router = express.Router();
const aiInterviewController = require('../controllers/aiInterview.controller');

router.get('/', aiInterviewController.index);
router.get('/:id', aiInterviewController.show);
router.post('/:candidateId/invite', aiInterviewController.invite);

module.exports = router;
