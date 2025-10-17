import { fetchPropertiesByTypeCachedFirst, fetchPropertyById } from './apex27.mjs';
import { formatOfferFrequencyLabel } from './offer-frequency.mjs';
import { formatPriceGBP, formatRentFrequency } from './format.mjs';
import { resolvePropertyTypeLabel } from './property-type.mjs';
import rentUtils from './rent.js';
import {
  getLettingsOverrides,
  getLettingsOverrideById,
  setLettingsOverride,
} from './admin-lettings-overrides.mjs';

const { rentToMonthly, parsePriceNumber } = rentUtils;

const AVAILABLE_STATUS_SET = new Set(['available', 'pending']);
const ARCHIVED_STATUS_SET = new Set(['let_agreed', 'under_offer']);

const STATUS_LABELS = {
  available: 'Available',
  pending: 'Marketing in progress',
  let_agreed: 'Let agreed',
  under_offer: 'Under offer',
};

const STATUS_TONES = {
  available: 'success',
  pending: 'info',
  let_agreed: 'muted',
  under_offer: 'muted',
};

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
}

function normalizeStatus(value) {
  if (!value) {
    return '';
  }

  return String(value).trim().toLowerCase();
}

function determinePipeline(status, archivedFlag) {
  if (archivedFlag) {
    return 'archived';
  }

  if (ARCHIVED_STATUS_SET.has(status)) {
    return 'archived';
  }

  if (AVAILABLE_STATUS_SET.has(status)) {
    return 'available';
  }

  return 'other';
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : value;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  const isoCandidate =
    /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(stringValue)
      ? stringValue.replace(' ', 'T') + 'Z'
      : stringValue;

  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toIsoString(value) {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
}

function resolveListingId(listing) {
  if (!listing || typeof listing !== 'object') {
    return null;
  }

  const candidates = [
    listing.id,
    listing.externalId,
    listing.reference,
    listing.fullReference,
    listing.sourceId,
    listing._scraye?.reference,
    listing._scraye?.sourceId,
  ];

  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }

    const idString = String(candidate).trim();
    if (idString) {
      return idString;
    }
  }

  return null;
}

function resolveBranch(listing) {
  const branch = listing?.branch;
  if (!branch || typeof branch !== 'object') {
    return null;
  }

  const { id, name, code, phone, email, address1, city, postalCode } = branch;

  const normalizedId = id != null ? String(id).trim() : null;
  const normalizedCode = code != null ? String(code).trim() : null;

  const contactDetails = {};
  if (phone) {
    contactDetails.phone = String(phone);
  }
  if (email) {
    contactDetails.email = String(email);
  }

  const addressParts = [address1, city, postalCode].map((part) => normalizeString(part));
  const formattedAddress = addressParts.filter(Boolean).join(', ');

  return {
    id: normalizedId,
    code: normalizedCode,
    name: normalizeString(name) || 'Aktonz',
    contact: Object.keys(contactDetails).length ? contactDetails : null,
    address: formattedAddress || null,
  };
}

function resolveNegotiator(listing) {
  const user = listing?.user;
  if (!user || typeof user !== 'object') {
    return null;
  }

  const nameParts = [user.title, user.firstName, user.lastName]
    .map((part) => normalizeString(part))
    .filter(Boolean);

  const contact = {};
  if (user.email) {
    contact.email = String(user.email);
  }
  if (user.phone) {
    contact.phone = String(user.phone);
  }

  return {
    id: user.id != null ? String(user.id).trim() : null,
    name: nameParts.length ? nameParts.join(' ') : normalizeString(user.displayName),
    contact: Object.keys(contact).length ? contact : null,
  };
}

