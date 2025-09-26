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

function getOAuthConfiguration() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const scopes =
    process.env.MICROSOFT_SCOPES || 'offline_access https://graph.microsoft.com/.default';

  const missing = [];
  if (!clientId) {
    missing.push('MICROSOFT_CLIENT_ID');
  }
  if (!redirectUri) {
    missing.push('MICROSOFT_REDIRECT_URI');
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
