const notificationRepository = require('../repositories/notification.repository');
const logger = require('../utils/logger');

/**
 * Message templates for various recruitment notification types.
 */
/**
 * Build a professional HTML email wrapper.
 * @param {string} bodyContent - The inner HTML content
 * @returns {string} Full HTML email
 */
function wrapEmailHTML(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 60%,#064e3b 100%);padding:32px 40px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="center">
<div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-block;line-height:52px;margin-bottom:12px;">
<span style="color:#10b981;font-size:26px;font-weight:bold;">A</span>
</div>
<h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 4px 0;letter-spacing:-0.3px;">ATLAS SkillTech University</h1>
<p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0;">HR Recruitment</p>
</td></tr></table>
</td></tr>
<!-- Body -->
<tr><td style="padding:36px 40px 32px 40px;">
${bodyContent}
</td></tr>
<!-- Footer -->
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
<p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;">&copy; ${new Date().getFullYear()} ATLAS SkillTech University. All rights reserved.</p>
<p style="color:#cbd5e1;font-size:11px;margin:0;">This is an automated message from Atlas HR Recruitment Portal</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const TEMPLATES = {
  ai_interview_invite: {
    subject: 'AI Interview Invitation - {{jobTitle}} | ATLAS SkillTech University',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">AI Interview Invitation</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">You have been selected for an AI-powered interview</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
We are pleased to invite you to participate in an AI-assisted interview for the position of <strong style="color:#1e293b;">{{jobTitle}}</strong> at ATLAS SkillTech University.
</p>

<!-- Position Card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
<tr><td style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:12px;padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="40"><div style="width:40px;height:40px;background:#10b981;border-radius:10px;text-align:center;line-height:40px;"><span style="color:white;font-size:18px;">&#128188;</span></div></td>
<td style="padding-left:16px;">
<p style="color:#064e3b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px 0;">Position</p>
<p style="color:#065f46;font-size:17px;font-weight:700;margin:0;">{{jobTitle}}</p>
</td>
</tr></table>
</td></tr></table>

<!-- CTA Button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
<tr><td align="center">
<a href="{{interviewLink}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(16,185,129,0.4);letter-spacing:0.3px;">
Start Your Interview &rarr;
</a>
</td></tr></table>

<!-- Info Cards -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
<tr>
<td width="50%" style="padding-right:8px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
<p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">Valid For</p>
<p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">{{expiresIn}}</p>
</div>
</td>
<td width="50%" style="padding-left:8px;">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
<p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">Duration</p>
<p style="color:#1e293b;font-size:18px;font-weight:700;margin:0;">~20 min</p>
</div>
</td>
</tr></table>

<!-- Tips -->
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:0 0 24px 0;">
<p style="color:#92400e;font-size:13px;font-weight:600;margin:0 0 8px 0;">&#128161; Tips for a Great Interview</p>
<ul style="color:#78350f;font-size:13px;line-height:1.8;margin:0;padding-left:16px;">
<li>Find a quiet place with a stable internet connection</li>
<li>Read each question carefully before responding</li>
<li>Provide detailed, specific answers with examples</li>
<li>You can review and edit answers before final submission</li>
</ul>
</div>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
If you have any questions, please contact the HR team at <a href="mailto:hr@atlasuniversity.edu.in" style="color:#10b981;text-decoration:none;font-weight:600;">hr@atlasuniversity.edu.in</a>
</p>
`),
  },

  ai_interview_reminder: {
    subject: 'Reminder: Complete Your AI Interview - {{jobTitle}}',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">Friendly Reminder</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">Your AI interview is still pending</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
This is a friendly reminder that your AI interview for the position of <strong>{{jobTitle}}</strong> is still pending. Please complete it at your earliest convenience.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
<tr><td align="center">
<a href="{{interviewLink}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">
Complete Interview &rarr;
</a>
</td></tr></table>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },

  interview_completed: {
    subject: 'Interview Completed - {{jobTitle}}',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">Interview Completed</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">Thank you for your time</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
Thank you for completing your interview for the position of <strong>{{jobTitle}}</strong>. Our team will review your responses and get back to you shortly.
</p>

<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px;text-align:center;margin:0 0 24px 0;">
<p style="color:#065f46;font-size:14px;font-weight:600;margin:0;">&#9989; Your responses have been recorded successfully</p>
</div>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },

  shortlisted: {
    subject: 'Congratulations! You Have Been Shortlisted - {{jobTitle}}',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">&#127881; Congratulations!</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">You have been shortlisted</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
We are pleased to inform you that you have been <strong style="color:#10b981;">shortlisted</strong> for the position of <strong>{{jobTitle}}</strong> at ATLAS SkillTech University.
</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">Our HR team will reach out to you with the next steps shortly.</p>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },

  physical_interview_scheduled: {
    subject: 'Interview Scheduled - {{jobTitle}} | ATLAS SkillTech University',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">Interview Scheduled</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">Your in-person interview details</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
Your in-person interview for the position of <strong>{{jobTitle}}</strong> has been scheduled.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
<tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date</span><br><strong style="color:#1e293b;font-size:16px;">{{interviewDate}}</strong></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Time</span><br><strong style="color:#1e293b;font-size:16px;">{{interviewTime}}</strong></td></tr>
<tr><td style="padding:6px 0;border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Venue</span><br><strong style="color:#1e293b;font-size:16px;">{{venue}}</strong></td></tr>
</table>
</td></tr></table>

<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:0 0 24px 0;">
<p style="color:#92400e;font-size:13px;margin:0;">&#128203; Please carry a valid photo ID and copies of your documents.</p>
</div>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },

  rejected: {
    subject: 'Application Update - {{jobTitle}}',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">Application Update</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">Regarding your application</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Thank you for your interest in the position of <strong>{{jobTitle}}</strong> and for taking the time to apply.
</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
After careful consideration, we regret to inform you that we have decided to move forward with other candidates at this time. We encourage you to apply for future openings that match your profile.
</p>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },

  offer_released: {
    subject: 'Offer Letter - {{jobTitle}} | ATLAS SkillTech University',
    message: wrapEmailHTML(`
<h2 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px 0;">&#127881; Offer Letter</h2>
<p style="color:#64748b;font-size:14px;margin:0 0 28px 0;">We are delighted to make you an offer</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px 0;">Dear <strong>{{candidateName}}</strong>,</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
We are delighted to extend an offer for the position of <strong style="color:#10b981;">{{jobTitle}}</strong> at ATLAS SkillTech University.
</p>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
Please find the offer details attached. Kindly review and respond by <strong>{{responseDeadline}}</strong>.
</p>

<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1e293b;">Atlas HR Recruitment Team</strong></p>
`),
  },
};

/**
 * Notification Service -- manages sending and tracking notifications
 *
 * IMPORTANT: All notifications are routed ONLY to the configured admin email.
 * No emails are sent to candidates or other HR staff.
 */
class NotificationService {
  constructor() {
    // All notifications go ONLY to this email — no candidate/HR emails
    this.ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'meraj.Syed@atlasuniversity.edu.in';
  }

  /**
   * Create a notification record and attempt to send via the specified channel.
   * All emails are redirected to the admin email only.
   * @param {object} data - { candidate_id, type, title, message, channel, recipient_email, recipient_mobile, created_by }
   * @returns {Promise<object>} notification record
   */
  async sendNotification(data) {
    // Override recipient — ALL notifications go to admin only
    const actualRecipient = this.ADMIN_NOTIFY_EMAIL;

    // Create the notification record first
    const notification = await notificationRepository.create({
      candidate_id: data.candidate_id || null,
      type: data.type || 'info',
      title: data.title || null,
      message: data.message,
      channel: data.channel || 'email',
      recipient_email: actualRecipient,
      recipient_mobile: null, // No SMS to candidates
      status: 'pending',
      sent_at: null,
      created_by: data.created_by || null,
    });

    // Attempt delivery — only email to admin
    try {
      const channel = (data.channel || 'email').toLowerCase();

      if (channel === 'email') {
        await this.sendEmailNotification(
          actualRecipient,
          data.title || 'Atlas HR Notification',
          data.message
        );
      }
      // SMS and other channels are disabled — no communication to candidates

      // Mark as sent
      await notificationRepository.update(notification.id, {
        status: 'sent',
        sent_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      logger.info(`Notification sent to admin: id=${notification.id}, to=${actualRecipient}`);
    } catch (err) {
      // Mark as failed but do not throw
      await notificationRepository.update(notification.id, {
        status: 'failed',
        provider_response: err.message,
      });
      logger.error(`Notification delivery failed: id=${notification.id}`, { error: err.message });
    }

    return notification;
  }

  /**
   * Send an email notification via SMTP (SendGrid or other).
   * Falls back to console logging if SMTP is not configured.
   */
  async sendEmailNotification(to, subject, message) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Use nodemailer-compatible approach via axios to SendGrid API
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });

      // Detect if message is already HTML
      const isHTML = message.trim().startsWith('<!DOCTYPE') || message.trim().startsWith('<html');
      const plainText = isHTML
        ? message.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : message;
      const htmlContent = isHTML ? message : message.replace(/\n/g, '<br>');

      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"ATLAS HR" <hr@atlasuniversity.edu.in>',
        to: to,
        subject: subject,
        text: plainText,
        html: htmlContent,
      });

      logger.info(`Email sent via SMTP: to=${to}, subject=${subject}, messageId=${result.messageId}`);
      return result;
    }

    // Fallback: console log
    console.log('=== EMAIL NOTIFICATION (no SMTP) ===');
    console.log(`To: ${to} | Subject: ${subject}`);
    console.log('====================================');
    logger.info(`Email logged (no SMTP): to=${to}, subject=${subject}`);
    return { success: true, to, subject };
  }

  /**
   * Send an SMS notification (placeholder implementation).
   * In production this would integrate with an SMS gateway.
   * @param {string} to - recipient mobile number
   * @param {string} message - SMS body
   * @returns {Promise<void>}
   */
  async sendSMSNotification(to, message) {
    // Placeholder -- logs the SMS details for development
    console.log('=== SMS NOTIFICATION ===');
    console.log(`To     : ${to}`);
    console.log(`Message: ${message.substring(0, 160)}${message.length > 160 ? '...' : ''}`);
    console.log('========================');

    logger.info(`SMS notification queued: to=${to}`);
    return { success: true, to };
  }

  /**
   * Get notifications with filters and pagination.
   * @param {object} filters - { candidate_id, type, channel, status, date_from, date_to }
   * @param {object} pagination - { page, limit }
   * @returns {Promise<{ notifications: object[], total: number }>}
   */
  async getNotifications(filters = {}, pagination = {}) {
    const notifications = await notificationRepository.findAll(filters, pagination);
    return { notifications };
  }

  /**
   * Get a formatted message from a template, replacing placeholders with data values.
   * Placeholders use the format {{key}}.
   * @param {string} templateKey - one of the defined template keys
   * @param {object} data - key-value pairs to substitute into the template
   * @returns {{ subject: string, message: string } | null} formatted message or null if template not found
   */
  getTemplateMessage(templateKey, data = {}) {
    const template = TEMPLATES[templateKey];
    if (!template) {
      logger.warn(`Notification template not found: ${templateKey}`);
      return null;
    }

    let subject = template.subject;
    let message = template.message;

    // Replace all {{key}} placeholders
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const replacement = value != null ? String(value) : '';
      subject = subject.replace(placeholder, replacement);
      message = message.replace(placeholder, replacement);
    }

    return { subject, message };
  }
}

module.exports = new NotificationService();
