import type { NextApiRequest, NextApiResponse } from 'next';
import { MS_CLIENT_ID, MS_DEV_REDIRECT_URI, MS_REDIRECT_URI, MS_TENANT_ID, SCOPES } from '../../../lib/ms-graph';

function resolveRedirectUri(req: NextApiRequest): string {
  const host = req.headers.host ?? '';
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1');
  return isLocal ? MS_DEV_REDIRECT_URI : MS_REDIRECT_URI;
}

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const redirectUri = resolveRedirectUri(req);
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
