const pool = require('../config/db');
const { generateOTP, isOTPValid, sendOTPEmail } = require('./otp.service');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

async function findCandidateByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, appln_full_name, appln_email, appln_mobile_no FROM dice_staff_recruitment WHERE appln_email = ? ORDER BY id DESC',
    [email.trim().toLowerCase()]
  );
  return rows;
}

async function findOrCreateAccount(email, candidateId) {
  const [existing] = await pool.query(
    'SELECT * FROM atlas_rec_candidate_accounts WHERE email = ?',
    [email.trim().toLowerCase()]
  );
  if (existing.length > 0) return existing[0];

  const [result] = await pool.query(
    'INSERT INTO atlas_rec_candidate_accounts (candidate_id, email) VALUES (?, ?)',
    [candidateId, email.trim().toLowerCase()]
  );
  const [created] = await pool.query('SELECT * FROM atlas_rec_candidate_accounts WHERE id = ?', [result.insertId]);
  return created[0];
}

async function requestOTP(email) {
  const candidates = await findCandidateByEmail(email);
  if (candidates.length === 0) {
    return { success: false, message: 'No application found for this email address.' };
  }

  const account = await findOrCreateAccount(email, candidates[0].id);

  if (account.status === 'blocked') {
    return { success: false, message: 'Your account has been blocked. Please contact support.' };
  }

  // Cooldown check
  if (account.otp_last_sent_at) {
    const elapsed = (Date.now() - new Date(account.otp_last_sent_at).getTime()) / 1000;
    if (elapsed < OTP_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_COOLDOWN_SECONDS - elapsed);
      return { success: false, message: `Please wait ${wait} seconds before requesting a new OTP.` };
    }
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    'UPDATE atlas_rec_candidate_accounts SET otp_code = ?, otp_expires_at = ?, otp_attempts = 0, otp_last_sent_at = NOW() WHERE id = ?',
    [otp, expiresAt, account.id]
  );

  await sendOTPEmail(email, otp);
  logger.info(`[CANDIDATE_AUTH] OTP sent to ${email}`);

  return { success: true, message: 'OTP has been sent to your email.', candidateName: candidates[0].appln_full_name, otp };
}

async function verifyOTP(email, otp) {
  const [accounts] = await pool.query(
    'SELECT * FROM atlas_rec_candidate_accounts WHERE email = ?',
    [email.trim().toLowerCase()]
  );
  if (accounts.length === 0) {
    return { success: false, message: 'Account not found.' };
  }

  const account = accounts[0];

  if (account.otp_attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (!isOTPValid(account)) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (account.otp_code !== otp) {
    await pool.query('UPDATE atlas_rec_candidate_accounts SET otp_attempts = otp_attempts + 1 WHERE id = ?', [account.id]);
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP verified - clear it and update login time
  await pool.query(
    'UPDATE atlas_rec_candidate_accounts SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, email_verified = 1, last_login_at = NOW() WHERE id = ?',
    [account.id]
  );

  // Get all candidate IDs linked to this email
  const candidates = await findCandidateByEmail(email);
  const candidateIds = candidates.map(c => c.id);

  logger.info(`[CANDIDATE_AUTH] ${email} verified OTP, ${candidateIds.length} application(s)`);

  return {
    success: true,
    sessionData: {
      account_id: account.id,
      email: account.email,
      name: candidates[0].appln_full_name,
      candidate_ids: candidateIds,
    },
  };
}

module.exports = { findCandidateByEmail, findOrCreateAccount, requestOTP, verifyOTP };
