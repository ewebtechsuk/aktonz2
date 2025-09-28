const { readContactEntries, updateContactEntries } = require('../../lib/account-storage.js');
const { readSession } = require('../../lib/session.js');

const STORE_NAME = 'saved-searches.json';

function requireContact(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;

  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  return contactId;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const entries = await readContactEntries(STORE_NAME, contactId);
    res.status(200).json(entries);
    return;
  }

  if (req.method === 'POST') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const params = (req.body && typeof req.body === 'object' ? req.body : {}) || {};
    const entry = {
      id: Date.now().toString(),
      params,
      createdAt: new Date().toISOString(),
    };

    await updateContactEntries(STORE_NAME, contactId, (existing) => {
      return [...existing, entry];
    });

    console.log('Schedule notification job for saved search', { contactId, params });

    res.status(200).json(entry);
    return;
  }

  if (req.method === 'DELETE') {
    const contactId = requireContact(req, res);
    if (!contactId) {
      return;
    }

    const id =
      typeof req.query?.id === 'string'
        ? req.query.id
        : typeof req.body?.id === 'string'
          ? req.body.id
          : null;

    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    let removed = false;
    await updateContactEntries(STORE_NAME, contactId, (existing) => {
      const filtered = existing.filter((entry) => {
        const match = entry?.id === id;
        if (match) {
          removed = true;
        }
        return !match;
      });
      return filtered;
    });

    if (!removed) {
      res.status(404).json({ error: 'Search not found' });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end('Method Not Allowed');
};
