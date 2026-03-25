// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Authentication Routes
// ---------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isGuest, isAuthenticated } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { loginRules } = require('../validations/auth.validation');

router.get('/login', isGuest, authController.showLogin);
router.post('/login', isGuest, validate(loginRules), authController.login);
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;
