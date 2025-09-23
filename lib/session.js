import crypto from 'crypto';

const COOKIE_NAME = 'aktonz_session';
const DEFAULT_MAX_AGE = Number.parseInt(process.env.SESSION_MAX_AGE || '', 10) || 60 * 60 * 24 * 14; // 14 days

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.APEX27_SESSION_SECRET || process.env.APEX27_API_KEY;
  if (!secret) {
    throw new Error('Session secret not configured');
  }
  return secret;
}

function encode(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decode(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
}

function sign(value) {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function parseCookies(header = '') {
  return header
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const index = entry.indexOf('=');
      if (index === -1) {
        return acc;
      }
      const key = entry.slice(0, index);
      const value = entry.slice(index + 1);
      acc[key] = value;
      return acc;
    }, {});
}

export function readSession(req) {
  const cookies = parseCookies(req.headers?.cookie || '');
  const raw = cookies[COOKIE_NAME];
  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split('.');
  if (!payload || !signature) {
    return null;
  }

  let expected;
  try {
    expected = sign(payload);
  } catch (err) {
    console.warn('Unable to verify session cookie', err);
    return null;
  }
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  const data = decode(payload);
  if (!data) {
    return null;
  }

  if (data.expiresAt && Date.now() > data.expiresAt) {
    return null;
  }

  return data;
}

export function writeSession(res, session, options = {}) {
  const maxAge = Number.isFinite(options.maxAge) ? options.maxAge : DEFAULT_MAX_AGE;
  const payload = encode({ ...session, expiresAt: Date.now() + maxAge * 1000 });
  const signature = sign(payload);
  const value = `${payload}.${signature}`;

  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSession(res) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

