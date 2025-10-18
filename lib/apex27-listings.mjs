import { getProxyAgent } from './proxy-agent.js';

const API_URL = 'https://api.apex27.co.uk/listings';
const API_KEY = process.env.APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || null;

const normaliseString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normaliseNumber = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const cleaned = trimmed.replace(/[^0-9.-]+/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.' || cleaned === '.-') {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normaliseCoordinate = (value) => {
  const numeric = normaliseNumber(value);
  if (numeric == null) {
    return null;
  }
  if (numeric < -180 || numeric > 180) {
    return null;
  }
  return numeric;
};

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|;/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const buildDepositPayload = (input, prefix) => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const fixed = normaliseNumber(input[`${prefix}Fixed`]);
  const amount = normaliseNumber(input[`${prefix}Amount`]);
  const weeks = normaliseNumber(input[`${prefix}Weeks`]);
  const months = normaliseNumber(input[`${prefix}Months`]);

  const deposit = {
    fixed: fixed ?? amount ?? null,
    amount: amount ?? fixed ?? null,
    weeks: weeks ?? null,
    months: months ?? null,
  };

  const filtered = Object.fromEntries(
    Object.entries(deposit).filter(([, value]) => value != null)
  );

  return Object.keys(filtered).length > 0 ? filtered : null;
};

export const LETTINGS_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LET_AGREED', label: 'Let agreed' },
  { value: 'LET', label: 'Let' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const LETTINGS_RENT_FREQUENCIES = [
  { value: 'monthly', label: 'Per calendar month' },
  { value: 'weekly', label: 'Per week' },
  { value: 'fortnightly', label: 'Per fortnight' },
  { value: 'quarterly', label: 'Per quarter' },
  { value: 'annually', label: 'Per year' },
];

export const LETTINGS_PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Studio',
  'Maisonette',
  'Penthouse',
  'Terraced House',
  'Semi-Detached House',
  'Detached House',
  'Bungalow',
  'Duplex',
  'Cottage',
  'Townhouse',
];

export const LETTINGS_FURNISHED_STATES = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'part_furnished', label: 'Part furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'furnishings_by_negotiation', label: 'By negotiation' },
];

export const LETTINGS_DEPOSIT_TYPES = [
  { value: 'standard', label: 'Standard deposit' },
  { value: 'zero_deposit', label: 'Zero deposit scheme' },
  { value: 'not_applicable', label: 'Not applicable' },
];

const cleanPayload = (payload) => {
  const entries = Object.entries(payload).filter(([key, value]) => {
    if (value == null) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  });
  return Object.fromEntries(entries);
};

export const mapLettingsFormToPayload = (input = {}) => {
  const externalReference =
    normaliseString(input.externalReference) || normaliseString(input.reference);
  const price = normaliseNumber(input.price);
  const bedrooms = normaliseNumber(input.bedrooms);
  const bathrooms = normaliseNumber(input.bathrooms);
  const receptions = normaliseNumber(input.receptions);
  const latitude = normaliseCoordinate(input.latitude);
  const longitude = normaliseCoordinate(input.longitude);
  const features = toStringArray(input.features || input.featureList);
  const imageUrls = toStringArray(input.imageUrls || input.images);

  const securityDeposit = buildDepositPayload(input, 'securityDeposit');
  const holdingDeposit = buildDepositPayload(input, 'holdingDeposit');

  const payload = {
    externalReference: externalReference || null,
    title: normaliseString(input.title) || normaliseString(input.address1) || 'Lettings property',
    description: normaliseString(input.description) || '',
    transactionType: 'rent',
    status: normaliseString(input.status)?.toUpperCase() || 'AVAILABLE',
    branchId: normaliseString(input.branchId) || BRANCH_ID || undefined,
    landlordContactId: normaliseString(input.landlordContactId) || undefined,
    price,
    priceCurrency: normaliseString(input.priceCurrency) || 'GBP',
    rentFrequency: normaliseString(input.rentFrequency)?.toLowerCase() || 'monthly',
    bedrooms,
    bathrooms,
    receptions,
    latitude,
    longitude,
    propertyType: normaliseString(input.propertyType) || null,
    furnishedState: normaliseString(input.furnishedState) || null,
    availableDate: normaliseString(input.availableDate) || null,
    size: normaliseString(input.size) || null,
    depositType: normaliseString(input.depositType) || null,
    features,
    address1: normaliseString(input.address1) || normaliseString(input.displayAddress) || null,
    postcode: normaliseString(input.postcode) || null,
    externalUrl: normaliseString(input.externalUrl) || null,
    images: imageUrls.map((url) => ({ url })),
    securityDeposit: securityDeposit || undefined,
    holdingDeposit: holdingDeposit || undefined,
  };

  return cleanPayload(payload);
};

export const createLettingsListing = async (input) => {
  if (!API_KEY) {
    const error = new Error('APEX27_API_KEY not configured. Set the API key to publish listings.');
    error.code = 'APEX27_API_KEY_MISSING';
    throw error;
  }

  const payload = mapLettingsFormToPayload(input);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    dispatcher: getProxyAgent(),
  });

  let bodyText = '';
  let bodyJson = null;

  try {
    bodyText = await response.text();
    if (bodyText) {
      bodyJson = JSON.parse(bodyText);
    }
  } catch (error) {
    bodyJson = null;
  }

  if (!response.ok) {
    const error = new Error(
      bodyJson?.message || bodyJson?.error || `Apex27 responded with ${response.status}`,
    );
    error.status = response.status;
    error.code = 'APEX27_CREATE_FAILED';
    error.details = bodyJson || bodyText || null;
    throw error;
  }

  const locationHeader = response.headers.get('location');
  const resolvedId =
    bodyJson?.id ||
    bodyJson?.listing?.id ||
    (locationHeader ? locationHeader.split('/').filter(Boolean).pop() : null) ||
    payload.externalReference ||
    null;

  return {
    id: resolvedId,
    location: locationHeader || null,
    payload,
    response: bodyJson,
  };
};
