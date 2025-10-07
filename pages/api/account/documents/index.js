import { Buffer } from 'node:buffer';

import { readSession } from '../../../../lib/session.js';
const {
  listDocuments,
  saveDocument,
} = require('../../../../lib/account-documents.js');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function requireContact(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;
  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return { contactId };
}

function normaliseString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : '';
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function parseBase64Data(data) {
  if (typeof data !== 'string' || !data) {
    return null;
  }
  const commaIndex = data.indexOf(',');
  const raw = commaIndex >= 0 ? data.slice(commaIndex + 1) : data;
  try {
    return Buffer.from(raw, 'base64');
  } catch (error) {
    return null;
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const contact = requireContact(req, res);
    if (!contact) {
      return;
    }

    const documents = await listDocuments(contact.contactId);
    documents.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    res.status(200).json({ documents });
    return;
  }

  if (req.method === 'POST') {
    const contact = requireContact(req, res);
    if (!contact) {
      return;
    }

    const body = req.body || {};
    const fileName = normaliseString(body.fileName);
    const fileType = normaliseString(body.fileType);
    const note = normaliseString(body.note);
    const category = normaliseString(body.category);
    const buffer = parseBase64Data(body.data || body.base64 || body.fileData);

    if (!fileName || !buffer) {
      res.status(400).json({ error: 'File name and data are required.' });
      return;
    }

    if (buffer.length > MAX_FILE_SIZE) {
      res.status(413).json({ error: 'File is too large. Maximum size is 10MB.' });
      return;
    }

    try {
      const document = await saveDocument(contact.contactId, {
        originalName: fileName,
        mimeType: fileType || 'application/octet-stream',
        buffer,
        category: category || null,
        note: note || null,
      });

      res.status(201).json({ document });
    } catch (error) {
      console.error('Failed to save document', error);
      res.status(500).json({ error: 'Unable to save document.' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
