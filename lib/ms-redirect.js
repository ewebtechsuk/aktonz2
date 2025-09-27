const DEFAULT_PROD_REDIRECT_URI = 'https://aktonz.com/api/microsoft/callback';
const DEFAULT_DEV_REDIRECT_URI = 'http://localhost:3000/api/microsoft/callback';

const PROD_REDIRECT_ENV_KEYS = [
  'MS_REDIRECT_URI',
  'MICROSOFT_REDIRECT_URI',
  'MICROSOFT_REDIRECT_URL',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URL',
  'AZURE_AD_REDIRECT_URI',
  'AZURE_AD_REDIRECT_URL',
];

const DEV_REDIRECT_ENV_KEYS = [
  'MS_DEV_REDIRECT_URI',
  'MICROSOFT_DEV_REDIRECT_URI',
  'MICROSOFT_DEV_REDIRECT_URL',
  'NEXT_PUBLIC_MICROSOFT_DEV_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_DEV_REDIRECT_URL',
];

function pickEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function getRequestHost(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost ?? req.headers.host ?? '';
  return typeof hostHeader === 'string' ? hostHeader.trim() : '';
}

function getForwardedProtocol(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (Array.isArray(forwardedProto)) {
    return forwardedProto[0]?.split(',')[0]?.trim();
  }
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0]?.trim();
  }
  return undefined;
}

function ensureAbsoluteUrl(rawValue, { host, isLocal, label, protocol }) {
  const trimmed = rawValue.trim();
  try {
    const url = new URL(trimmed);
    if (!url.protocol || !url.hostname) {
      throw new Error('Missing protocol or host');
    }
    return url.toString();
  } catch (error) {
    if (trimmed.startsWith('/')) {
      if (!host) {
        throw new Error(`${label} must be an absolute URL or the request must include a valid Host header`);
      }
      const safeHost = host.replace(/\s/g, '').replace(/\/$/, '');
      const resolvedProtocol = protocol || (isLocal ? 'http' : 'https');
      return `${resolvedProtocol}://${safeHost}${trimmed}`;
    }
    throw new Error(`${label} must be a valid absolute URL`);
  }
}

function resolveMicrosoftRedirectUri(req) {
  const host = getRequestHost(req);
  const lowerHost = host.toLowerCase();
  const isLocal = lowerHost.includes('localhost') || lowerHost.startsWith('127.0.0.1');
  const envKeys = isLocal ? DEV_REDIRECT_ENV_KEYS : PROD_REDIRECT_ENV_KEYS;
  const fallback = isLocal ? DEFAULT_DEV_REDIRECT_URI : DEFAULT_PROD_REDIRECT_URI;
  const label = isLocal ? 'MS_DEV_REDIRECT_URI' : 'MS_REDIRECT_URI';
  const rawValue = pickEnvValue(envKeys) ?? fallback;
  const forwardedProtocol = getForwardedProtocol(req);
  return ensureAbsoluteUrl(rawValue, {
    host,
    isLocal,
    label,
    protocol: forwardedProtocol,
  });
}

module.exports = {
  resolveMicrosoftRedirectUri,
  DEFAULT_PROD_REDIRECT_URI,
  DEFAULT_DEV_REDIRECT_URI,
  _internal: {
    pickEnvValue,
    ensureAbsoluteUrl,
    getRequestHost,
    getForwardedProtocol,
  },
};
