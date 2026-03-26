const notificationRepository = require('../repositories/notification.repository');
const logger = require('../utils/logger');

/**
 * Message templates for various recruitment notification types.
 */
const TEMPLATES = {
  ai_interview_invite: {
    subject: 'AI Interview Invitation - {{jobTitle}}',
    message: `Dear {{candidateName}},

You have been invited to take an AI-assisted interview for the position of {{jobTitle}}.

Please use the following link to begin your interview:
{{interviewLink}}

This link will expire in {{expiresIn}}.

Best regards,
Atlas HR Recruitment Team`,
  },

  ai_interview_reminder: {
    subject: 'Reminder: Complete Your AI Interview - {{jobTitle}}',
    message: `Dear {{candidateName}},

This is a friendly reminder that your AI interview for the position of {{jobTitle}} is still pending.

Please complete it before the deadline using the link below:
{{interviewLink}}

Best regards,
Atlas HR Recruitment Team`,
  },

  interview_completed: {
    subject: 'Interview Completed - {{jobTitle}}',
    message: `Dear {{candidateName}},

Thank you for completing your interview for the position of {{jobTitle}}.

Our team will review your responses and get back to you shortly.

Best regards,
Atlas HR Recruitment Team`,
  },

  shortlisted: {
    subject: 'Congratulations! You Have Been Shortlisted - {{jobTitle}}',
    message: `Dear {{candidateName}},

We are pleased to inform you that you have been shortlisted for the position of {{jobTitle}}.

Our HR team will reach out to you with the next steps shortly.

Best regards,
Atlas HR Recruitment Team`,
  },

  physical_interview_scheduled: {
    subject: 'Physical Interview Scheduled - {{jobTitle}}',
    message: `Dear {{candidateName}},

Your in-person interview for the position of {{jobTitle}} has been scheduled.

Date: {{interviewDate}}
Time: {{interviewTime}}
Venue: {{venue}}

Please carry a valid photo ID and copies of your documents.

Best regards,
Atlas HR Recruitment Team`,
  },

  rejected: {
    subject: 'Application Update - {{jobTitle}}',
    message: `Dear {{candidateName}},

Thank you for your interest in the position of {{jobTitle}} and for taking the time to apply.

After careful consideration, we regret to inform you that we have decided to move forward with other candidates at this time.

We encourage you to apply for future openings that match your profile.

Best regards,
Atlas HR Recruitment Team`,
  },

  offer_released: {
    subject: 'Offer Letter - {{jobTitle}}',
    message: `Dear {{candidateName}},

We are delighted to extend an offer for the position of {{jobTitle}}.

Please find the offer details attached. Kindly review and respond by {{responseDeadline}}.

Best regards,
Atlas HR Recruitment Team`,
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

      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"ATLAS HR" <hr@atlasuniversity.edu.in>',
        to: to,
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
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