function parseRentValue(value) {
  if (value == null) {
    return null;
  }

  const numeric = parsePriceNumber(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function formatRentLabel(amount, frequency, currency = 'GBP') {
  if (amount == null) {
    return '';
  }

  const formattedAmount = formatPriceGBP(amount, { isSale: false, currency });
  const frequencyLabel = formatOfferFrequencyLabel(frequency);

  if (frequencyLabel) {
    return `${formattedAmount} ${frequencyLabel}`;
  }

  return formattedAmount;
}

function deriveAvailableLabel(listing) {
  const candidates = [listing.availableDate, listing.dateAvailable, listing.availableFrom];

  for (const candidate of candidates) {
    const date = parseDate(candidate);
    if (!date) {
      continue;
    }

    return `Available ${new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)}`;
  }

  return listing.status === 'available' ? 'Available now' : '';
}

function extractImage(listing) {
  const candidates = Array.isArray(listing?.images) ? listing.images : [];

  if (candidates.length > 0) {
    const primary = candidates[0];
    if (primary && typeof primary === 'object') {
      return {
        url: primary.url || primary.imageUrl || null,
        thumbnail: primary.thumbnailUrl || primary.url || null,
        updatedAt: toIsoString(primary.dtsUpdated || primary.updatedAt),
      };
    }
  }

  const gallery = Array.isArray(listing?.gallery) ? listing.gallery : [];
  if (gallery.length > 0) {
    const primary = gallery[0];
    if (primary && typeof primary === 'object') {
      return {
        url: primary.url || primary.imageUrl || null,
        thumbnail: primary.thumbnailUrl || primary.url || null,
        updatedAt: toIsoString(primary.dtsUpdated || primary.updatedAt),
      };
    }
  }

  return null;
}

function extractMetadataLinks(listing) {
  const entries = [];
  const metadata = Array.isArray(listing?.metadata) ? listing.metadata : [];

  metadata.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const url = normalizeString(item.value || item.url);
    if (!url || !/^https?:/i.test(url)) {
      return;
    }

    entries.push({
      label: normalizeString(item.label) || 'External link',
      type: normalizeString(item.type) || 'link',
      url,
    });
  });

  const portalUrl = normalizeString(listing.externalUrl || listing.portalUrl);
  if (portalUrl && /^https?:/i.test(portalUrl)) {
    const existing = entries.some((entry) => entry.url === portalUrl);
    if (!existing) {
      entries.unshift({ label: 'Apex27 listing', type: 'portal', url: portalUrl });
    }
  }

  return entries;
}

function deriveMarketingTags(listing) {
  const links = extractMetadataLinks(listing);
  const types = new Set(links.map((entry) => entry.type));

  return {
    hasPortal: types.has('portal'),
    hasVideo: types.has('video'),
    hasVirtualTour: types.has('virtual_tour') || types.has('360') || types.has('matterport'),
    hasSourceLink: types.has('source'),
    links,
  };
}

function buildSearchIndex(listing, branch, negotiator) {
  const parts = [
    listing.displayAddress,
    listing.address1,
    listing.address2,
    listing.city,
    listing.county,
    listing.postalCode,
    listing.reference,
    listing.fullReference,
    listing.summary,
    listing.description,
    resolvePropertyTypeLabel(listing),
    branch?.name,
    branch?.code,
    negotiator?.name,
  ];

  return parts
    .map((part) => normalizeString(part).toLowerCase())
    .filter(Boolean)
    .join(' ');
}

