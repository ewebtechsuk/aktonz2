import crypto from 'crypto';

import { getAdminFromSession } from '../../../../../lib/admin-users.mjs';
import { readSession } from '../../../../../lib/session.js';

const STATE_COOKIE_NAME = 'aktonz_ms_state';
const STATE_MAX_AGE = 60 * 10; // 10 minutes

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function setStateCookie(res, value) {
  const parts = [
    `${STATE_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${STATE_MAX_AGE}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

const CLIENT_ID_ENV_KEYS = [
  'MICROSOFT_CLIENT_ID',
  'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
  'AZURE_AD_CLIENT_ID',
  'MSAL_CLIENT_ID',
];

const REDIRECT_URI_ENV_KEYS = [
  'MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
  'NEXT_PUBLIC_MICROSOFT_REDIRECT_URL',
  'AZURE_AD_REDIRECT_URI',
  'AZURE_AD_REDIRECT_URL',
];

function resolveEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return null;
}

function formatMissingEnv(keys) {
  if (keys.length <= 1) {
    return keys[0];
  }

  return `${keys[0]} (or ${keys.slice(1).join(', ')})`;
}

function getOAuthConfiguration() {
  const clientId = resolveEnvValue(CLIENT_ID_ENV_KEYS);
  const redirectUri = resolveEnvValue(REDIRECT_URI_ENV_KEYS);
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const scopes =
    process.env.MICROSOFT_SCOPES || 'offline_access https://graph.microsoft.com/.default';

  const missing = [];
  if (!clientId) {
    missing.push(formatMissingEnv(CLIENT_ID_ENV_KEYS));
  }
  if (!redirectUri) {
    missing.push(formatMissingEnv(REDIRECT_URI_ENV_KEYS));
  }

  return {
    clientId,
    redirectUri,
    tenant,
    scopes,
    missing,
  };
}

function buildAuthorizationUrl({ clientId, redirectUri, tenant, scopes }, state) {
  const baseUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes,
    state,
  });

  if (process.env.MICROSOFT_OAUTH_PROMPT) {
    params.set('prompt', process.env.MICROSOFT_OAUTH_PROMPT);
  } else {
    params.set('prompt', 'consent');
  }

  if (process.env.MICROSOFT_LOGIN_HINT) {
    params.set('login_hint', process.env.MICROSOFT_LOGIN_HINT);
  }

  return `${baseUrl}?${params.toString()}`;
}

export default function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'HEAD']);
    return res.status(405).end('Method Not Allowed');
  }

  const config = getOAuthConfiguration();

  if (config.missing.length) {
    return res.status(500).json({
      error: `Missing Microsoft integration configuration: ${config.missing.join(', ')}`,
      missing: config.missing,
    });
  }

  const state = crypto.randomBytes(16).toString('hex');

  try {
    setStateCookie(res, state);
  } catch (err) {
    console.error('Unable to set Microsoft OAuth state cookie', err);
    return res.status(500).json({
      error: 'Unable to initiate Microsoft connection. Try again later.',
    });
  }

  const authorizationUrl = buildAuthorizationUrl(config, state);

  return res.status(200).json({
    authorizationUrl,
    state,
    message: 'Redirecting you to Microsoft to finish email configuration…',
  });
}
