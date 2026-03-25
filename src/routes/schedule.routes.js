// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Schedule Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');

// GET /schedules – list all schedules
router.get('/', scheduleController.index);

// GET /schedules/create – show create schedule form
router.get('/create', scheduleController.create);
router.get('/create/:candidateId', scheduleController.create);

// POST /schedules – store a new schedule
router.post('/', scheduleController.store);

// GET /schedules/:id – show schedule detail
router.get('/:id', scheduleController.show);

// POST /schedules/:id/reschedule – reschedule an interview
router.post('/:id/reschedule', scheduleController.reschedule);

// POST /schedules/:id/cancel – cancel a scheduled interview
router.post('/:id/cancel', scheduleController.cancel);

module.exports = router;