function mapListingForAdmin(listing) {
  if (!listing || typeof listing !== 'object') {
    return null;
  }

  const id = resolveListingId(listing);
  if (!id) {
    return null;
  }

  const status = normalizeStatus(listing.status) || 'available';
  const branch = resolveBranch(listing);
  const negotiator = resolveNegotiator(listing);
  const marketing = deriveMarketingTags(listing);
  const rentAmount = parseRentValue(listing.price);
  const rentFrequency = normalizeString(listing.rentFrequency) || null;
  const rentMonthly = rentAmount != null ? rentToMonthly(rentAmount, rentFrequency) : null;
  const rentLabel = rentAmount != null ? formatRentLabel(rentAmount, rentFrequency, listing.priceCurrency) : '';
  const propertyTypeLabel = resolvePropertyTypeLabel(listing);
  const pipeline = determinePipeline(status, Boolean(listing.archived));
  const updatedAt = toIsoString(listing.updatedAt || listing.dtsUpdated || listing.modifiedAt);
  const createdAt = toIsoString(listing.createdAt || listing.addedAt || listing.date);
  const availableLabel = deriveAvailableLabel({ ...listing, status });
  const image = extractImage(listing);
  const marketingStatus = normalizeString(listing.marketingStatus);

  const bedroomCount = Number.isFinite(Number(listing.bedrooms)) ? Number(listing.bedrooms) : null;
  const bathroomCount = Number.isFinite(Number(listing.bathrooms)) ? Number(listing.bathrooms) : null;
  const receptionCount = Number.isFinite(Number(listing.receptions)) ? Number(listing.receptions) : null;

  const searchIndex = buildSearchIndex(listing, branch, negotiator);

  return {
    id,
    reference: normalizeString(listing.fullReference) || normalizeString(listing.reference) || id,
    title: normalizeString(listing.title) || normalizeString(listing.displayAddress) || 'Untitled property',
    displayAddress: normalizeString(listing.displayAddress) || null,
    address: {
      line1: normalizeString(listing.address1) || null,
      line2: normalizeString(listing.address2) || null,
      city: normalizeString(listing.city) || null,
      county: normalizeString(listing.county) || null,
      postalCode: normalizeString(listing.postalCode) || null,
      country: normalizeString(listing.country) || null,
    },
    coordinates:
      listing.latitude != null && listing.longitude != null
        ? { lat: Number(listing.latitude), lng: Number(listing.longitude) }
        : null,
    status,
    statusLabel: STATUS_LABELS[status] || STATUS_LABELS.available,
    statusTone: STATUS_TONES[status] || 'info',
    marketingStatus: marketingStatus || null,
    pipeline,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    receptions: receptionCount,
    furnished: normalizeString(listing.furnished) || null,
    propertyType: propertyTypeLabel || null,
    rent: rentAmount != null
      ? {
          amount: rentAmount,
          currency: listing.priceCurrency || 'GBP',
          frequency: rentFrequency,
          monthly: rentMonthly,
          label: rentLabel,
        }
      : null,
    pricePrefix: normalizeString(listing.pricePrefix) || null,
    availabilityLabel: availableLabel,
    branch,
    negotiator,
    marketing,
    image,
    summary: normalizeString(listing.summary) || null,
    description: normalizeString(listing.description) || null,
    metadata: Array.isArray(listing.metadata) ? listing.metadata : [],
    matchingAreas: Array.isArray(listing.matchingSearchRegions)
      ? listing.matchingSearchRegions.filter((region) => normalizeString(region))
      : [],
    createdAt,
    updatedAt,
    searchIndex,
    raw: listing,
  };
}

function sortListingsByRecency(listings) {
  return listings
    .slice()
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
}

function normalizeRentFrequencyInput(value) {
  if (value == null) {
    return null;
  }

  const normalized = formatRentFrequency(value);
  return normalized ? normalized : null;
}

