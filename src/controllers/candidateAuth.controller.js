const { asyncHandler } = require('../middlewares/error.middleware');
const candidateAuthService = require('../services/candidateAuth.service');
const logger = require('../utils/logger');

const showLogin = (req, res) => {
  // Prevent browser caching so flash messages are always visible after redirect
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.render('candidate/auth/login', {
    layout: 'candidate/layouts/candidate-auth',
    title: 'Candidate Login',
    error: req.flash('error'),
    success: req.flash('success'),
  });
};

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  logger.info(`[CANDIDATE_LOGIN] OTP request for email: ${email || 'EMPTY'}`);

  if (!email) {
    req.flash('error', 'Please enter your email address.');
    return res.redirect('/candidate/login');
  }

  try {
    const result = await candidateAuthService.requestOTP(email);
    logger.info(`[CANDIDATE_LOGIN] OTP result for ${email}: success=${result.success}, message=${result.message}`);

    if (!result.success) {
      req.flash('error', result.message);
      return res.redirect('/candidate/login');
    }

    req.session.candidateOTPEmail = email.trim().toLowerCase();
    req.session.candidateOTPCode = result.otp; // Store for dev bypass display
    req.flash('success', result.message);
    return res.redirect('/candidate/verify-otp');
  } catch (err) {
    logger.error(`[CANDIDATE_LOGIN] OTP error for ${email}: ${err.message}`, { stack: err.stack });
    req.flash('error', `Login error: ${err.message}`);
    return res.redirect('/candidate/login');
  }
});

const showVerifyOTP = (req, res) => {
  if (!req.session.candidateOTPEmail) {
    return res.redirect('/candidate/login');
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.render('candidate/auth/verify-otp', {
    layout: 'candidate/layouts/candidate-auth',
    title: 'Verify OTP',
    email: req.session.candidateOTPEmail,
    devOTP: req.session.candidateOTPCode || null,
    error: req.flash('error'),
    success: req.flash('success'),
  });
};

const verifyOTP = asyncHandler(async (req, res) => {
  const email = req.session.candidateOTPEmail;
  const { otp } = req.body;

  if (!email) {
    req.flash('error', 'Session expired. Please start again.');
    return res.redirect('/candidate/login');
  }

  if (!otp) {
    req.flash('error', 'Please enter the OTP.');
    return res.redirect('/candidate/verify-otp');
  }

  const result = await candidateAuthService.verifyOTP(email, otp.trim());
  if (!result.success) {
    req.flash('error', result.message);
    return res.redirect('/candidate/verify-otp');
  }

  req.session.candidate = result.sessionData;
  delete req.session.candidateOTPEmail;

  logger.info(`[CANDIDATE] Login: ${email}`);

  const returnTo = req.session.candidateReturnTo || '/candidate/dashboard';
  delete req.session.candidateReturnTo;

  return req.session.save((err) => {
    if (err) logger.error('Candidate session save error:', err);
    return res.redirect(returnTo);
  });
});

const logout = (req, res) => {
  const email = req.session.candidate ? req.session.candidate.email : 'Unknown';
  delete req.session.candidate;
  delete req.session.candidateOTPEmail;
  logger.info(`[CANDIDATE] Logout: ${email}`);
  req.flash('success', 'You have been logged out.');
  return res.redirect('/candidate/login');
};

module.exports = { showLogin, sendOTP, showVerifyOTP, verifyOTP, logout };
