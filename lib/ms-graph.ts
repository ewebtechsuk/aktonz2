import { encryptText, decryptText } from './crypto-util';
import { clearTokenSet, loadTokenSet, saveTokenSet } from './token-store';

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
  const tokenSet = await loadTokenSet();

  if (!tokenSet) {
    throw new Error('Microsoft Graph connector is not yet configured. Connect via the admin dashboard.');
  }

  const now = Date.now();
  const refreshThreshold = now + 60_000; // refresh 60 seconds before expiry

  if (tokenSet.expiresAt > refreshThreshold) {
    return decryptText(tokenSet.encryptedAccessToken);
  }

  const refreshToken = decryptText(tokenSet.encryptedRefreshToken);
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
    await clearTokenSet();
    throw new Error(`Failed to refresh Microsoft Graph tokens (${response.status})`);
  }

  const result = (await response.json()) as RefreshResponse;

  if (!result.access_token || !result.refresh_token) {
    await clearTokenSet();
    throw new Error('Microsoft Graph token refresh returned an unexpected payload');
  }

  const expiresInSeconds = result.expires_in ?? 0;
  const expiresAt = Date.now() + Math.max(0, expiresInSeconds - 60) * 1000; // 60-second safety window

  await saveTokenSet({
    encryptedAccessToken: encryptText(result.access_token),
    encryptedRefreshToken: encryptText(result.refresh_token),
    expiresAt,
    scope: result.scope,
    tokenType: result.token_type,
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
