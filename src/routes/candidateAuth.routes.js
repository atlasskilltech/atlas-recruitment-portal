const express = require('express');
const router = express.Router();
const candidateAuthController = require('../controllers/candidateAuth.controller');
const { isCandidateGuest } = require('../middlewares/candidateAuth.middleware');

router.get('/login', isCandidateGuest, candidateAuthController.showLogin);
router.post('/send-otp', isCandidateGuest, candidateAuthController.sendOTP);
router.get('/send-otp', (req, res) => res.redirect('/candidate/login'));
router.get('/verify-otp', candidateAuthController.showVerifyOTP);
router.post('/verify-otp', candidateAuthController.verifyOTP);
router.get('/logout', candidateAuthController.logout);

module.exports = router;
