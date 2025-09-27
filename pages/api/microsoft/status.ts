import type { NextApiRequest, NextApiResponse } from 'next';
import { loadTokenSet } from '../../../lib/token-store';

interface StatusResponse {
  connected: boolean;
  expiresAt?: number;
  expiresInSeconds?: number;
  scope?: string | null;
  tokenType?: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { error: string }>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const tokenSet = await loadTokenSet();

    if (!tokenSet) {
      res.status(200).json({ connected: false });
      return;
    }

    const expiresInSeconds = Math.max(0, Math.round((tokenSet.expiresAt - Date.now()) / 1000));

    res.status(200).json({
      connected: true,
      expiresAt: tokenSet.expiresAt,
      expiresInSeconds,
      scope: tokenSet.scope ?? null,
      tokenType: tokenSet.tokenType ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
