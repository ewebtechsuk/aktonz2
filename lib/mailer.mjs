import nodemailer from 'nodemailer';

const REQUIRED_SMTP_VARIABLES = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const ADDRESS_SPLIT_REGEX = /[,;\s]+/;

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

function toAddressList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => toAddressList(entry));
  }

  if (typeof value === 'object' && value.address) {
    return [value.address];
  }

  if (typeof value === 'string') {
    return value
      .split(ADDRESS_SPLIT_REGEX)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

const normalizeAddress = (address) =>
  typeof address === 'string' ? address.trim().toLowerCase() : '';

export function getNotificationRecipients() {
  const fallback = ['info@aktonz.com'];
  const envValue = process.env.AKTONZ_EMAIL;
  const addresses = toAddressList(envValue);

  return addresses.length > 0 ? addresses : fallback;
}

export async function sendMailOrThrow(
  transporter,
  message,
  { context = 'mail', expectedRecipients } = {}
) {
  const info = await transporter.sendMail(message);

  const recipients = (expectedRecipients?.length
    ? expectedRecipients
    : toAddressList(message?.to)
  ).map(normalizeAddress);

  if (recipients.length === 0) {
    return info;
  }

  const accepted = new Set((info?.accepted || []).map(normalizeAddress));
  const missing = recipients.filter((recipient) => !accepted.has(recipient));

  if (missing.length > 0) {
    const error = new Error(
      `SMTP server rejected recipients (${missing.join(', ')}) for ${context}`
    );
    error.code = 'SMTP_DELIVERY_FAILED';
    error.missing = missing;
    error.info = info;
    throw error;
  }

  return info;
}
