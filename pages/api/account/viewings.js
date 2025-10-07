import { randomUUID } from 'node:crypto';

import { readSession } from '../../../lib/session.js';
import { readContactEntries, updateContactEntries } from '../../../lib/account-storage.js';

const STORE_NAME = 'account-viewings.json';

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

function buildViewingPayload(input) {
  const propertyId = normaliseString(input?.propertyId);
  const preferredDate = normaliseString(input?.date || input?.preferredDate);
  const preferredTime = normaliseString(input?.time || input?.preferredTime);
  const message = normaliseString(input?.message);

  const errors = [];
  if (!propertyId) {
    errors.push('Property reference is required.');
  }

  if (errors.length) {
    return { errors };
  }

  return {
    data: {
      propertyId,
      preferredDate,
      preferredTime,
      message,
    },
  };
}

function formatViewing(viewing) {
  if (!viewing) return null;
  return {
    id: viewing.id,
    propertyId: viewing.propertyId || '',
    preferredDate: viewing.preferredDate || '',
    preferredTime: viewing.preferredTime || '',
    message: viewing.message || '',
    status: viewing.status || 'requested',
    createdAt: viewing.createdAt,
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const contact = requireContact(req, res);
    if (!contact) {
      return;
    }

    const entries = await readContactEntries(STORE_NAME, contact.contactId);
    const formatted = entries
      .map(formatViewing)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({ viewings: formatted });
    return;
  }

  if (req.method === 'POST') {
    const contact = requireContact(req, res);
    if (!contact) {
      return;
    }

    const { data, errors } = buildViewingPayload(req.body || {});
    if (!data) {
      res.status(400).json({ error: 'Invalid request', details: errors });
      return;
    }

    const now = new Date().toISOString();
    const entry = {
      id: randomUUID(),
      propertyId: data.propertyId,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      message: data.message,
      status: 'requested',
      createdAt: now,
    };

    await updateContactEntries(STORE_NAME, contact.contactId, (existing) => {
      const next = Array.isArray(existing) ? [entry, ...existing] : [entry];
      return next;
    });

    res.status(201).json({ viewing: formatViewing(entry) });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
