import { randomUUID } from 'node:crypto';

import { addOffer } from '../../../lib/offers.js';
import { readSession } from '../../../lib/session.js';
import { readContactEntries, updateContactEntries } from '../../../lib/account-storage.js';

const STORE_NAME = 'account-offers.json';

function requireContact(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;
  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  return {
    contactId,
    email: typeof session?.email === 'string' ? session.email : null,
  };
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

function normaliseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s£]/g, '');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function buildOfferPayload(input, defaults) {
  const propertyId = normaliseString(input?.propertyId);
  const amount = normaliseAmount(input?.amount ?? input?.offerAmount);

  const errors = [];
  if (!propertyId) {
    errors.push('Property reference is required.');
  }
  if (amount === null || amount <= 0) {
    errors.push('Offer amount must be a positive number.');
  }

  const name = normaliseString(input?.name);
  const email = normaliseString(input?.email || defaults?.email || '');

  if (!email) {
    errors.push('Email address is required.');
  }

  if (errors.length) {
    return { errors };
  }

  const payload = {
    propertyId,
    propertyTitle: normaliseString(input?.propertyTitle),
    propertyAddress: normaliseString(input?.propertyAddress || input?.address),
    amount,
    frequency: normaliseString(input?.frequency),
    message: normaliseString(input?.message),
    name: name || `Contact ${defaults?.contactId || ''}`.trim(),
    email,
    phone: normaliseString(input?.phone),
  };

  return { data: payload };
}

function formatOfferEntry(offer) {
  if (!offer) return null;
  return {
    id: offer.id,
    propertyId: offer.propertyId,
    propertyTitle: offer.propertyTitle || '',
    propertyAddress: offer.propertyAddress || '',
    amount: offer.amount,
    frequency: offer.frequency || '',
    message: offer.message || '',
    status: offer.status || 'submitted',
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt || offer.createdAt,
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
      .map(formatOfferEntry)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({ offers: formatted });
    return;
  }

  if (req.method === 'POST') {
    const contact = requireContact(req, res);
    if (!contact) {
      return;
    }

    const { data, errors } = buildOfferPayload(req.body || {}, contact);
    if (!data) {
      res.status(400).json({ error: 'Invalid request', details: errors });
      return;
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const entry = {
      id,
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      propertyAddress: data.propertyAddress,
      amount: data.amount,
      frequency: data.frequency,
      message: data.message,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    await updateContactEntries(STORE_NAME, contact.contactId, (existing) => {
      const filtered = Array.isArray(existing) ? existing.filter((item) => item?.id !== id) : [];
      return [entry, ...filtered];
    });

    try {
      await addOffer({
        propertyId: data.propertyId,
        propertyTitle: data.propertyTitle,
        propertyAddress: data.propertyAddress,
        offerAmount: data.amount,
        frequency: data.frequency,
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message || undefined,
        depositAmount: undefined,
        contactId: contact.contactId,
        agentId: undefined,
      });
    } catch (error) {
      console.warn('Failed to persist offer to shared store', error);
    }

    res.status(201).json({ offer: formatOfferEntry(entry) });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method Not Allowed' });
}
