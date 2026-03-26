const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');

router.get('/', jobController.index);
router.get('/create', jobController.create);
router.post('/', jobController.store);
router.get('/:id/top-matches', jobController.topMatches);
router.post('/:id/refresh-matches', jobController.refreshMatches);
router.get('/:id/edit', jobController.edit);
router.post('/:id', jobController.update);
router.post('/:id/toggle-visibility', jobController.toggleVisibility);

module.exports = router;
