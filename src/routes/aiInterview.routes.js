const express = require('express');
const router = express.Router();
const aiInterviewController = require('../controllers/aiInterview.controller');

router.get('/', aiInterviewController.index);
router.get('/invite/:candidateId', aiInterviewController.inviteGet); // GET: create + send email
router.post('/invite/:candidateId', aiInterviewController.invite);  // POST: same
router.get('/:id', aiInterviewController.show);

module.exports = router;
