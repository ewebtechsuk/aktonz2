import {
  ContactValidationError,
  listContactsForAdmin,
  updateContactById,
} from '../../../../lib/admin-contacts.mjs';
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
      const payload = await listContactsForAdmin();
      const contact = payload.contacts.find((entry) => entry.id === contactId) || null;
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      return res.status(200).json({
        contact,
        options: payload.filters || { stage: [], pipeline: [], type: [], agent: [] },
      });
    } catch (error) {
      console.error('Failed to fetch admin contact', error);
      return res.status(500).json({ error: 'Failed to fetch contact' });
    }
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const contactId = Array.isArray(id) ? id[0] : id;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    try {
      const updates = req.body && typeof req.body === 'object' ? req.body : {};
      const updatedContact = await updateContactById(contactId, updates);

      if (!updatedContact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const payload = await listContactsForAdmin();
      return res.status(200).json({
        contact: updatedContact,
        options: payload.filters || { stage: [], pipeline: [], type: [], agent: [] },
      });
    } catch (error) {
      if (error instanceof ContactValidationError) {
        return res.status(400).json({ error: error.message, details: error.messages });
      }

      console.error('Failed to update admin contact', error);
      return res.status(500).json({ error: 'Failed to update contact' });
    }
  }

  res.setHeader('Allow', ['GET', 'HEAD', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}
