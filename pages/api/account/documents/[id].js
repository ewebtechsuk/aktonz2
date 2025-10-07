import { readSession } from '../../../../lib/session.js';
const {
  readDocumentFile,
  deleteDocument,
} = require('../../../../lib/account-documents.js');

function requireContact(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;
  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return { contactId };
}

export default async function handler(req, res) {
  const contact = requireContact(req, res);
  if (!contact) {
    return;
  }

  const { id } = req.query || {};
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: 'Document ID is required' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const result = await readDocumentFile(contact.contactId, id);
      if (!result) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      res.setHeader('Content-Type', result.entry.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', result.buffer.length);
      const safeName = encodeURIComponent(result.entry.fileName || `document-${id}`);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
      res.status(200).send(result.buffer);
    } catch (error) {
      console.error('Failed to read document', error);
      res.status(500).json({ error: 'Unable to download document.' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const removed = await deleteDocument(contact.contactId, id);
      if (!removed) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Failed to delete document', error);
      res.status(500).json({ error: 'Unable to delete document.' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
