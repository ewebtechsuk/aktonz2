import { createRequire } from 'node:module';
import { getProxyAgent } from './proxy-agent.js';
import { formatOfferStatusLabel, normaliseOfferStatus } from './offer-statuses.js';

const requireJson = createRequire(import.meta.url);
const supportData = requireJson('../data/ai-support.json');

const API_BASE = process.env.APEX27_API_BASE || 'https://api.apex27.co.uk';
const API_KEY = process.env.APEX27_API_KEY || process.env.NEXT_PUBLIC_APEX27_API_KEY || null;
const BRANCH_ID = process.env.APEX27_BRANCH_ID || process.env.NEXT_PUBLIC_APEX27_BRANCH_ID || null;

const CACHE_TTL_MS = 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120_000;

const FALLBACK_OFFERS = Array.isArray(supportData?.offers) ? supportData.offers : [];

let cachedPayload = null;
let cachedAt = 0;
let inflightRequest = null;
let rateLimitResetAt = 0;
let lastRateLimitLogAt = 0;

const RENT_FREQUENCY_TOKENS = new Set([
  'w',
  'pw',
  'perweek',
  'weekly',
  'week',
  'm',
  'pm',
  'pcm',
  'permonth',
  'monthly',
  'month',
  'q',
  'pq',
  'perquarter',
  'quarterly',
  'quarter',
  'y',
  'pa',
  'perannum',
  'annually',
  'year',
  'yearly',
]);

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function readFirstString(source, keys = []) {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const key of keys) {
    if (source[key] != null && source[key] !== '') {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
  }

  return '';
}

function parseDate(value) {
  if (!value) {
    return { iso: null, timestamp: null };
  }

  if (value instanceof Date) {
    const ts = value.getTime();
    if (Number.isFinite(ts)) {
      return { iso: value.toISOString(), timestamp: ts };
    }
    return { iso: null, timestamp: null };
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseDate(entry);
      if (parsed.iso) {
        return parsed;
      }
    }
    return { iso: null, timestamp: null };
  }

  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return { iso: null, timestamp: null };
  }

  return { iso: date.toISOString(), timestamp };
}

function parseNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.' || cleaned === '.-') {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractContact(raw) {
  if (!raw || typeof raw !== 'object') {
    return { name: null, email: null, phone: null, id: null };
  }

  const nameCandidates = [
    raw.name,
    [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim(),
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim(),
    raw.displayName,
    raw.fullName,
    raw.contactName,
  ];

  const name = nameCandidates.find((entry) => typeof entry === 'string' && entry.trim())?.trim() || null;
  const email = readFirstString(raw, ['email', 'Email', 'contactEmail', 'contact_email']).toLowerCase() || null;
  const phone = readFirstString(raw, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'mobilePhone', 'telephone']) || null;
  const id = readFirstString(raw, ['id', 'contactId', 'contact_id', 'contactID', 'contact_id']);

  return {
    id: id || null,
    name,
    email,
    phone,
  };
}

function extractAgent(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const nameCandidates = [
    raw.name,
    raw.displayName,
    [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim(),
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim(),
  ];

  const name = nameCandidates.find((entry) => typeof entry === 'string' && entry.trim())?.trim();
  if (!name) {
    return null;
  }

  return {
    id: readFirstString(raw, ['id', 'userId', 'user_id', 'agentId', 'agent_id']) || null,
    name,
    email: readFirstString(raw, ['email', 'Email', 'contactEmail']) || null,
    phone: readFirstString(raw, ['phone', 'phoneNumber', 'phone_number', 'mobile']) || null,
  };
}

function extractProperty(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: null, title: null, address: null, link: null };
  }

  const idCandidates = [
    raw.id,
    raw.propertyId,
    raw.property_id,
    raw.listingId,
    raw.listing_id,
    raw.externalId,
    raw.external_id,
    raw.reference,
    raw.fullReference,
  ];

  const id = idCandidates
    .map((entry) => (entry == null ? '' : String(entry).trim()))
    .find((entry) => entry);

  const titleCandidates = [
    raw.title,
    raw.displayAddress,
    raw.addressLine1,
    raw.address1,
    raw.headline,
  ];

  const title = titleCandidates.find((entry) => typeof entry === 'string' && entry.trim())?.trim() || null;

  const addressParts = [
    raw.address,
    raw.displayAddress,
    raw.address1,
    raw.addressLine1,
    raw.addressLine2,
    raw.city,
    raw.postcode,
    raw.postalCode,
  ]
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  const address = addressParts.join(', ') || null;

  const link = (() => {
    const urlCandidates = [raw.url, raw.link, raw.externalUrl, raw.external_url];
    for (const candidate of urlCandidates) {
      if (typeof candidate === 'string' && /^https?:/i.test(candidate.trim())) {
        return candidate.trim();
      }
    }
    return null;
  })();

  return {
    id: id || null,
    title,
    address,
    link,
  };
}

