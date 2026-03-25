const crypto = require('crypto');
const logger = require('../utils/logger');

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function isOTPValid(account) {
  if (!account.otp_code || !account.otp_expires_at) return false;
  return new Date(account.otp_expires_at) > new Date();
}

async function sendOTPEmail(email, otp) {
  // TODO: Integrate with actual email service (SendGrid, SES, etc.)
  logger.info(`[OTP] Sending OTP ${otp} to ${email}`);
  console.log(`\n========================================`);
  console.log(`  OTP for ${email}: ${otp}`);
  console.log(`  Valid for 10 minutes`);
  console.log(`========================================\n`);
  return true;
}

module.exports = { generateOTP, isOTPValid, sendOTPEmail };
