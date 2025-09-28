const { readContactEntries, updateContactEntries } = require('../../../lib/account-storage.js');
const { readSession } = require('../../../lib/session.js');

const STORE_NAME = 'favourites.json';

function requireContact(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;

  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  return contactId;
}

function normalisePropertyId(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (value !== null && value !== undefined) {
    return String(value);
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const entries = await readContactEntries(STORE_NAME, contactId);
    const sorted = [...entries].sort((a, b) => {
      const aTime = Date.parse(a?.createdAt || '') || 0;
      const bTime = Date.parse(b?.createdAt || '') || 0;
      return bTime - aTime;
    });
    res.status(200).json(sorted);
    return;
  }

  if (req.method === 'POST') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const propertyId = normalisePropertyId(req.body?.propertyId);
    if (!propertyId) {
      res.status(400).json({ error: 'Missing propertyId' });
      return;
    }

    let entry = null;
    await updateContactEntries(STORE_NAME, contactId, (existing) => {
      if (existing.some((item) => item?.propertyId === propertyId)) {
        entry = existing.find((item) => item?.propertyId === propertyId) || null;
        return existing;
      }
      entry = { propertyId, createdAt: new Date().toISOString() };
      return [...existing, entry];
    });

    res.status(200).json(entry);
    return;
  }

  if (req.method === 'DELETE') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const propertyId = normalisePropertyId(req.body?.propertyId ?? req.query?.propertyId);
    if (!propertyId) {
      res.status(400).json({ error: 'Missing propertyId' });
      return;
    }

    let removed = false;
    await updateContactEntries(STORE_NAME, contactId, (existing) => {
      const filtered = existing.filter((item) => {
        const match = item?.propertyId === propertyId;
        if (match) {
          removed = true;
        }
        return !match;
      });
      return filtered;
    });

    if (!removed) {
      res.status(404).json({ error: 'Favourite not found' });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end('Method Not Allowed');
};
