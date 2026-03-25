const express = require('express');
const router = express.Router();
const aiScreeningController = require('../controllers/aiScreening.controller');

router.get('/', aiScreeningController.index);
router.get('/:id', aiScreeningController.show);
router.post('/:candidateId/run', aiScreeningController.runMatch);
router.post('/bulk-run', aiScreeningController.bulkMatch);
router.post('/:id/retry', aiScreeningController.retry);

module.exports = router;
