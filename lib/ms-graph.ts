import { encryptText, decryptText, deserializeEncryptedPayload, serializeEncryptedPayload } from './crypto-util';
import { clearTokens, readTokens, saveTokens } from './token-store';


const DEFAULT_CLIENT_ID = '28c9d37b-2c2b-4d49-9ac4-4c180967bc7c';
const DEFAULT_SCOPES = 'offline_access Mail.Send User.Read';

export const MS_CLIENT_ID = process.env.MS_CLIENT_ID ?? DEFAULT_CLIENT_ID;

const TENANT_ENV_KEYS = [
  'MS_TENANT_ID',
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_TENANT',
  'AZURE_TENANT_ID',
  'AZURE_DIRECTORY_ID',
  'AZURE_AD_TENANT_ID',
  'MS_DIRECTORY_ID',
  'MS_TENANT',
  'NEXT_PUBLIC_MS_TENANT_ID',
  'NEXT_PUBLIC_MICROSOFT_TENANT_ID',
];

const DEFAULT_TENANT_ID = 'common';
const DEFAULT_CLIENT_TENANT_ID = '60737a1b-9707-4d7f-9909-0ee943a1ffff';

function resolveBundledClientId(): string {
  const rawClientId = process.env.MS_CLIENT_ID;
  if (typeof rawClientId === 'string' && rawClientId.trim() !== '') {
    return rawClientId.trim();
  }
  return DEFAULT_CLIENT_ID;
}

function determineDefaultTenantId(): string {
  const clientId = resolveBundledClientId();
  if (clientId === DEFAULT_CLIENT_ID) {
    return DEFAULT_CLIENT_TENANT_ID;
  }
  return DEFAULT_TENANT_ID;
}

function normalizeTenantId(raw: string | undefined): string {
  if (!raw) {
    return determineDefaultTenantId();
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return determineDefaultTenantId();
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return determineDefaultTenantId();
  }

  return trimmed;
}

export function resolveTenantId(): string {
  const envValue = pickEnvValue(TENANT_ENV_KEYS);
  return normalizeTenantId(envValue);
}

export const MS_TENANT_ID = resolveTenantId();

const DEFAULT_PROD_REDIRECT_URI = 'https://aktonz.com/api/microsoft/callback';
const DEFAULT_DEV_REDIRECT_URI = 'http://localhost:3000/api/admin/email/microsoft/callback';

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

function requireAbsoluteUrl(value: string, label: string): string {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    if (!url.protocol || !url.host) {
      throw new Error();
    }

    return url.toString();

  } catch {
    throw new Error(`${label} must be set to a valid absolute URL`);
  }
}

function pickEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return undefined;
}

function getRedirectUri(envKeys: string[], fallback: string, label: string): string {
  const value = pickEnvValue(envKeys) ?? fallback;
  return requireAbsoluteUrl(value, label);
}

export const MS_REDIRECT_URI = getRedirectUri(PROD_REDIRECT_ENV_KEYS, DEFAULT_PROD_REDIRECT_URI, 'MS_REDIRECT_URI');
export const MS_DEV_REDIRECT_URI = getRedirectUri(DEV_REDIRECT_ENV_KEYS, DEFAULT_DEV_REDIRECT_URI, 'MS_DEV_REDIRECT_URI');

export const SCOPES = process.env.MS_SCOPES ?? DEFAULT_SCOPES;
export const ALLOWED_UPN = 'info@aktonz.com';

const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

interface RefreshResponse {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token: string;
  refresh_token: string;
}

export function getClientSecret(): string {
  const secret = process.env.MS_CLIENT_SECRET;
  if (!secret) {
    throw new Error('MS_CLIENT_SECRET environment variable is required');
  }

  return secret;
}

export async function getValidAccessToken(): Promise<string> {
  const tokenSet = await readTokens();


  if (!tokenSet) {
    throw new Error('Microsoft Graph connector is not yet configured. Connect via the admin dashboard.');
  }

  const expiresAt = tokenSet.obtained_at + tokenSet.expires_in * 1000;
  const refreshThreshold = Date.now() + 60_000; // refresh 60 seconds before expiry

  if (expiresAt > refreshThreshold) {
    const encryptedAccess = deserializeEncryptedPayload(tokenSet.access_token_enc);
    return decryptText(encryptedAccess);
  }

  const encryptedRefresh = deserializeEncryptedPayload(tokenSet.refresh_token_enc);
  const refreshToken = decryptText(encryptedRefresh);

  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    scope: SCOPES,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_secret: getClientSecret(),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    await clearTokens();

    throw new Error(`Failed to refresh Microsoft Graph tokens (${response.status})`);
  }

  const result = (await response.json()) as RefreshResponse;

  if (!result.access_token || !result.refresh_token) {
    await clearTokens();

    throw new Error('Microsoft Graph token refresh returned an unexpected payload');
  }

  const expiresInSeconds = result.expires_in ?? 0;
  const obtainedAt = Date.now();

  await saveTokens({
    access_token_enc: serializeEncryptedPayload(encryptText(result.access_token)),
    refresh_token_enc: serializeEncryptedPayload(encryptText(result.refresh_token)),
    expires_in: expiresInSeconds,
    obtained_at: obtainedAt,
    account: tokenSet.account,

  });

  return result.access_token;
}

export interface SendMailOptions {
  subject: string;
  html: string;
  to: string[];
  replyTo?: string;
}

export async function sendMailGraph(options: SendMailOptions): Promise<void> {
  const accessToken = await getValidAccessToken();

  const toRecipients = options.to.map((address) => ({
    emailAddress: { address },
  }));

  const payload = {
    message: {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.html,
      },
      toRecipients,
      replyTo: options.replyTo
        ? [
            {
              emailAddress: { address: options.replyTo },
            },
          ]
        : undefined,
    },
    saveToSentItems: false,
  };

  const response = await fetch(`${GRAPH_BASE_URL}/users/${encodeURIComponent(ALLOWED_UPN)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${errorText}`);
  }
}
