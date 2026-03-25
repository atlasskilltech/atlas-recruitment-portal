const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const advancedFormat = require('dayjs/plugin/advancedFormat');

dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

/**
 * Format a date string.
 * @param {string|Date} date
 * @param {string} format - dayjs format string, defaults to 'DD MMM YYYY'
 * @returns {string}
 */
function formatDate(date, format = 'DD MMM YYYY') {
  if (!date) return '';
  return dayjs(date).format(format);
}

/**
 * Format a date with time.
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!date) return '';
  return dayjs(date).format('DD MMM YYYY hh:mm A');
}

/**
 * Get relative time string (e.g. "3 hours ago").
 * @param {string|Date} date
 * @returns {string}
 */
function timeAgo(date) {
  if (!date) return '';
  return dayjs(date).fromNow();
}

/**
 * Check whether a date is in the past.
 * @param {string|Date} date
 * @returns {boolean}
 */
function isExpired(date) {
  if (!date) return false;
  return dayjs(date).isBefore(dayjs());
}

/**
 * Add days to a date and return a new dayjs instance.
 * @param {string|Date} date
 * @param {number} days
 * @returns {dayjs.Dayjs}
 */
function addDays(date, days) {
  return dayjs(date).add(days, 'day');
}

/**
 * Get the absolute difference in days between two dates.
 * @param {string|Date} date1
 * @param {string|Date} date2
 * @returns {number}
 */
function diffDays(date1, date2) {
  return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
}

module.exports = {
  formatDate,
  formatDateTime,
  timeAgo,
  isExpired,
  addDays,
  diffDays,
};
