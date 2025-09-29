import { getProxyAgent } from './proxy-agent.js';

const APEX_API_URL = 'https://api.apex27.co.uk/listings';
const RAW_API_KEY = process.env.APEX27_API_KEY || null;
const RAW_API_TOKEN = process.env.APEX27_API_TOKEN || process.env.APEX27_ACCESS_TOKEN || null;

function normaliseBearerToken(value) {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed
    : `Bearer ${trimmed}`;
}

const API_KEY = RAW_API_KEY && RAW_API_KEY !== 'X-Api-Key' ? RAW_API_KEY : null;
const API_BEARER_TOKEN = normaliseBearerToken(RAW_API_TOKEN);
const HAS_API_AUTH = Boolean(API_KEY || API_BEARER_TOKEN);
const BRANCH_ID = process.env.APEX27_BRANCH_ID || null;

function buildAuthHeaders() {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  if (API_BEARER_TOKEN && !headers.authorization) {
    headers.authorization = API_BEARER_TOKEN;
  }

  return headers;
}

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapListingToPayload(listing) {
  const latitude = listing.latitude ?? listing.lat ?? null;
  const longitude = listing.longitude ?? listing.lng ?? null;
  const bedrooms = listing.bedrooms ?? null;
  const bathrooms = listing.bathrooms ?? null;
  const receptions = listing.receptions ?? null;

  const images = Array.isArray(listing.images)
    ? listing.images
        .map((img) => {
          if (!img) return null;
          if (typeof img === 'string') {
            return { url: img };
          }
          if (img.url) {
            return { url: img.url, altText: img.altText ?? null };
          }
          if (img.thumbnailUrl) {
            return { url: img.thumbnailUrl, altText: img.altText ?? null };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  return {
    externalReference: listing.sourceId || listing.id || null,
    title: listing.title || listing.displayAddress || 'Scraye property',
    description: listing.description || '',
    transactionType: listing.transactionType === 'sale' ? 'sale' : 'rent',
    status: listing.status || 'AVAILABLE',
    branchId: BRANCH_ID || undefined,
    price: coerceNumber(listing.priceValue ?? listing.price),
    priceCurrency: listing.priceCurrency || 'GBP',
    rentFrequency: listing.rentFrequency || null,
    bedrooms,
    bathrooms,
    receptions,
    latitude,
    longitude,
    propertyType: listing.propertyType || null,
    furnishedState: listing.furnishedState || null,
    availableDate: listing.availableAt || null,
    size: listing.size || null,
    depositType: listing.depositType || null,
    features: Array.isArray(listing.features) ? listing.features : [],
    address1: listing.title || null,
    postcode: listing.outcode || null,
    externalUrl: listing.externalUrl || listing.url || null,
    images,
  };
}

async function postListing(payload) {
  const response = await fetch(APEX_API_URL, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
    dispatcher: getProxyAgent(),
  });
  return response;
}

async function putListing(id, payload) {
  const response = await fetch(`${APEX_API_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
    dispatcher: getProxyAgent(),
  });
  return response;
}

async function upsertListing(listing) {
  const payload = mapListingToPayload(listing);
  if (!payload.externalReference) {
    return { status: 'skipped', reason: 'missing external reference' };
  }

  const postResponse = await postListing(payload);
  if (postResponse.ok) {
    return { status: 'created', id: payload.externalReference };
  }

  if (postResponse.status === 409 || postResponse.status === 422) {
    const location = postResponse.headers.get('location');
    const identifier =
      location?.split('/').filter(Boolean).pop() || payload.externalReference;
    const putResponse = await putListing(identifier, payload);
    if (putResponse.ok) {
      return { status: 'updated', id: identifier };
    }
    const errorText = await putResponse.text().catch(() => '');
    return {
      status: 'error',
      id: identifier,
      reason: `PUT ${putResponse.status}: ${errorText.slice(0, 200)}`,
    };
  }

  const text = await postResponse.text().catch(() => '');
  return {
    status: 'error',
    id: payload.externalReference,
    reason: `POST ${postResponse.status}: ${text.slice(0, 200)}`,
  };
}

export async function syncScrayeListingsToApex(listings = []) {
  if (!HAS_API_AUTH) {
    console.warn('Apex27 API credentials not configured; skipping CRM sync.');
    return { created: 0, updated: 0, skipped: listings.length };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const listing of listings) {
    try {
      const result = await upsertListing(listing);
      if (result.status === 'created') {
        created += 1;
      } else if (result.status === 'updated') {
        updated += 1;
      } else if (result.status === 'skipped') {
        skipped += 1;
      } else if (result.status === 'error') {
        skipped += 1;
        errors.push({ id: result.id, reason: result.reason });
      }
    } catch (error) {
      skipped += 1;
      errors.push({
        id: listing.sourceId || listing.id || null,
        reason: error.message,
      });
    }
  }

  if (errors.length) {
    console.warn('Apex27 sync encountered errors:', errors);
  }

  return { created, updated, skipped, errors };
}
