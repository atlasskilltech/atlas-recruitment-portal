// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Notification Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications.controller');

// GET /notifications – list all notifications
router.get('/', notificationController.index);

module.exports = router;
