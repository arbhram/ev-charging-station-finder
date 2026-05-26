const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email Service
 * Handles sending notification emails to users.
 * Uses Nodemailer with SMTP configuration.
 */

let transporter = null;

/**
 * Initialize the email transporter.
 * Call once during server startup.
 */
const initializeEmailService = () => {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    logger.info('Email service initialized');
  } catch (error) {
    logger.error(`Email service initialization failed: ${error.message}`);
  }
};

/**
 * Send an email notification.
 *
 * @param {object} options - { to, subject, html, text }
 * @returns {Promise<object>} Nodemailer send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.warn('Email transporter not initialized. Skipping email.');
    return null;
  }

  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send charger availability alert email.
 */
const sendAvailabilityAlert = async (userEmail, stationName, stationAddress) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">⚡ Charger Now Available</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px;">A charger is now available at:</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 8px; color: #111827;">${stationName}</h3>
          <p style="margin: 0; color: #6b7280;">${stationAddress}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
          Open the app to navigate to this station and start charging.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `⚡ Charger Available: ${stationName}`,
    html,
  });
};

/**
 * Send new station notification email.
 */
const sendNewStationAlert = async (userEmail, stationName, distance) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🆕 New Charging Station</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px;">A new charging station has been added near you:</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 8px; color: #111827;">${stationName}</h3>
          <p style="margin: 0; color: #6b7280;">${distance} km from your location</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `🆕 New Station Nearby: ${stationName}`,
    html,
  });
};

module.exports = {
  initializeEmailService,
  sendEmail,
  sendAvailabilityAlert,
  sendNewStationAlert,
};