function rebuildSearchIndexFromListing(listing) {
  const parts = [
    listing.displayAddress,
    listing.title,
    listing.reference,
    listing.address?.line1,
    listing.address?.line2,
    listing.address?.city,
    listing.address?.county,
    listing.address?.postalCode,
    listing.address?.country,
    listing.summary,
    listing.description,
    listing.propertyType,
    listing.furnished,
    ...(Array.isArray(listing.matchingAreas) ? listing.matchingAreas : []),
    listing.branch?.name,
    listing.branch?.code,
    listing.negotiator?.name,
    ...(Array.isArray(listing.metadata)
      ? listing.metadata.flatMap((entry) => [entry?.label, entry?.value])
      : []),
    ...(Array.isArray(listing.marketing?.links)
      ? listing.marketing.links.flatMap((link) => [link?.label, link?.url])
      : []),
  ];

  return parts
    .map((part) => (typeof part === 'string' ? part.trim().toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

function applyListingOverride(listing, override) {
  if (!override || typeof override !== 'object') {
    return listing;
  }

  const next = {
    ...listing,
    address: listing.address ? { ...listing.address } : { line1: null, line2: null, city: null, county: null, postalCode: null, country: null },
    rent: listing.rent ? { ...listing.rent } : null,
    marketing: listing.marketing
      ? { ...listing.marketing, links: Array.isArray(listing.marketing.links) ? listing.marketing.links.map((link) => ({ ...link })) : [] }
      : { hasPortal: false, hasVideo: false, hasVirtualTour: false, hasSourceLink: false, links: [] },
    metadata: Array.isArray(listing.metadata) ? listing.metadata.map((entry) => ({ ...entry })) : [],
    matchingAreas: Array.isArray(listing.matchingAreas) ? [...listing.matchingAreas] : [],
  };

  if (Object.prototype.hasOwnProperty.call(override, 'title')) {
    next.title = override.title || 'Untitled property';
  }

  if (Object.prototype.hasOwnProperty.call(override, 'displayAddress')) {
    next.displayAddress = override.displayAddress || null;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'reference')) {
    next.reference = override.reference || null;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'pricePrefix')) {
    next.pricePrefix = override.pricePrefix || null;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'availabilityLabel')) {
    next.availabilityLabel = override.availabilityLabel || null;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'status') && override.status) {
    next.status = override.status;
    next.statusLabel = STATUS_LABELS[override.status] || STATUS_LABELS.available;
    next.statusTone = STATUS_TONES[override.status] || 'info';
    next.pipeline = determinePipeline(override.status, next.pipeline === 'archived');
  }

  if (override.rent) {
    const { amount, frequency, currency } = override.rent;

    if (amount == null) {
      next.rent = null;
    } else {
      const normalizedFrequency = frequency != null ? normalizeRentFrequencyInput(frequency) : normalizeRentFrequencyInput(next.rent?.frequency);
      const rentCurrency = currency ? String(currency).toUpperCase() : next.rent?.currency || 'GBP';
      const rentLabel = formatRentLabel(amount, normalizedFrequency, rentCurrency);
      const monthly = rentToMonthly(amount, normalizedFrequency || next.rent?.frequency);

      next.rent = {
        amount,
        frequency: normalizedFrequency || null,
        currency: rentCurrency,
        monthly: Number.isFinite(monthly) ? monthly : null,
        label: rentLabel || null,
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(override, 'bedrooms')) {
    next.bedrooms = override.bedrooms;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'bathrooms')) {
    next.bathrooms = override.bathrooms;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'receptions')) {
    next.receptions = override.receptions;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'furnished')) {
    next.furnished = override.furnished;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'propertyType')) {
    next.propertyType = override.propertyType;
  }

  if (override.address && typeof override.address === 'object') {
    next.address = {
      line1: override.address.line1 ?? null,
      line2: override.address.line2 ?? null,
      city: override.address.city ?? null,
      county: override.address.county ?? null,
      postalCode: override.address.postalCode ?? null,
      country: override.address.country ?? null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(override, 'matchingAreas')) {
    next.matchingAreas = Array.isArray(override.matchingAreas) ? override.matchingAreas.filter(Boolean) : [];
  }

  if (override.coordinates && typeof override.coordinates === 'object') {
    const lat = override.coordinates.lat;
    const lng = override.coordinates.lng;
    if (lat == null && lng == null) {
      next.coordinates = null;
    } else {
      next.coordinates = {
        lat: lat == null ? null : Number(lat),
        lng: lng == null ? null : Number(lng),
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(override, 'summary')) {
    next.summary = override.summary ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(override, 'description')) {
    next.description = override.description ?? null;
  }

  if (override.marketing && typeof override.marketing === 'object') {
    const links = Array.isArray(override.marketing.links)
      ? override.marketing.links.map((link) => ({ ...link }))
      : [];

    const hasPortal = links.some((link) => link.type === 'portal');
    const hasVideo = links.some((link) => link.type === 'video');
    const hasVirtualTour = links.some((link) => ['virtual_tour', '360', 'matterport'].includes(link.type));
    const hasSourceLink = links.some((link) => link.type === 'source');

    next.marketing = {
      hasPortal,
      hasVideo,
      hasVirtualTour,
      hasSourceLink,
      links,
    };
  }

  if (Object.prototype.hasOwnProperty.call(override, 'metadata')) {
    next.metadata = Array.isArray(override.metadata)
      ? override.metadata.map((entry) => ({ ...entry }))
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(override, 'updatedAt') && override.updatedAt) {
    next.updatedAt = override.updatedAt;
  }

  next.searchIndex = rebuildSearchIndexFromListing(next);

  return next;
}

function summariseBucket(listings) {
  const count = listings.length;

  let totalMonthlyRent = 0;
  let rentEntries = 0;
  const statusCounts = new Map();
  const bedroomCounts = new Map();
  const areaCounts = new Map();
  let latestUpdatedAt = null;

  listings.forEach((listing) => {
    if (listing.rent?.monthly != null) {
      totalMonthlyRent += listing.rent.monthly;
      rentEntries += 1;
    }

    const statusKey = listing.status;
    statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1);

    if (listing.bedrooms != null) {
      bedroomCounts.set(listing.bedrooms, (bedroomCounts.get(listing.bedrooms) || 0) + 1);
    }

    const areas = listing.matchingAreas.length
      ? listing.matchingAreas
      : [listing.address.city, listing.address.county];

    areas
      .map((area) => normalizeString(area))
      .filter(Boolean)
      .forEach((area) => {
        areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
      });

    if (listing.updatedAt) {
      const timestamp = new Date(listing.updatedAt).getTime();
      if (Number.isFinite(timestamp)) {
        if (!latestUpdatedAt || timestamp > new Date(latestUpdatedAt).getTime()) {
          latestUpdatedAt = listing.updatedAt;
        }
      }
    }
  });

  const averageMonthlyRent = rentEntries > 0 ? totalMonthlyRent / rentEntries : null;
  const averageRentLabel =
    averageMonthlyRent != null
      ? formatPriceGBP(Math.round(averageMonthlyRent), { isSale: false }) + ' pcm'
      : null;

  const statusBreakdown = Array.from(statusCounts.entries()).map(([status, value]) => ({
    status,
    label: STATUS_LABELS[status] || STATUS_LABELS.available,
    count: value,
  }));

  const bedroomMix = Array.from(bedroomCounts.entries())
    .map(([bedrooms, value]) => ({ bedrooms, count: value }))
    .sort((a, b) => b.count - a.count || a.bedrooms - b.bedrooms);

  const topAreas = Array.from(areaCounts.entries())
    .map(([label, value]) => ({ label, count: value }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  return {
    count,
    averageMonthlyRent,
    averageRentLabel,
    statusBreakdown,
    bedroomMix,
    topAreas,
    latestUpdatedAt,
  };
}

export async function listLettingsListings() {
  const properties = await fetchPropertiesByTypeCachedFirst('rent', {
    useCacheOnly: true,
    allowNetwork: false,
  });

  const entries = Array.isArray(properties) ? properties : [];
  const mapped = entries
    .map((property) => mapListingForAdmin(property))
    .filter(Boolean);

  const overrides = await getLettingsOverrides();
  const withOverrides = mapped.map((listing) => {
    const override = overrides.get(listing.id);
    return override ? applyListingOverride(listing, override) : listing;
  });

  return sortListingsByRecency(withOverrides);
}

export async function getLettingsListingById(id) {
  if (!id) {
    return null;
  }

  const normalizedId = String(id).trim();
  const list = await listLettingsListings();
  const match = list.find((listing) => listing.id === normalizedId);

  if (match) {
    return match;
  }

  try {
    const detailed = await fetchPropertyById(id, { allowNetwork: false });
    const mapped = mapListingForAdmin(detailed);
    if (!mapped) {
      return null;
    }

    const override = await getLettingsOverrideById(normalizedId);
    return override ? applyListingOverride(mapped, override) : mapped;
  } catch (error) {
    console.warn('Failed to load listing by id for admin', id, error);
    return null;
  }
}

export async function getLettingsSummary() {
  const listings = await listLettingsListings();

  const buckets = {
    all: summariseBucket(listings),
    available: summariseBucket(listings.filter((listing) => listing.pipeline === 'available')),
    archived: summariseBucket(listings.filter((listing) => listing.pipeline === 'archived')),
  };

  return {
    totals: buckets,
    statusLabels: STATUS_LABELS,
  };
}

export function filterLettingsListings(listings, { view = 'available', statuses = [], search = '' } = {}) {
  if (!Array.isArray(listings)) {
    return [];
  }

  const normalizedView = ['available', 'archived', 'all'].includes(view) ? view : 'available';
  const normalizedStatuses = Array.isArray(statuses)
    ? statuses.map((status) => normalizeStatus(status)).filter(Boolean)
    : [];
  const normalizedSearch = normalizeString(search).toLowerCase();

  return listings.filter((listing) => {
    if (normalizedView === 'available' && listing.pipeline !== 'available') {
      return false;
    }

    if (normalizedView === 'archived' && listing.pipeline !== 'archived') {
      return false;
    }

    if (normalizedStatuses.length > 0 && !normalizedStatuses.includes(listing.status)) {
      return false;
    }

    if (normalizedSearch && !listing.searchIndex.includes(normalizedSearch)) {
      return false;
    }

    return true;
  });
}

export function serializeListing(listing) {
  if (!listing) {
    return null;
  }

  const { raw, searchIndex, ...rest } = listing;
  return rest;
}

export function serializeListings(listings) {
  return listings.map((listing) => serializeListing(listing)).filter(Boolean);
}

export class AdminListingValidationError extends Error {
  constructor(messages = []) {
    const list = Array.isArray(messages) ? messages.filter(Boolean).map(String) : [String(messages)];
    super(list[0] || 'Listing update failed validation');
    this.name = 'AdminListingValidationError';
    this.messages = list;
  }
}

function sanitizeNumberInput(value, { allowFloat = false } = {}) {
  if (value == null || value === '') {
    return null;
  }

  const numericString = String(value).replace(/[^0-9.-]/g, '').trim();
  if (!numericString) {
    return null;
  }

  const numeric = Number(numericString);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (allowFloat) {
    return numeric;
  }

  return Math.round(numeric);
}

function sanitizeNullableString(value) {
  if (value == null) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : null;
}

function sanitizeMatchingAreasInput(value) {
  if (value == null) {
    return [];
  }

  const entries = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  const seen = new Set();

  entries.forEach((entry) => {
    const normalized = sanitizeNullableString(entry);
    if (normalized) {
      seen.add(normalized);
    }
  });

  return Array.from(seen);
}

function sanitizeMarketingLinksInput(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }

  const links = [];

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const url = sanitizeNullableString(entry.url);
    const label = sanitizeNullableString(entry.label) || null;
    const type = sanitizeNullableString(entry.type) || 'link';

    if (!url) {
      if (label || entry.type) {
        errors.push(`Marketing link ${index + 1} requires a URL.`);
      }
      return;
    }

    links.push({
      label: label || 'Link',
      url,
      type,
    });
  });

  return links;
}

