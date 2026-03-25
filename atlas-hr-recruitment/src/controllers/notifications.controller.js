// ---------------------------------------------------------------------------
// Atlas HR Recruitment Portal – Notifications Controller
// ---------------------------------------------------------------------------
const notificationRepository = require('../repositories/notification.repository');
const { asyncHandler } = require('../middlewares/error.middleware');
const { PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /notifications
 * List all notifications with filters and pagination.
 */
const index = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // Build filters
  const filters = {};
  if (req.query.type) filters.type = req.query.type;
  if (req.query.channel) filters.channel = req.query.channel;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.candidate_id) filters.candidate_id = parseInt(req.query.candidate_id, 10);
  if (req.query.date_from) filters.date_from = req.query.date_from;
  if (req.query.date_to) filters.date_to = req.query.date_to;

  const notifications = await notificationRepository.findAll(filters, { page, limit });

  // Count total for pagination (use a simple count query)
  const pool = require('../config/db');
  const conditions = [];
  const params = [];

  if (filters.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.channel) {
    conditions.push('channel = ?');
    params.push(filters.channel);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.candidate_id) {
    conditions.push('candidate_id = ?');
    params.push(filters.candidate_id);
  }
  if (filters.date_from) {
    conditions.push('created_at >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('created_at <= ?');
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM atlas_rec_notifications ${whereClause}`,
    params
  );

  const totalPages = Math.ceil(total / limit);

  res.render('notifications/index', {
    title: 'Notifications',
    notifications,
    filters: req.query,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    success: req.flash('success'),
    error: req.flash('error'),
  });
});

module.exports = {
  index,
};
