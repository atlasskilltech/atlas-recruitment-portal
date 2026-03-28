// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Authentication Middleware
// ---------------------------------------------------------------------------

/**
 * Ensure the user is authenticated.
 * Redirects to /login with a flash message when no active session exists.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  console.log(`[AUTH] Not authenticated for ${req.originalUrl}, session ID: ${req.sessionID}, cookie: ${req.headers.cookie || 'none'}`);

  // Store the originally requested URL so we can redirect back after login
  req.session.returnTo = req.originalUrl;

  req.flash('error', 'Please log in to access this page.');
  return res.redirect('/login');
}

/**
 * Ensure the visitor is a guest (not logged in).
 * Redirects authenticated users to /dashboard.
 */
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/admin/jobs');
  }
  return next();
}

/**
 * Attach the session user object to res.locals so every EJS template
 * can access `currentUser` without explicit passing from each controller.
 */
function attachUser(req, res, next) {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  return next();
}

module.exports = {
  isAuthenticated,
  isGuest,
  attachUser,
};
