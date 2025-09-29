import { listOffersForAdmin } from '../../../lib/offers-admin.mjs';
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

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const offers = await listOffersForAdmin();
      return res.status(200).json({ offers });
    } catch (error) {
      console.error('Failed to list offers for admin', error);
      return res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD']);
  return res.status(405).end('Method Not Allowed');

}
