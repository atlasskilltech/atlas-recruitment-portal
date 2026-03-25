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
 */
class NotificationService {
  /**
   * Create a notification record and attempt to send via the specified channel.
   * @param {object} data - { candidate_id, type, title, message, channel, recipient_email, recipient_mobile, created_by }
   * @returns {Promise<object>} notification record
   */
  async sendNotification(data) {
    // Create the notification record first
    const notification = await notificationRepository.create({
      candidate_id: data.candidate_id || null,
      type: data.type || 'info',
      title: data.title || null,
      message: data.message,
      channel: data.channel || 'email',
      recipient_email: data.recipient_email || null,
      recipient_mobile: data.recipient_mobile || null,
      status: 'pending',
      sent_at: null,
      created_by: data.created_by || null,
    });

    // Attempt delivery based on channel
    try {
      const channel = (data.channel || 'email').toLowerCase();

      if (channel === 'email' && data.recipient_email) {
        await this.sendEmailNotification(
          data.recipient_email,
          data.title || 'Atlas HR Notification',
          data.message
        );
      } else if (channel === 'sms' && data.recipient_mobile) {
        await this.sendSMSNotification(data.recipient_mobile, data.message);
      }

      // Mark as sent
      await notificationRepository.update(notification.id, {
        status: 'sent',
        sent_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      logger.info(`Notification sent: id=${notification.id}, channel=${channel}`);
    } catch (err) {
      // Mark as failed but do not throw
      await notificationRepository.update(notification.id, {
        status: 'failed',
        error_message: err.message,
      });
      logger.error(`Notification delivery failed: id=${notification.id}`, { error: err.message });
    }

    return notification;
  }

  /**
   * Send an email notification (placeholder implementation).
   * In production this would integrate with an SMTP service or email API.
   * @param {string} to - recipient email address
   * @param {string} subject - email subject
   * @param {string} message - email body
   * @returns {Promise<void>}
   */
  async sendEmailNotification(to, subject, message) {
    // Placeholder -- logs the email details for development
    console.log('=== EMAIL NOTIFICATION ===');
    console.log(`To     : ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body   : ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
    console.log('=========================');

    logger.info(`Email notification queued: to=${to}, subject=${subject}`);
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