function sanitizeMetadataInput(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const label = sanitizeNullableString(entry.label);
      const entryValue = sanitizeNullableString(entry.value);

      if (!label && !entryValue) {
        return null;
      }

      return {
        label: label || 'Metadata',
        value: entryValue || '',
      };
    })
    .filter(Boolean);
}

function sanitizeListingUpdateInput(updates = {}) {
  const errors = [];
  const override = {};
  const input = updates && typeof updates === 'object' ? updates : {};

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = normalizeStatus(input.status);
    if (!status || !STATUS_LABELS[status]) {
      errors.push('Select a valid listing status.');
    } else {
      override.status = status;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'availabilityLabel')) {
    override.availabilityLabel = sanitizeNullableString(input.availabilityLabel);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'pricePrefix')) {
    override.pricePrefix = sanitizeNullableString(input.pricePrefix);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    override.title = sanitizeNullableString(input.title);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'displayAddress')) {
    override.displayAddress = sanitizeNullableString(input.displayAddress);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'reference')) {
    override.reference = sanitizeNullableString(input.reference);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'rent')) {
    const rentInput = input.rent && typeof input.rent === 'object' ? input.rent : {};
    const rentOverride = {};

    if (Object.prototype.hasOwnProperty.call(rentInput, 'amount')) {
      if (rentInput.amount == null || rentInput.amount === '') {
        rentOverride.amount = null;
      } else {
        const parsedAmount = sanitizeNumberInput(rentInput.amount, { allowFloat: true });
        if (parsedAmount == null || parsedAmount <= 0) {
          errors.push('Enter a valid rent amount.');
        } else {
          rentOverride.amount = parsedAmount;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(rentInput, 'frequency')) {
      const frequency = sanitizeNullableString(rentInput.frequency);
      rentOverride.frequency = frequency ? normalizeRentFrequencyInput(frequency) : null;
    }

    if (Object.prototype.hasOwnProperty.call(rentInput, 'currency')) {
      const currency = sanitizeNullableString(rentInput.currency);
      rentOverride.currency = currency ? currency.toUpperCase() : 'GBP';
    }

    if (Object.keys(rentOverride).length > 0) {
      if (!Object.prototype.hasOwnProperty.call(rentOverride, 'amount')) {
        rentOverride.amount = null;
      }
      override.rent = rentOverride;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'bedrooms')) {
    override.bedrooms = sanitizeNumberInput(input.bedrooms);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'bathrooms')) {
    override.bathrooms = sanitizeNumberInput(input.bathrooms, { allowFloat: true });
  }

  if (Object.prototype.hasOwnProperty.call(input, 'receptions')) {
    override.receptions = sanitizeNumberInput(input.receptions, { allowFloat: true });
  }

  if (Object.prototype.hasOwnProperty.call(input, 'furnished')) {
    override.furnished = sanitizeNullableString(input.furnished);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'propertyType')) {
    override.propertyType = sanitizeNullableString(input.propertyType);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'address')) {
    const addressInput = input.address && typeof input.address === 'object' ? input.address : {};
    override.address = {
      line1: sanitizeNullableString(addressInput.line1),
      line2: sanitizeNullableString(addressInput.line2),
      city: sanitizeNullableString(addressInput.city),
      county: sanitizeNullableString(addressInput.county),
      postalCode: sanitizeNullableString(addressInput.postalCode),
      country: sanitizeNullableString(addressInput.country),
    };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'matchingAreas')) {
    override.matchingAreas = sanitizeMatchingAreasInput(input.matchingAreas);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'coordinates')) {
    const coordsInput = input.coordinates && typeof input.coordinates === 'object' ? input.coordinates : {};
    const lat = sanitizeNumberInput(coordsInput.lat, { allowFloat: true });
    const lng = sanitizeNumberInput(coordsInput.lng, { allowFloat: true });

    if (lat == null && lng == null) {
      override.coordinates = { lat: null, lng: null };
    } else {
      override.coordinates = { lat, lng };
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'summary')) {
    override.summary = sanitizeNullableString(input.summary);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const value = input.description == null ? null : String(input.description).trim();
    override.description = value || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'marketing')) {
    const marketingInput = input.marketing && typeof input.marketing === 'object' ? input.marketing : {};
    override.marketing = {
      links: sanitizeMarketingLinksInput(marketingInput.links, errors),
    };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'metadata')) {
    override.metadata = sanitizeMetadataInput(input.metadata);
  }

  return { override, errors };
}

