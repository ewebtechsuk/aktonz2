import { getContactById } from '../../../../lib/admin-contacts.mjs';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import { readSession } from '../../../../lib/session.js';

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
    const { id } = req.query;
    const contactId = Array.isArray(id) ? id[0] : id;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    try {
      const contact = await getContactById(contactId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      return res.status(200).json({ contact });
    } catch (error) {
      console.error('Failed to fetch admin contact', error);
      return res.status(500).json({ error: 'Failed to fetch contact' });
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