function extractNotes(raw) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const note = sanitizeString(entry.note || entry.description || entry.text || entry.comment);
        if (!note) {
          return null;
        }

        const { iso } = parseDate(entry.date || entry.createdAt || entry.created_at);

        return {
          id: sanitizeString(entry.id) || `note-${index}`,
          note,
          createdAt: iso,
        };
      })
      .filter(Boolean);
  }

  if (typeof raw === 'string' && raw.trim()) {
    return [
      {
        id: 'note-0',
        note: raw.trim(),
        createdAt: null,
      },
    ];
  }

  return [];
}

function extractStatusHistory(rawHistory, fallbackStatus, fallbackLabel, actor) {
  if (!Array.isArray(rawHistory) || !rawHistory.length) {
    const { iso } = parseDate(actor?.createdAt || null);
    return [
      {
        id: `${fallbackStatus || 'received'}-initial`,
        status: fallbackStatus || normaliseOfferStatus(fallbackStatus),
        label: fallbackLabel || formatOfferStatusLabel(fallbackStatus),
        note: actor?.note || '',
        actor: actor ? { ...actor } : null,
        createdAt: iso || null,
        type: 'status',
      },
    ];
  }

  return rawHistory
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const status = normaliseOfferStatus(entry.status || entry.stage || fallbackStatus);
      const label = sanitizeString(entry.label) || formatOfferStatusLabel(status);
      const { iso } = parseDate(entry.date || entry.createdAt || entry.created_at);
      const note = sanitizeString(entry.note || entry.comment || entry.description);
      const actorInfo = entry.actor || entry.user || null;
      const actorDetails = actorInfo ? extractAgent(actorInfo) : null;

      return {
        id: sanitizeString(entry.id) || `${status}-${index}`,
        status,
        label,
        note: note || '',
        actor: actorDetails ? { type: 'admin', ...actorDetails } : null,
        createdAt: iso,
        type: 'status',
      };
    })
    .filter(Boolean);
}

function deriveType(frequency) {
  if (!frequency) {
    return 'sale';
  }
  const token = sanitizeString(frequency).toLowerCase().replace(/[^a-z]/g, '');
  return RENT_FREQUENCY_TOKENS.has(token) ? 'rent' : 'sale';
}

function normaliseCompliance(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      moveInDate: null,
      householdSize: null,
      hasPets: false,
      employmentStatus: '',
      referencingConsent: false,
      proofOfFunds: '',
      additionalConditions: '',
    };
  }

  const { iso: moveInDate } = parseDate(
    raw.moveInDate || raw.move_in_date || raw.moveIn || raw.move_in || raw.targetMoveIn,
  );

  const householdSize = (() => {
    const candidate = raw.householdSize || raw.household_size || raw.occupants || raw.occupantCount;
    if (candidate == null) {
      return null;
    }
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  return {
    moveInDate,
    householdSize,
    hasPets: Boolean(raw.hasPets || raw.pets || raw.petOwner),
    employmentStatus:
      sanitizeString(
        raw.employmentStatus || raw.employment_status || raw.occupation || raw.employment,
      ) || '',
    referencingConsent: Boolean(raw.referencingConsent || raw.referencing_consent || raw.consent),
    proofOfFunds:
      sanitizeString(raw.proofOfFunds || raw.proof_of_funds || raw.finance || raw.finances) || '',
    additionalConditions:
      sanitizeString(
        raw.additionalConditions || raw.additional_conditions || raw.conditions || raw.requirements,
      ) || '',
  };
}

function mapOfferPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const idCandidates = [
    raw.id,
    raw.offerId,
    raw.offer_id,
    raw.externalId,
    raw.external_id,
    raw.uuid,
    raw.reference,
  ];

  const id = idCandidates
    .map((entry) => (entry == null ? '' : String(entry).trim()))
    .find((entry) => entry);

  if (!id) {
    return null;
  }

  const amountCandidates = [
    raw.price,
    raw.amount,
    raw.offerAmount,
    raw.offer_amount,
    raw.salePrice,
    raw.tenancyAmount,
    raw.rent,
    raw.offer,
  ];
  const price = amountCandidates
    .map((value) => parseNumber(value))
    .find((value) => value != null);

  const frequency = (() => {
    const frequencyCandidates = [
      raw.frequency,
      raw.rentFrequency,
      raw.offerFrequency,
      raw.paymentFrequency,
      raw.tenancyFrequency,
    ];

    for (const candidate of frequencyCandidates) {
      if (candidate == null) {
        continue;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return String(candidate);
      }
    }

    return null;
  })();

  const { iso: createdAt, timestamp: createdAtTimestamp } = parseDate(
    raw.createdAt || raw.created_at || raw.created || raw.date || raw.receivedAt,
  );
  const { iso: updatedAt, timestamp: updatedAtTimestamp } = parseDate(
    raw.updatedAt || raw.updated_at || raw.modifiedAt || raw.modified_at || raw.lastUpdated,
  );

  const statusValue = normaliseOfferStatus(raw.status || raw.stage || raw.pipeline);
  const statusLabel = sanitizeString(raw.statusLabel || raw.status_label) || formatOfferStatusLabel(statusValue);

  const contactSource =
    raw.contact || raw.applicant || raw.customer || raw.person || raw.tenant || raw.buyer || raw.client;
  const contact = extractContact(contactSource || raw);

  const propertySource =
    raw.property || raw.listing || raw.unit || raw.tenancyProperty || raw.propertyDetails || raw.asset;
  const property = extractProperty(propertySource || raw);

  const agentSource = raw.agent || raw.negotiator || raw.user || raw.assignedTo || raw.owner;
  const agent = extractAgent(agentSource);

  const depositAmount = parseNumber(raw.deposit || raw.holdingDeposit || raw.holding_deposit);
  const type = deriveType(frequency || raw.type);

  const compliance = normaliseCompliance(raw.compliance || raw.application || raw.checklist);
  const notes = extractNotes(raw.notes || raw.latestNote || raw.summary);

  const primaryActor = agent
    ? {
        type: 'admin',
        ...agent,
      }
    : contact.name
    ? { type: 'applicant', name: contact.name, email: contact.email }
    : null;

  const statusHistory = extractStatusHistory(
    raw.statusHistory || raw.history || raw.timeline,
    statusValue,
    statusLabel,
    primaryActor ? { ...primaryActor, createdAt } : null,
  );

  const presentation = {
    id,
    price: price ?? null,
    frequency: frequency || null,
    type,
    createdAt: createdAt || null,
    updatedAt: updatedAt || createdAt || null,
    createdAtTimestamp,
    updatedAtTimestamp,
    status: statusValue,
    statusLabel,
    name: contact.name || null,
    email: contact.email || null,
    phone: contact.phone || null,
    propertyId: property.id || null,
    propertyTitle: property.title || null,
    propertyAddress: property.address || null,
    propertyLink: property.link || null,
    contactId: contact.id || null,
    agentId: agent?.id || null,
    depositAmount: depositAmount ?? null,
    compliance,
    notes,
    statusHistory,
    amount: price != null ? price : null,
    source: 'apex27',
  };

  if (agent) {
    presentation.agent = agent;
  }

  return presentation;
}

