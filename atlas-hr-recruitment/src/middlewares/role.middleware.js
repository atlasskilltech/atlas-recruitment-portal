// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Role-Based Access Control Middleware
// ---------------------------------------------------------------------------
const { ROLES } = require('../config/constants');

/**
 * Higher-order middleware that restricts access to users whose role is
 * included in the provided list.
 *
 * @param  {...string} roles – one or more role strings (e.g. 'super_admin', 'hr_manager')
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to access this page.');
      return res.redirect('/login');
    }

    const userRole = req.session.user.role;

    if (!roles.includes(userRole)) {
      req.flash('error', 'You do not have permission to access this resource.');
      return res.status(403).redirect('/dashboard');
    }

    return next();
  };
}

/**
 * Shortcut: only super_admin.
 */
const isSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

/**
 * Shortcut: super_admin or hr_manager.
 */
const isHRManager = requireRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);

/**
 * Shortcut: super_admin, hr_manager, or recruiter.
 */
const isRecruiter = requireRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.RECRUITER);

module.exports = {
  requireRole,
  isSuperAdmin,
  isHRManager,
  isRecruiter,
};
