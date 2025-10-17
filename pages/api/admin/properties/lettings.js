import { readSession } from '../../../../lib/session.js';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import {
  createLettingsListing,
  LETTINGS_DEPOSIT_TYPES,
  LETTINGS_FURNISHED_STATES,
  LETTINGS_PROPERTY_TYPES,
  LETTINGS_RENT_FREQUENCIES,
  LETTINGS_STATUSES,
  mapLettingsFormToPayload,
} from '../../../../lib/apex27-listings.mjs';
import { fetchPropertiesByType } from '../../../../lib/apex27.mjs';

const requireAdmin = (req, res) => {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
};

const normaliseString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const parseLimit = (value, fallback = 20) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.min(numeric, 100);
};

const summariseProperty = (property) => {
  if (!property || typeof property !== 'object') {
    return null;
  }

  const title =
    normaliseString(property.title) ||
    normaliseString(property.displayAddress) ||
    normaliseString(property.address1) ||
    normaliseString(property.address) ||
    normaliseString(property.street) ||
    'Lettings property';

  const identifier =
    normaliseString(property.id) ||
    normaliseString(property.listingId) ||
    normaliseString(property.externalReference) ||
    normaliseString(property.reference) ||
    normaliseString(property.slug) ||
    null;

  const price =
    property.price ??
    property.rent ??
    property.priceValue ??
    (typeof property.price === 'string' ? Number(property.price) : null);

  const rentFrequency =
    normaliseString(property.rentFrequency) ||
    normaliseString(property.frequency) ||
    normaliseString(property.rentalFrequency) ||
    null;

  return {
    id: identifier,
    title,
    status: normaliseString(property.status) || null,
    price: typeof price === 'number' && Number.isFinite(price) ? price : null,
    rentFrequency,
    postcode: normaliseString(property.postcode) || null,
    landlordContactId: normaliseString(property.landlordContactId) || null,
    updatedAt: property.updatedAt || property.modifiedAt || null,
  };
};

const filterProperties = (properties, query, limit) => {
  if (!Array.isArray(properties)) {
    return [];
  }

  const normalisedQuery = normaliseString(query).toLowerCase();
  const results = [];

  for (const property of properties) {
    if (results.length >= limit) {
      break;
    }

    const summary = summariseProperty(property);
    if (!summary) {
      continue;
    }

    if (!normalisedQuery) {
      results.push(summary);
      continue;
    }

    const haystack = [
      summary.title,
      summary.id,
      summary.status,
      summary.postcode,
      property?.fullAddress,
      property?.displayAddress,
      property?.address1,
      property?.address2,
    ]
      .filter(Boolean)
      .map((entry) => String(entry).toLowerCase());

    if (haystack.some((value) => value.includes(normalisedQuery))) {
      results.push(summary);
    }
  }

  return results;
};

const metadataResponse = () => ({
  options: {
    statuses: LETTINGS_STATUSES,
    rentFrequencies: LETTINGS_RENT_FREQUENCIES,
    propertyTypes: LETTINGS_PROPERTY_TYPES.map((entry) => ({ value: entry, label: entry })),
    furnishedStates: LETTINGS_FURNISHED_STATES,
    depositTypes: LETTINGS_DEPOSIT_TYPES,
  },
  defaults: {
    status: 'AVAILABLE',
    rentFrequency: 'monthly',
    depositType: 'standard',
    branchId: process.env.APEX27_BRANCH_ID || null,
  },
});

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const search = normaliseString(req.query.search);
    const limit = parseLimit(req.query.limit, 20);
    const allowNetworkParam = normaliseString(req.query.allowNetwork);
    const allowNetwork = allowNetworkParam ? allowNetworkParam !== '0' && allowNetworkParam !== 'false' : true;

    if (!search) {
      return res.status(200).json({ ...metadataResponse(), results: [] });
    }

    try {
      const properties = await fetchPropertiesByType('rent', {
        allowNetwork,
        useCacheOnly: !allowNetwork,
      });
      const results = filterProperties(properties, search, limit);
      return res.status(200).json({ ...metadataResponse(), results });
    } catch (error) {
      console.error('Failed to search lettings properties', error);
      return res.status(500).json({ error: 'Unable to search lettings properties right now.' });
    }
  }

  if (req.method === 'POST') {
    const payload = mapLettingsFormToPayload(req.body || {});

    if (!payload.title) {
      return res.status(400).json({ error: 'Property title is required.' });
    }
    if (!payload.address1) {
      return res.status(400).json({ error: 'Primary address line is required.' });
    }
    if (!payload.postcode) {
      return res.status(400).json({ error: 'Postcode is required.' });
    }
    if (payload.price == null) {
      return res.status(400).json({ error: 'Monthly rent is required.' });
    }
    if (!payload.rentFrequency) {
      return res.status(400).json({ error: 'Select a rent frequency.' });
    }

    try {
      const result = await createLettingsListing(payload);
      return res.status(201).json({ listing: result });
    } catch (error) {
      if (error?.code === 'APEX27_API_KEY_MISSING') {
        return res.status(500).json({ error: error.message, code: error.code });
      }

      console.error('Failed to create lettings listing', error);
      const status = error?.status && Number.isFinite(error.status) ? error.status : 500;
      return res.status(status).json({
        error: error?.message || 'Failed to create lettings property',
        code: error?.code || 'APEX27_CREATE_FAILED',
        details: error?.details || null,
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'HEAD']);
  return res.status(405).end('Method Not Allowed');
}
