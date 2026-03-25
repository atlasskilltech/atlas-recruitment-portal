// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Error Handling Middleware
// ---------------------------------------------------------------------------
const logger = require('../utils/logger');

/**
 * Catch-all for routes that were not matched – creates a 404 error and
 * forwards it to the global error handler.
 */
function notFound(req, res, next) {
  const err = new Error(`Not Found – ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

/**
 * Global error handler.
 * Logs the error and renders an appropriate error page.
 *
 * NOTE: Express identifies error-handling middleware by its 4-parameter
 * signature, so all four arguments must remain even if `next` is unused.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;

  // Log server errors with full stack; client errors at warn level
  if (statusCode >= 500) {
    logger.error(`${statusCode} – ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      stack: err.stack,
    });
  } else {
    logger.warn(`${statusCode} – ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode);

  // If the request expects JSON, respond with JSON
  if (req.accepts('html')) {
    return res.render('errors/error', {
      title: statusCode === 404 ? 'Page Not Found' : 'Server Error',
      statusCode,
      message:
        statusCode === 404
          ? 'The page you are looking for does not exist.'
          : process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred. Please try again later.'
            : err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }

  return res.json({
    error: {
      status: statusCode,
      message: err.message,
    },
  });
}

/**
 * Wrap an async route handler / controller so that rejected promises are
 * automatically forwarded to the Express error handler via next().
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn – async function(req, res, next)
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
};
