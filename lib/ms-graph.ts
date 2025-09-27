import { encryptText, decryptText, deserializeEncryptedPayload, serializeEncryptedPayload } from './crypto-util';
import { clearTokens, readTokens, saveTokens } from './token-store';

export const MS_CLIENT_ID = '04651e3a-82c5-4e03-ba50-574b2bb79cac';
export const MS_TENANT_ID = '60737a1b-9707-4d7f-9909-0ee943a1ffff';
export const MS_REDIRECT_URI = 'https://aktonz.com/api/microsoft/callback';
export const SCOPES = 'offline_access Mail.Send User.Read';
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