function markRateLimited(durationMs) {
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  const resetAt = Date.now() + ms;
  if (resetAt > rateLimitResetAt) {
    rateLimitResetAt = resetAt;
  }
}

function logRateLimitNotice(message) {
  const now = Date.now();
  if (now - lastRateLimitLogAt > 5000) {
    console.warn(message);
    lastRateLimitLogAt = now;
  }
}

function isRateLimited() {
  return rateLimitResetAt > Date.now();
}

function canAttemptNetwork() {
  if (!API_KEY) {
    return false;
  }
  return !isRateLimited();
}

async function fetchApexOffers() {
  if (!canAttemptNetwork()) {
    return null;
  }

  const searchParams = new URLSearchParams();
  if (BRANCH_ID) {
    searchParams.set('branchId', BRANCH_ID);
  }

  const url = `${API_BASE.replace(/\/$/, '')}/offers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const headers = { accept: 'application/json' };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const dispatcher = getProxyAgent();
  const options = {
    method: 'GET',
    headers,
    ...(dispatcher ? { dispatcher } : {}),
  };

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error('Failed to fetch Apex27 offers', error);
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    console.error('Apex27 offers endpoint returned an authorization error.');
    return null;
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after')) * 1000 || DEFAULT_RATE_LIMIT_COOLDOWN_MS;
    markRateLimited(retryAfter);
    logRateLimitNotice('Rate limited when fetching Apex27 offers; using cached or fallback data.');
    return null;
  }

  if (!response.ok) {
    console.error('Failed to fetch Apex27 offers', response.status);
    return null;
  }

  try {
    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    if (Array.isArray(payload?.offers)) {
      return payload.offers;
    }
    if (Array.isArray(payload?.results)) {
      return payload.results;
    }
  } catch (error) {
    console.error('Unable to parse Apex27 offers response', error);
  }

  return null;
}

function mapOffersCollection(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => mapOfferPayload(entry))
    .filter(Boolean)
    .sort((a, b) => {
      const right = b.updatedAtTimestamp || b.createdAtTimestamp || 0;
      const left = a.updatedAtTimestamp || a.createdAtTimestamp || 0;
      return right - left;
    });
}

function getFallbackOffers() {
  return mapOffersCollection(FALLBACK_OFFERS);
}

async function resolveOffers() {
  if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedPayload;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const remote = await fetchApexOffers();
      const mapped = mapOffersCollection(remote || FALLBACK_OFFERS);
      cachedPayload = mapped;
      cachedAt = Date.now();
      return mapped;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export async function listApexOffers() {
  try {
    const offers = await resolveOffers();
    return Array.isArray(offers) && offers.length ? offers : getFallbackOffers();
  } catch (error) {
    console.error('Unable to load Apex27 offers, using fallback dataset.', error);
    return getFallbackOffers();
  }
}
