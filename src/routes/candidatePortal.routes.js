const express = require('express');
const router = express.Router();
const { isCandidateAuthenticated } = require('../middlewares/candidateAuth.middleware');
const dashboardController = require('../controllers/candidateDashboard.controller');
const applicationsController = require('../controllers/candidateApplications.controller');
const profileController = require('../controllers/candidateProfile.controller');
const notificationsController = require('../controllers/candidateNotifications.controller');
const supportController = require('../controllers/candidateSupport.controller');

// Dashboard
router.get('/dashboard', isCandidateAuthenticated, dashboardController.index);

// Applications
router.get('/applications', isCandidateAuthenticated, applicationsController.list);
router.get('/applications/:id', isCandidateAuthenticated, applicationsController.detail);

// Profile
router.get('/profile', isCandidateAuthenticated, profileController.show);

// Notifications
router.get('/notifications', isCandidateAuthenticated, notificationsController.index);
router.post('/notifications/:id/read', isCandidateAuthenticated, notificationsController.markRead);

// Help & Support
router.get('/help', isCandidateAuthenticated, supportController.index);
router.post('/help/contact', isCandidateAuthenticated, supportController.create);

module.exports = router;
