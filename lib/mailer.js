import nodemailer from 'nodemailer';

const REQUIRED_SMTP_VARIABLES = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

export function getMissingSmtpConfig() {
  return REQUIRED_SMTP_VARIABLES.filter((key) => !process.env[key]);
}

export function createSmtpTransport() {
  const missing = getMissingSmtpConfig();

  if (missing.length > 0) {
    const error = new Error(
      `Missing SMTP configuration values: ${missing.join(', ')}`
    );
    error.code = 'SMTP_CONFIG_MISSING';
    error.missing = missing;
    throw error;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function resolveFromAddress(defaultFallback = 'no-reply@aktonz.com') {
  return (
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    process.env.SMTP_USER ||
    defaultFallback
  );
}
