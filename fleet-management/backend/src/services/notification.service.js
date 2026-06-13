const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

/**
 * Send email notification
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_USER) {
      logger.warn('Email not configured, skipping notification');
      return;
    }

    const transport = getTransporter();
    const recipients = Array.isArray(to) ? to.join(',') : to;

    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'Fleet System <noreply@fleet.com>',
      to: recipients,
      subject,
      html: html || `<p>${text}</p>`,
      text
    });

    logger.info(`Email sent to ${recipients}: ${subject}`);
  } catch (error) {
    logger.error('Email send error:', error.message);
    throw error;
  }
};

/**
 * Send SMS via Twilio
 */
const sendSMS = async (to, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logger.warn('SMS not configured, skipping');
      return;
    }

    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const phones = Array.isArray(to) ? to : [to];
    for (const phone of phones) {
      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    }

    logger.info(`SMS sent to ${phones.join(', ')}`);
  } catch (error) {
    logger.error('SMS send error:', error.message);
    throw error;
  }
};

module.exports = { sendEmail, sendSMS };
