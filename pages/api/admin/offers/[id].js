import { appendOfferStatus, getOfferById } from '../../../../lib/offers.js';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import { readSession } from '../../../../lib/session.js';
import {
  DEFAULT_OFFER_STATUS,
  normaliseOfferStatus,
} from '../../../../lib/offer-statuses.js';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

function normaliseOfferId(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function pickComplianceUpdates(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(input, 'moveInDate')) {
    updates.moveInDate = input.moveInDate || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'householdSize')) {
    updates.householdSize = input.householdSize;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'hasPets')) {
    updates.hasPets = Boolean(input.hasPets);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'employmentStatus')) {
    updates.employmentStatus = input.employmentStatus || '';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'referencingConsent')) {
    updates.referencingConsent = Boolean(input.referencingConsent);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'proofOfFunds')) {
    updates.proofOfFunds = input.proofOfFunds || '';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'additionalConditions')) {
    updates.additionalConditions = input.additionalConditions || '';
  }

  return Object.keys(updates).length ? updates : null;
}

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  const offerId = normaliseOfferId(req.query.id);
  if (!offerId) {
    res.status(400).json({ error: 'Offer ID is required' });
    return;
  }

  if (req.method === 'PATCH') {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const note = typeof payload.note === 'string' ? payload.note.trim() : '';
    const statusValue = payload.status
      ? normaliseOfferStatus(payload.status)
      : undefined;

    const complianceUpdates = pickComplianceUpdates(payload.compliance);

    const existing = await getOfferById(offerId);
    if (!existing) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    const hasStatusChange =
      statusValue && statusValue !== normaliseOfferStatus(existing.status || DEFAULT_OFFER_STATUS);

    const updated = await appendOfferStatus(offerId, {
      status: hasStatusChange ? statusValue : undefined,
      note,
      complianceUpdates,
      actor: {
        type: 'admin',
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      eventType: hasStatusChange ? 'status' : 'note',
    });

    if (!updated) {
      res.status(500).json({ error: 'Unable to update offer' });
      return;
    }

    res.status(200).json({ offer: updated });
    return;
  }

  res.setHeader('Allow', ['PATCH']);
  res.status(405).end('Method Not Allowed');
}
