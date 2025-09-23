import { fetchPortalProfile } from '../../../lib/apex27-portal.js';
import { readSession } from '../../../lib/session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const session = readSession(req);
  if (!session?.contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const profile = await fetchPortalProfile({ token: session.token || null, contactId: session.contactId });
    res.status(200).json({ contact: profile, email: session.email || profile?.email || null });
  } catch (err) {
    console.error('Failed to load Apex27 profile', err);
    const message = err instanceof Error ? err.message : 'Failed to load profile';
    res.status(502).json({ error: message });
  }
}

