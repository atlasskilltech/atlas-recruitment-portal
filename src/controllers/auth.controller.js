// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Auth Controller
// ---------------------------------------------------------------------------
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { asyncHandler } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * GET /login
 * Render the login page.
 */
const showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success'),
  });
};

/**
 * POST /login
 * Validate credentials, create session, redirect to dashboard.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    req.flash('error', 'Please provide both email and password.');
    return res.redirect('/login');
  }

  // Look up user by email
  const [users] = await pool.query(
    'SELECT id, full_name, email, password_hash, role, status FROM atlas_rec_users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );

  if (users.length === 0) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/login');
  }

  const user = users[0];

  // Check if account is active
  if (!user.status) {
    req.flash('error', 'Your account has been deactivated. Please contact the administrator.');
    return res.redirect('/login');
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/login');
  }

  // Update last login timestamp
  await pool.query(
    'UPDATE atlas_rec_users SET last_login_at = NOW() WHERE id = ?',
    [user.id]
  );

  // Set session
  req.session.user = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };

  logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

  // Redirect to the originally requested URL or dashboard
  const returnTo = req.session.returnTo || '/dashboard';
  delete req.session.returnTo;

  req.flash('success', `Welcome back, ${user.full_name}!`);
  return res.redirect(returnTo);
});

/**
 * POST /logout (or GET /logout)
 * Destroy session and redirect to login.
 */
const logout = (req, res) => {
  const userName = req.session.user ? req.session.user.full_name : 'User';

  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destruction failed:', err);
    }
    logger.info(`User logged out: ${userName}`);
    res.clearCookie('connect.sid');
    return res.redirect('/login');
  });
};

module.exports = {
  showLogin,
  login,
  logout,
};
