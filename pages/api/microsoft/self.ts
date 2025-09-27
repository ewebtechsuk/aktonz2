import type { NextApiRequest, NextApiResponse } from 'next';
import { getValidAccessToken } from '../../../lib/ms-graph';

const GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName,mail,id';

type GraphMeResponse = {
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
  id?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ connected: true; account: GraphMeResponse } | { error: string }>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const accessToken = await getValidAccessToken();
    const response = await fetch(GRAPH_ME_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: `Graph /me request failed (${response.status}): ${errorText}` });
      return;
    }

    const payload = (await response.json()) as GraphMeResponse;
    res.status(200).json({ connected: true, account: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
