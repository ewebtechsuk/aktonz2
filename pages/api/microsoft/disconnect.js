import { clearTokens } from '../../../lib/token-store';
import { getAdminFromSession } from '../../../lib/admin-users.mjs';
import { readSession } from '../../../lib/session.js';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    await clearTokens();
    res.status(200).json({ disconnected: true });
  } catch (error) {
    console.error('Failed to disconnect Microsoft Graph', error);
    res.status(500).json({ error: 'Failed to disconnect Microsoft Graph' });
  }
}
