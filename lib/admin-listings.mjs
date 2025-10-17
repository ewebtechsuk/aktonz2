import { fetchPropertiesByTypeCachedFirst, fetchPropertyById } from './apex27.mjs';
import { formatOfferFrequencyLabel } from './offer-frequency.mjs';
import { formatPriceGBP } from './format.mjs';
import { resolvePropertyTypeLabel } from './property-type.mjs';
import rentUtils from './rent.js';

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

  return sortListingsByRecency(mapped);
}

export async function getLettingsListingById(id) {
  if (!id) {
    return null;
  }

  const list = await listLettingsListings();
  const normalizedId = String(id).trim();
  const match = list.find((listing) => listing.id === normalizedId);

  if (match) {
    return match;
  }

  try {
    const detailed = await fetchPropertyById(id, { allowNetwork: false });
    return mapListingForAdmin(detailed);
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
