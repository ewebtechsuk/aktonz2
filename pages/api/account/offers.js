import { randomUUID } from 'node:crypto';

import { addOffer } from '../../../lib/offers.js';
import {
  DEFAULT_OFFER_STATUS,
  formatOfferStatusLabel,
  normaliseOfferStatus,
} from '../../../lib/offer-statuses.js';
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

function normaliseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalised)) {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return false;
}

function normalisePositiveInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normaliseDateOnly(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
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
    moveInDate: normaliseDateOnly(input?.moveInDate || input?.desiredMoveInDate),
    householdSize: normalisePositiveInteger(input?.householdSize || input?.partySize),
    hasPets: normaliseBoolean(input?.hasPets),
    employmentStatus: normaliseString(input?.employmentStatus),
    referencingConsent: normaliseBoolean(
      input?.referencingConsent ?? input?.consentToReference,
    ),
    proofOfFunds: normaliseString(input?.proofOfFunds),
    additionalConditions: normaliseString(input?.conditions || input?.specialConditions),
  };

  return { data: payload };
}

function formatStatusHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const status = normaliseOfferStatus(entry.status || DEFAULT_OFFER_STATUS);
      return {
        id: entry.id || randomUUID(),
        status,
        label: entry.label || formatOfferStatusLabel(status),
        note: typeof entry.note === 'string' ? entry.note : '',
        createdAt: entry.createdAt || entry.date || null,
        actor: entry.actor && typeof entry.actor === 'object' ? entry.actor : null,
        type: entry.type || 'status',
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function formatOfferEntry(offer) {
  if (!offer) return null;
  const status = normaliseOfferStatus(offer.status || DEFAULT_OFFER_STATUS);
  const statusLabel = offer.statusLabel || formatOfferStatusLabel(status);
  const history = formatStatusHistory(offer.statusHistory);
  const compliance = offer.compliance && typeof offer.compliance === 'object'
    ? offer.compliance
    : {
        moveInDate: null,
        householdSize: null,
        hasPets: false,
        employmentStatus: '',
        referencingConsent: false,
        proofOfFunds: '',
        additionalConditions: '',
      };
  return {
    id: offer.id,
    propertyId: offer.propertyId,
    propertyTitle: offer.propertyTitle || '',
    propertyAddress: offer.propertyAddress || '',
    amount: offer.amount,
    frequency: offer.frequency || '',
    message: offer.message || '',
    status,
    statusLabel,
    statusHistory: history.length
      ? history
      : [
          {
            id: randomUUID(),
            status,
            label: statusLabel,
            note: 'Offer created',
            createdAt: offer.createdAt || offer.updatedAt || null,
            actor: null,
            type: 'status',
          },
        ],
    compliance,
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
    const resolvedStatus = normaliseOfferStatus(DEFAULT_OFFER_STATUS);
    const statusLabel = formatOfferStatusLabel(resolvedStatus);
    const statusEntry = {
      id: randomUUID(),
      status: resolvedStatus,
      label: statusLabel,
      note: 'Offer submitted via your Aktonz account.',
      createdAt: now,
      actor: { type: 'applicant', name: data.name, email: data.email },
      type: 'status',
    };

    const entry = {
      id,
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      propertyAddress: data.propertyAddress,
      amount: data.amount,
      frequency: data.frequency,
      message: data.message,
      status: resolvedStatus,
      statusLabel,
      statusHistory: [statusEntry],
      compliance: {
        moveInDate: data.moveInDate || null,
        householdSize: data.householdSize,
        hasPets: data.hasPets,
        employmentStatus: data.employmentStatus,
        referencingConsent: data.referencingConsent,
        proofOfFunds: data.proofOfFunds,
        additionalConditions: data.additionalConditions,
      },
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
        moveInDate: data.moveInDate || undefined,
        householdSize: data.householdSize || undefined,
        hasPets: data.hasPets || undefined,
        employmentStatus: data.employmentStatus || undefined,
        referencingConsent: data.referencingConsent,
        proofOfFunds: data.proofOfFunds || undefined,
        additionalConditions: data.additionalConditions || undefined,
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
