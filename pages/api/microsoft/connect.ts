import type { NextApiRequest, NextApiResponse } from 'next';
import { MS_CLIENT_ID, MS_TENANT_ID, SCOPES } from '../../../lib/ms-graph';
import { resolveMicrosoftRedirectUri } from '../../../lib/ms-redirect';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let redirectUri: string;
  try {
    redirectUri = resolveMicrosoftRedirectUri(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_redirect_uri';
    console.error('Microsoft connect redirect URI error', message);
    res.status(500).json({ error: 'invalid_redirect_uri' });
    return;
  }

  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: SCOPES,
    prompt: 'consent',
  });

  const authorizeUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  res.redirect(authorizeUrl);
}
