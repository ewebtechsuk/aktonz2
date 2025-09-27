import { encryptText, serializeEncryptedPayload } from './crypto-util';
import { ALLOWED_UPN, MS_CLIENT_ID, MS_TENANT_ID, SCOPES, getClientSecret } from './ms-graph';
import { saveTokens } from './token-store';


const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_ME_ENDPOINT = 'https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName,mail';

interface TokenResponse {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  access_token: string;
  refresh_token: string;
}

interface GraphUser {
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
}

export interface OAuthResult {
  accountUpn: string;
}

export async function handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthResult> {
  const tokens = await exchangeAuthorizationCode(code, redirectUri);
  const profile = await fetchProfile(tokens.access_token);
  const accountUpn = (profile.userPrincipalName ?? profile.mail ?? '').toLowerCase();

  if (accountUpn !== ALLOWED_UPN.toLowerCase()) {
    throw new Error('The signed-in account is not authorised for aktonz.com');
  }

  const expiresInSeconds = tokens.expires_in ?? 0;
  const obtainedAt = Date.now();

  await saveTokens({
    access_token_enc: serializeEncryptedPayload(encryptText(tokens.access_token)),
    refresh_token_enc: serializeEncryptedPayload(encryptText(tokens.refresh_token)),
    expires_in: expiresInSeconds,
    obtained_at: obtainedAt,
    account: profile.userPrincipalName ?? profile.mail ?? ALLOWED_UPN,

  });

  return {
    accountUpn: profile.userPrincipalName ?? profile.mail ?? ALLOWED_UPN,
  };
}

async function exchangeAuthorizationCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code,
    client_secret: getClientSecret(),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft identity platform token exchange failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as TokenResponse;

  if (!payload.access_token || !payload.refresh_token) {
    throw new Error('Microsoft identity platform did not return both access and refresh tokens');
  }

  return payload;
}

async function fetchProfile(accessToken: string): Promise<GraphUser> {
  const response = await fetch(GRAPH_ME_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unable to fetch Microsoft profile (${response.status}): ${text}`);
  }

  return (await response.json()) as GraphUser;
}