function mergeListingOverride(existing = {}, updates = {}) {
  const merged = { ...existing };

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  });

  return merged;
}

function pruneUndefinedFields(object) {
  if (!object || typeof object !== 'object') {
    return object;
  }

  const result = Array.isArray(object) ? [] : {};

  Object.entries(object).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value && typeof value === 'object') {
      const nested = pruneUndefinedFields(value);
      if (Array.isArray(nested)) {
        result[key] = nested;
      } else if (nested && Object.keys(nested).length > 0) {
        result[key] = nested;
      } else if (Array.isArray(value)) {
        result[key] = nested;
      } else {
        result[key] = nested;
      }
      return;
    }

    result[key] = value;
  });

  return result;
}

export async function updateLettingsListingById(id, updates = {}) {
  const listingId = sanitizeNullableString(id);
  if (!listingId) {
    throw new AdminListingValidationError(['Listing id is required.']);
  }

  const existingListing = await getLettingsListingById(listingId);
  if (!existingListing) {
    return null;
  }

  const { override, errors } = sanitizeListingUpdateInput(updates);

  if (errors.length > 0) {
    throw new AdminListingValidationError(errors);
  }

  const overridesMap = await getLettingsOverrides();
  const existingOverride = overridesMap.get(listingId) || {};
  const mergedOverride = mergeListingOverride(existingOverride, override);
  const timestamp = new Date().toISOString();

  const cleanedOverride = pruneUndefinedFields({
    ...mergedOverride,
    updatedAt: timestamp,
  });

  await setLettingsOverride(listingId, cleanedOverride);
  return getLettingsListingById(listingId);
}
