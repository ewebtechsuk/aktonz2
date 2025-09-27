import type { NextApiRequest, NextApiResponse } from 'next';
import { readTokens } from '../../../lib/token-store';


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
    const tokens = await readTokens();

    if (!tokens) {

      res.status(200).json({ connected: false });
      return;
    }

    const expiresAt = (tokens.obtained_at + tokens.expires_in) * 1000;
    const expiresInSeconds = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));

    res.status(200).json({
      connected: true,
      expiresAt,
      expiresInSeconds,
      scope: null,
      tokenType: null,

    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
