import type { NextApiRequest, NextApiResponse } from 'next';
import { MS_REDIRECT_URI } from '../../../lib/ms-graph';
import { handleOAuthCallback } from '../../../lib/ms-oauth';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { code, error } = req.query;

  if (error) {
    res.status(400).json({ error: String(error) });
    return;
  }

  if (typeof code !== 'string' || !code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    await handleOAuthCallback(code, MS_REDIRECT_URI);
    res.redirect(302, '/admin?connected=1');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Microsoft Graph connection failed';
    res.status(500).json({ error: message });
  }
}
