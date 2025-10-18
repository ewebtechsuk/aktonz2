import {
  propertyMatchesIdentifier,
  resolvePropertyIdentifier,
  normalizePropertyIdentifierForComparison,
} from './property-id.mjs';
import { resolvePropertyTypeLabel } from './property-type.mjs';
import { formatPriceGBP } from './format.mjs';
import { normalizeDeposit, resolveAvailabilityDate } from './deposits.mjs';
import {
  loadScrayeListingsByType,
  fetchScrayeListingById,
  normalizeScrayeListings,
  loadScrayeCache,
} from './scraye.mjs';

const API_URL = 'https://api.apex27.co.uk/listings';
const REGIONS_URL = 'https://api.apex27.co.uk/search-regions';

const API_KEY = process.env.APEX27_API_KEY;
const HAS_API_KEY = Boolean(API_KEY && API_KEY !== 'X-Api-Key');

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120_000;
const RATE_LIMIT_LOG_THROTTLE_MS = 5000;
let apexRateLimitResetAt = 0;
let lastRateLimitLogAt = 0;

function isRateLimitActive() {
  return apexRateLimitResetAt > Date.now();
}

function parseRetryAfterMs(value) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.round(numeric * 1000);
  }

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) {
    const delta = parsedDate - Date.now();
    return delta > 0 ? delta : 0;

  }

  return null;
}

function extractRetryAfterMs(res) {
  if (!res || typeof res !== 'object') {
    return null;
  }

  const headers = res.headers;
  if (!headers || typeof headers.get !== 'function') {
    return null;
  }

  try {
    const headerValue = headers.get('retry-after');
    if (!headerValue) {
      return null;
    }
    return parseRetryAfterMs(headerValue);
  } catch {
    return null;
  }
}

function markRateLimited(resOrDurationMs) {
  let durationMs = null;
  if (typeof resOrDurationMs === 'number') {
    durationMs = resOrDurationMs;
  } else if (resOrDurationMs) {
    durationMs = extractRetryAfterMs(resOrDurationMs);
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    durationMs = DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  }

  const candidateReset = Date.now() + durationMs;
  if (candidateReset > apexRateLimitResetAt) {
    apexRateLimitResetAt = candidateReset;
  }
}

function logRateLimitNotice(message) {
  const now = Date.now();
  if (now - lastRateLimitLogAt > RATE_LIMIT_LOG_THROTTLE_MS) {
    console.warn(message);
    lastRateLimitLogAt = now;
  }
}

function canAttemptNetwork(allowNetwork = true) {
  if (!allowNetwork) {
    return false;
  }
  if (!HAS_API_KEY) {
    return false;
  }
  return !isRateLimitActive();

}

function coercePricePrefixValue(value, seen = new Set()) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const coerced = coercePricePrefixValue(entry, seen);
      if (coerced) {
        return coerced;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return null;
    }
    seen.add(value);

    const candidateKeys = [
      'value',
      'code',
      'name',
      'label',
      'text',
      'description',
    ];

    for (const key of candidateKeys) {
      if (key in value) {
        const coerced = coercePricePrefixValue(value[key], seen);
        if (coerced) {
          return coerced;
        }
      }
    }

    return null;
  }

  return null;
}

function getNestedValue(source, path) {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[key];
  }
  return current;
}

function parseCurrencyAmount(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const match = value.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!match) {
      return null;
    }
    const normalized = match[0].replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object') {
    const candidates = [
      value.amount,
      value.value,
      value.fixed,
      value.text,
      value.description,
      value.label,
    ];
    for (const candidate of candidates) {
      const parsed = parseCurrencyAmount(candidate);
      if (parsed != null) {
        return parsed;
      }
    }
  }
  return null;
}

const SECURITY_DEPOSIT_PATHS = [
  ['securityDeposit'],
  ['security_deposit'],
  ['deposit'],
  ['depositAmount'],
  ['deposit_amount'],
  ['depositFixed'],
  ['deposit_fixed'],
  ['depositValue'],
  ['deposit_value'],
  ['financials', 'securityDeposit'],
  ['financials', 'security_deposit'],
  ['financials', 'deposit'],
  ['financials', 'depositAmount'],
  ['financials', 'deposit_amount'],
  ['financial', 'securityDeposit'],
  ['financial', 'deposit'],
  ['financial', 'depositAmount'],
  ['pricing', 'securityDeposit'],
  ['pricing', 'deposit'],
  ['marketing', 'securityDeposit'],
  ['marketing', 'deposit'],
  ['details', 'securityDeposit'],
];

const HOLDING_DEPOSIT_PATHS = [
  ['holdingDeposit'],
  ['holding_deposit'],
  ['holdingDepositAmount'],
  ['holding_deposit_amount'],
  ['holdingDepositFixed'],
  ['holding_deposit_fixed'],
  ['financials', 'holdingDeposit'],
  ['financials', 'holding_deposit'],
  ['financials', 'holdingDepositAmount'],
  ['financials', 'holding_deposit_amount'],
  ['financial', 'holdingDeposit'],
  ['financial', 'holdingDepositAmount'],
  ['pricing', 'holdingDeposit'],
  ['pricing', 'holdingDepositAmount'],
  ['marketing', 'holdingDeposit'],
  ['details', 'holdingDeposit'],
];

const SECURITY_DEPOSIT_METADATA_TYPES = ['deposit', 'security_deposit'];
const HOLDING_DEPOSIT_METADATA_TYPES = ['holding_deposit'];

function extractDepositFromPaths(listing, paths) {
  for (const path of paths) {
    const value = getNestedValue(listing, path);
    if (value != null) {
      return value;
    }
  }
  return null;
}

function extractDepositFromMetadata(listing, { types = [], labelMatchers = [] } = {}) {
  const entries = Array.isArray(listing?.metadata) ? listing.metadata : [];
  if (entries.length === 0) {
    return null;
  }

  const normalizedTypes = types.map((type) => String(type).trim().toLowerCase()).filter(Boolean);

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const typeValue = entry.type != null ? String(entry.type).trim().toLowerCase() : '';
    if (normalizedTypes.length > 0 && !normalizedTypes.includes(typeValue)) {
      continue;
    }

    const labelValue = entry.label != null ? String(entry.label).toLowerCase() : '';
    if (
      labelMatchers.length > 0 &&
      !labelMatchers.some((matcher) =>
        typeof matcher === 'function'
          ? matcher(labelValue)
          : labelValue.includes(String(matcher).toLowerCase())
      )
    ) {
      continue;
    }

    const candidates = [entry.amount, entry.value, entry.text, entry.description, entry.label];
    for (const candidate of candidates) {
      const parsed = parseCurrencyAmount(candidate);
      if (parsed != null) {
        return parsed;
      }
    }
  }

  return null;
}

export function resolveSecurityDepositSource(listing) {
  const direct = extractDepositFromPaths(listing, SECURITY_DEPOSIT_PATHS);
  if (direct != null) {
    return direct;
  }

  const metadataValue = extractDepositFromMetadata(listing, {
    types: SECURITY_DEPOSIT_METADATA_TYPES,
    labelMatchers: [
      (label) => label.includes('security deposit'),
      (label) => label.includes('standard deposit'),
      (label) => label.includes('deposit') && !label.includes('holding') && !label.includes('option'),
    ],
  });
  if (metadataValue != null) {
    return metadataValue;
  }

  return null;
}

export function resolveHoldingDepositSource(listing) {
  const direct = extractDepositFromPaths(listing, HOLDING_DEPOSIT_PATHS);
  if (direct != null) {
    return direct;
  }

  const metadataValue = extractDepositFromMetadata(listing, {
    types: HOLDING_DEPOSIT_METADATA_TYPES,
    labelMatchers: [
      (label) => label.includes('holding deposit'),
    ],
  });
  if (metadataValue != null) {
    return metadataValue;
  }

  return null;
}

export function extractPricePrefix(listing) {
  if (!listing || typeof listing !== 'object') {
    return null;
  }

  const candidatePaths = [
    ['pricePrefix'],
    ['price_prefix'],
    ['pricePrefixText'],
    ['pricePrefixLabel'],
    ['pricePrefixDescription'],
    ['pricePrefixValue'],
    ['priceQualifier'],
    ['price_qualifier'],
    ['priceQualifierText'],
    ['priceQualifierLabel'],
    ['priceQualifierDescription'],
    ['priceQualifierValue'],
    ['priceQualifierCode'],
    ['priceQualifierName'],
    ['pricing', 'pricePrefix'],
    ['pricing', 'price_prefix'],
    ['pricing', 'priceQualifier'],
    ['pricing', 'qualifier'],
    ['pricing', 'priceQualifierCode'],
    ['pricing', 'priceQualifierText'],
    ['pricing', 'priceQualifierLabel'],
    ['sale', 'pricePrefix'],
    ['sale', 'price_prefix'],
    ['sale', 'priceQualifier'],
    ['sale', 'price_qualifier'],
    ['sale', 'priceQualifierCode'],
    ['sale', 'priceQualifierText'],
    ['sale', 'priceQualifierLabel'],
    ['sale', 'price', 'pricePrefix'],
    ['sale', 'price', 'priceQualifier'],
    ['sale', 'price', 'qualifier'],
    ['sale', 'price', 'prefix'],
    ['sale', 'pricing', 'pricePrefix'],
    ['sale', 'pricing', 'priceQualifier'],
    ['sale', 'pricing', 'qualifier'],
    ['saleDetails', 'pricePrefix'],
    ['saleDetails', 'priceQualifier'],
    ['saleDetails', 'pricing', 'pricePrefix'],
    ['saleDetails', 'pricing', 'priceQualifier'],
    ['saleDetails', 'price', 'pricePrefix'],
    ['saleDetails', 'price', 'priceQualifier'],
    ['saleDetails', 'price', 'qualifier'],
    ['saleFlags', 'pricePrefix'],
    ['saleFlags', 'priceQualifier'],
    ['marketing', 'pricePrefix'],
    ['marketing', 'priceQualifier'],
    ['marketing', 'pricing', 'pricePrefix'],
    ['marketing', 'pricing', 'priceQualifier'],
    ['financials', 'pricePrefix'],
    ['financials', 'priceQualifier'],
    ['financial', 'pricePrefix'],
    ['financial', 'priceQualifier'],
    ['details', 'pricePrefix'],
    ['details', 'priceQualifier'],
    ['salePricePrefix'],
    ['sale_price_prefix'],
    ['salePriceQualifier'],
    ['sale_price_qualifier'],
  ];

  for (const path of candidatePaths) {
    const value = getNestedValue(listing, path);
    const coerced = coercePricePrefixValue(value);
    if (coerced) {
      return coerced;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status !== 429 || attempt === retries) {
        return res;
      }
      const wait = 500 * 2 ** attempt;
      await sleep(wait);
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = 500 * 2 ** attempt;
      await sleep(wait);
    }
  }
}

function resolveTransactionType(listing) {
  if (!listing || typeof listing !== 'object') return null;

  const rentIndicators = new Set([
    'rent',
    'rents',
    'rental',
    'rentals',
    'renting',
    'letting',
    'lettings',
    'let',
    'lease',
    'leasing',
    'tenancy',
    'tenancies',
  ]);
  const saleIndicators = new Set(['sale', 'sales', 'sell', 'selling']);

  const candidates = [
    listing.transactionType,
    listing.transaction_type,
    listing.saleOrRent,
    listing.sale_or_rent,
    listing.saleRent,
    listing.sale_rent,
    listing.marketingType,
    listing.marketing_type,
    listing.transaction,
    listing.transaction_category,
    listing.channel,
    listing.listingType,
    listing.listing_type,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const value = String(raw).toLowerCase();
    const tokens = value.split(/[^a-z]+/).filter(Boolean);
    if (tokens.some((token) => rentIndicators.has(token))) {
      return 'rent';
    }
    if (tokens.some((token) => saleIndicators.has(token))) {
      return 'sale';
    }
  }

  if (
    listing.rentFrequency != null ||
    listing.tenancyType != null ||
    listing.rentalFlags != null
  ) {
    return 'rent';
  }

  if (listing.tenure != null || listing.sale != null || listing.saleFlags != null) {
    return 'sale';
  }

  return null;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
// Lazy-load cached listings only when running in a Node environment to avoid
// referencing browser globals during static builds.
async function getCachedProperties() {
  // `process.versions.node` is only present in Node.js. If it's missing, we are
  // likely running in the browser and should skip reading from the filesystem.
  if (typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }
  try {
    const fs = await import('node:fs/promises');
    const pathMod = await import('path');

    const candidatePaths = [
      pathMod.join(process.cwd(), 'data', 'listings.json'),
      // Fallback for serverless environments where the working directory does
      // not include the data folder but the traced bundle keeps the file
      // alongside this module.
      new URL('../data/listings.json', import.meta.url),
    ];

    for (const candidate of candidatePaths) {
      try {
        const json = await fs.readFile(candidate, 'utf8');
        return JSON.parse(json);
      } catch (error) {
        if (error?.code === 'ENOENT') {
          continue;
        }
        // Bubble up syntax errors so we can surface useful logging further
        // down instead of silently discarding malformed caches.
        if (error instanceof SyntaxError) {
          throw error;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractMedia(listing) {
  const urls = [];
  const gallery = listing?.gallery || [];
  const push = (u) => {
    if (typeof u === 'string') urls.push(u);
  };
  if (Array.isArray(gallery)) {
    gallery.forEach((item) => {
      const url = typeof item === 'string' ? item : item.url || item.href;
      if (!url) return;
      const lower = url.toLowerCase();
      if (
        lower.includes('matterport.com') ||
        lower.includes('youtube.com') ||
        lower.includes('youtu.be') ||
        lower.includes('vimeo.com') ||
        /\.(mp4|webm|ogg)$/.test(lower)
      ) {
        push(url);
      }
    });
  }
  const extraKeys = [
    'videoTour',
    'virtualTour',
    'tour',
    'video',
    'videoUrl',
    'tourUrl',
  ];
  extraKeys.forEach((k) => {
    const val = listing?.[k];
    if (typeof val === 'string') push(val);
  });
  return urls;
}

export function normalizeImageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (img.thumbnailUrl) return img.thumbnailUrl;
  if (img.url) return img.url;
  return null;
}

export function normalizeImages(images = []) {
  return images.map((img) => normalizeImageUrl(img)).filter(Boolean);
}

function resolveAvailabilityValue(property) {
  if (!property || typeof property !== 'object') {
    return null;
  }

  const candidates = [
    property.availableAt,
    property.availableDate,
    property.available_from,
    property.availableFrom,
    property.available,
    property.dateAvailableFrom,
    property.dateAvailable,
    property.date_available_from,
    property.date_available,
    property.dateAvailableOn,
    property.date_available_on,
  ];

  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }

    const date = resolveAvailabilityDate(candidate);
    if (date) {
      return date.toISOString();
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function mapScrayeListingToProperty(item, transactionType) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    id: item.id,
    sourceId: item.sourceId ?? null,
    transactionType,
    price: item.priceValue ?? null,
    priceCurrency: item.priceCurrency ?? 'GBP',
    rentFrequency: item.rentFrequency ?? null,
    pricePrefix: extractPricePrefix(item) ?? null,
    displayAddress: item.title ?? '',
    description: item.description ?? '',
    summary: item.description ?? '',
    bedrooms: item.bedrooms ?? null,
    bathrooms: item.bathrooms ?? null,
    propertyType: item.propertyType ?? null,
    propertyTypeLabel: resolvePropertyTypeLabel(item) ?? null,
    status: item.status ?? null,
    featured: Boolean(item.featured),
    latitude: item.latitude ?? item.lat ?? null,
    longitude: item.longitude ?? item.lng ?? null,
    city: item.city ?? null,
    county: item.county ?? null,
    outcode: item.outcode ?? null,
    matchingSearchRegions: Array.isArray(item.matchingRegions)
      ? item.matchingRegions
      : [],
    images: Array.isArray(item.images) ? item.images : [],
    media: Array.isArray(item.media) ? item.media : [],
    externalUrl: item.externalUrl ?? item.url ?? null,
    source: item.source ?? 'scraye',
    furnishedState: item.furnishedState ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    depositType: item.depositType ?? null,
    size: item.size ?? null,
    _scraye: item._scraye ?? {},
    availableAt: item.availableAt ?? resolveAvailabilityValue(item),
    securityDeposit: normalizeDeposit(
      item.securityDeposit,
      item.priceValue,
      item.rentFrequency,
      item.depositType
    ),
    holdingDeposit: normalizeDeposit(
      item.holdingDeposit,
      item.priceValue,
      item.rentFrequency
    ),
  };
}

export async function fetchProperties(params = {}, options = {}) {
  const cached = await getCachedProperties();
  const { allowNetwork = true } = options;

  if (!canAttemptNetwork(allowNetwork)) {
    if (isRateLimitActive()) {
      logRateLimitNotice(
        'Skipping Apex27 property search because a rate limit is in effect; serving cached listings.'

      );
    }
    return cached ?? [];
  }

  const searchParams = new URLSearchParams({
    includeImages: '1',
    includeGallery: '1',
    ...params,
  });

  if (process.env.APEX27_BRANCH_ID) {
    searchParams.set('branchId', process.env.APEX27_BRANCH_ID);
  }

  try {
    const res = await fetchWithRetry(`${API_URL}?${searchParams.toString()}`, {
      headers: {
        'x-api-key': API_KEY,
        accept: 'application/json',
      },
    });

    if (res.status === 403) {
      console.error('Apex27 API key unauthorized (HTTP 403). Falling back to cached data.');
      return cached ?? [];
    }

    if (res.status === 429) {
      markRateLimited(res);
      logRateLimitNotice(
        'Rate limited when fetching Apex27 properties; serving cached listings instead.'
      );
      return cached ?? [];
    }

    if (!res.ok) {
      console.error('Failed to fetch properties', res.status);
      return cached ?? [];
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;
    return data.data || data.properties || [];
  } catch (err) {
    console.error('Failed to fetch properties', err);
    return cached ?? [];
  }
}

export async function fetchPropertyById(id, options = {}) {
  const cached = await getCachedProperties();
  const idStr = String(id ?? '').trim();
  const { allowNetwork = true } = options;


  if (!idStr) {
    return null;
  }

  if (idStr.toLowerCase().startsWith('scraye-')) {
    try {
      const cache = await loadScrayeCache();
      const rentCache = Array.isArray(cache?.rent) ? cache.rent : [];
      const saleCache = Array.isArray(cache?.sale) ? cache.sale : [];
      const cachedListings = normalizeScrayeListings([
        ...rentCache,
        ...saleCache,
      ]);
      if (cachedListings.length > 0) {
        const cachedScraye = await fetchScrayeListingById(idStr, {
          cachedListings,
          allowRemoteFetch: false,
        });
        if (cachedScraye) {
          return cachedScraye;
        }
      }
    } catch (error) {
      console.warn('Failed to read Scraye cache for lookup', error);
    }

    try {
      const [rentCache, saleCache] = await Promise.all([
        loadScrayeListingsByType('rent'),
        loadScrayeListingsByType('sale'),
      ]);
      const combined = [
        ...(Array.isArray(rentCache) ? rentCache : []),
        ...(Array.isArray(saleCache) ? saleCache : []),
      ];
      const normalizedScraye = normalizeScrayeListings(combined);
      const scrayeProperty = await fetchScrayeListingById(idStr, {
        cachedListings: normalizedScraye,
      });
      if (scrayeProperty) {
        return scrayeProperty;
      }
    } catch (error) {
      console.warn('Failed to resolve Scraye listing by id', error);
    }
  }

  const findMatchingProperty = (collection) => {
    if (!Array.isArray(collection)) return null;
    return (
      collection.find((item) => propertyMatchesIdentifier(item, idStr)) || null
    );
  };

  const candidateParamSets = (() => {
    const sets = [];
    const seen = new Set();
    const push = (params) => {
      const normalizedEntries = Object.entries(params)
        .map(([key, value]) => [key, value != null ? String(value).trim() : ''])
        .filter(([, value]) => value.length > 0);
      if (normalizedEntries.length === 0) return;
      const normalized = Object.fromEntries(normalizedEntries);
      const key = JSON.stringify(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      sets.push(normalized);
    };

    const numericTokens = Array.from(new Set(idStr.match(/\d+/g) ?? []));
    if (/^\d+$/.test(idStr)) {
      numericTokens.unshift(idStr);
    }

    push({ id: idStr });
    push({ listingId: idStr });
    push({ listing_id: idStr });
    push({ propertyId: idStr });
    push({ property_id: idStr });
    push({ externalId: idStr });
    push({ external_id: idStr });
    push({ fullReference: idStr });
    push({ full_reference: idStr });
    push({ slug: idStr });
    push({ slugName: idStr });
    push({ slug_name: idStr });

    numericTokens.forEach((token) => {
      push({ reference: token });
      push({ referenceNumber: token });
      push({ reference_number: token });
      push({ referenceId: token });
      push({ reference_id: token });
    });

    return sets;
  })();

  const cachedMatch = findMatchingProperty(cached);
  if (cachedMatch) {
    return cachedMatch;
  }

  const targetedLookup = async (options = {}) => {
    const { allowNetwork: targetedAllowNetwork = true } = options;

    if (!canAttemptNetwork(targetedAllowNetwork) || candidateParamSets.length === 0) {

      return null;
    }

    for (const params of candidateParamSets) {
      for (const transactionType of ['sale', 'rent']) {
        try {
          const results = await fetchProperties(
            {
              transactionType,
              ...params,
            },
            { allowNetwork: targetedAllowNetwork }
          );
          const match = findMatchingProperty(results);
          if (match) {
            return match;
          }
        } catch (error) {
          console.error(
            'Failed to search properties with params',
            params,
            error
          );
        }
        if (!canAttemptNetwork(targetedAllowNetwork)) {
          return null;
        }
        if (canAttemptNetwork(targetedAllowNetwork)) {
          await sleep(150);
        }
      }
    }

    return null;
  };

  const fallbackLookup = async (options = {}) => {
    const { allowNetwork: fallbackAllowNetwork = true } = options;
    const cachedAgain = findMatchingProperty(cached);
    if (cachedAgain) {
      return cachedAgain;
    }

    if (canAttemptNetwork(fallbackAllowNetwork)) {
      const targeted = await targetedLookup({ allowNetwork: fallbackAllowNetwork });
      if (targeted) {
        return targeted;
      }
    }

    if (!canAttemptNetwork(fallbackAllowNetwork)) {

      return null;
    }

    try {
      const [sale, rent] = await Promise.all([
        fetchProperties({ transactionType: 'sale' }, { allowNetwork: fallbackAllowNetwork }),
        fetchProperties({ transactionType: 'rent' }, { allowNetwork: fallbackAllowNetwork }),
      ]);

      return (
        findMatchingProperty(sale) || findMatchingProperty(rent) || null
      );
    } catch (error) {
      console.error('Failed to resolve property via fallback lookup', error);
      return null;
    }
  };

  const networkPermitted = canAttemptNetwork(allowNetwork);
  if (!networkPermitted) {
    if (allowNetwork && HAS_API_KEY && isRateLimitActive()) {
      logRateLimitNotice(
        'Skipping Apex27 property lookup because a rate limit is active; using cached data when available.'
      );
    }
    return await fallbackLookup({ allowNetwork: false });

  }

  try {
    const url = new URL(`${API_URL}/${encodeURIComponent(idStr)}`);
    url.searchParams.set('includeImages', '1');
    url.searchParams.set('includeGallery', '1');
    if (process.env.APEX27_BRANCH_ID) {
      url.searchParams.set('branchId', process.env.APEX27_BRANCH_ID);
    }

    const res = await fetchWithRetry(url, {
      headers: {
        'x-api-key': API_KEY,
        accept: 'application/json',
      },
    });

    if (res.status === 403) {
      console.error(
        'Apex27 API key unauthorized (HTTP 403) when fetching property by id.'
      );
      return await fallbackLookup({ allowNetwork: false });
    }

    if (res.status === 429) {
      markRateLimited(res);
      logRateLimitNotice(
        'Rate limited when fetching property by id; falling back to cached data only.'
      );
      return await fallbackLookup({ allowNetwork: false });
    }

    if (res.status === 404) {
      return await fallbackLookup({ allowNetwork });
    }

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      const fallback = await fallbackLookup({ allowNetwork });
      return fallback;
    }

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.error('Failed to fetch property', err);
    return await fallbackLookup({ allowNetwork });
  }
}

async function hydrateSalePricePrefixes(properties, options = {}) {
  if (!Array.isArray(properties) || properties.length === 0) {
    return;
  }

  const { allowNetwork = true } = options;

  const targets = properties.filter((property) => {
    if (!property || typeof property !== 'object') {
      return false;
    }

    if (property.pricePrefix) {
      return false;
    }

    if (property.rentFrequency) {
      return false;
    }

    if (typeof property.source === 'string') {
      const normalizedSource = property.source.trim().toLowerCase();
      if (normalizedSource && normalizedSource !== 'apex27') {
        return false;
      }
    }

    const identifier = resolvePropertyIdentifier(property) ?? property.id ?? null;
    if (!identifier) {
      return false;
    }

    if (String(identifier).toLowerCase().startsWith('scraye-')) {
      return false;
    }

    return true;
  });

  if (targets.length === 0) {
    return;
  }

  let cachedListings = null;
  try {
    cachedListings = await getCachedProperties();
  } catch {
    cachedListings = null;
  }

  if (cachedListings && Array.isArray(cachedListings) && cachedListings.length > 0) {
    const prefixById = new Map();
    for (const listing of cachedListings) {
      if (!listing || typeof listing !== 'object') continue;
      const resolvedId = resolvePropertyIdentifier(listing);
      if (!resolvedId) continue;
      const comparableId = normalizePropertyIdentifierForComparison(resolvedId);
      if (!comparableId) continue;
      const prefix = extractPricePrefix(listing);
      if (prefix) {
        prefixById.set(comparableId, prefix);
      }
    }

    for (const property of targets) {
      const comparableId = normalizePropertyIdentifierForComparison(
        resolvePropertyIdentifier(property) ?? property.id ?? null
      );
      if (!comparableId) continue;
      const cachedPrefix = prefixById.get(comparableId);
      if (cachedPrefix) {
        property.pricePrefix = cachedPrefix;
      }
    }
  }

  const remaining = targets.filter((property) => !property.pricePrefix);
  if (remaining.length === 0 || !HAS_API_KEY) {
    return;
  }

  const seen = new Set();
  for (const property of remaining) {
    const identifier = resolvePropertyIdentifier(property) ?? property.id ?? null;
    if (!identifier) {
      continue;
    }

    const normalized = normalizePropertyIdentifierForComparison(identifier);
    if (normalized && seen.has(normalized)) {
      continue;
    }
    if (normalized) {
      seen.add(normalized);
    }

    try {
      const detailed = await fetchPropertyById(identifier, { allowNetwork });
      const prefix = extractPricePrefix(detailed);
      if (prefix) {
        property.pricePrefix = prefix;
      }
    } catch (error) {
      console.warn('Failed to enrich price prefix for property', identifier, error);
    }

    if (canAttemptNetwork(allowNetwork)) {
      await sleep(150);
    }
  }
}

export async function fetchPropertiesByType(type, options = {}) {
  const transactionType = type === 'sale' ? 'sale' : 'rent';
  const {
    statuses,
    minPrice,
    maxPrice,
    bedrooms,
    propertyType,
    limit,
    maxImages,
    useCacheOnly = false,
    allowNetwork = true,
  } = options;

  const baseParams = { transactionType };
  if (propertyType) baseParams.propertyType = propertyType;

  const normalizeStatusValue = (value) =>
    typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '_') : '';

  const requestedStatuses = Array.isArray(statuses)
    ? statuses
        .map((status) => normalizeStatusValue(status))
        .filter(Boolean)
    : null;

  const filterByStatuses = (collection) => {
    if (!requestedStatuses) {
      return collection;
    }
    return collection.filter((item) =>
      requestedStatuses.includes(normalizeStatusValue(item?.status))
    );
  };

  let properties = [];
  if (useCacheOnly) {
    try {
      const cached = await getCachedProperties();
      if (Array.isArray(cached)) {
        properties = filterByStatuses(cached);
      }
    } catch (error) {
      console.warn('Unable to load cached Apex27 listings', error);
      properties = [];
    }
  }

  if (!useCacheOnly) {
    if (requestedStatuses && requestedStatuses.length > 0) {
      const results = [];
      for (const status of requestedStatuses) {
        const props = await fetchProperties(
          { transactionType, status },
          { allowNetwork }
        );
        results.push(Array.isArray(props) ? props : []);
        if (canAttemptNetwork(allowNetwork)) {
          await sleep(200);
        }
      }
      properties = results.flat();
    } else {
      const props = await fetchProperties(baseParams, { allowNetwork });
      properties = Array.isArray(props) ? props : [];
    }
  }

  if (useCacheOnly || !canAttemptNetwork(allowNetwork)) {
    try {
      const cache = await loadScrayeCache();
      const bucket =
        transactionType === 'sale' ? cache?.sale ?? [] : cache?.rent ?? [];
      if (Array.isArray(bucket) && bucket.length > 0) {
        const mapped = normalizeScrayeListings(bucket)
          .map((item) => mapScrayeListingToProperty(item, transactionType))
          .filter(Boolean);
        properties = properties.concat(mapped);
      }
    } catch (error) {
      console.warn('Unable to load cached Scraye listings', error);
    }
  } else {
    try {
      const scrayeCache = await loadScrayeListingsByType(transactionType);
      if (Array.isArray(scrayeCache) && scrayeCache.length > 0) {
        const scrayeListings = normalizeScrayeListings(scrayeCache)
          .map((item) => mapScrayeListingToProperty(item, transactionType))
          .filter(Boolean);
        properties = properties.concat(scrayeListings);
      }
    } catch (error) {
      console.warn('Failed to load Scraye listings from cache', error);
    }
  }

  if (!useCacheOnly && requestedStatuses) {
    properties = filterByStatuses(properties);
  }

  const seenIds = new Set();
  properties = properties.filter((p) => {
    if (!p || typeof p !== 'object') {
      return false;
    }

    const resolvedType = resolveTransactionType(p);
    if (resolvedType !== transactionType) {
      return false;
    }

    const resolvedId = resolvePropertyIdentifier(p);
    const comparableId = normalizePropertyIdentifierForComparison(resolvedId);
    if (comparableId) {
      if (seenIds.has(comparableId)) {
        return false;
      }
      seenIds.add(comparableId);
    }

    return true;
  });

  let list = properties;
  if (transactionType === 'rent') {
    const allowed = ['available', 'under_offer', 'let_agreed', 'let'];
    const normalizeStatus = (s) => s.toLowerCase().replace(/\s+/g, '_');
    list = properties.filter(
      (p) => p.status && allowed.includes(normalizeStatus(p.status))
    );
  }

  if (minPrice != null) {
    list = list.filter((p) => Number(p.price) >= Number(minPrice));
  }
  if (maxPrice != null) {
    list = list.filter((p) => Number(p.price) <= Number(maxPrice));
  }
  if (bedrooms != null) {
    list = list.filter((p) => Number(p.bedrooms) >= Number(bedrooms));
  }
  if (propertyType) {
    const normalizeType = (s) => String(s).toLowerCase().replace(/\s+/g, '_');
    list = list.filter(
      (p) =>
        p.propertyType && normalizeType(p.propertyType) === normalizeType(propertyType)
    );

  }

  const result = list.reduce((acc, p) => {
    const id = resolvePropertyIdentifier(p);
    if (!id) return acc;
    const normalizedImages = normalizeImages(p.images || []);
    const trimmedImages =
      typeof maxImages === 'number' ? normalizedImages.slice(0, maxImages) : normalizedImages;
    const resolvedType = resolveTransactionType(p);
    const isSale = resolvedType === 'sale' || (!resolvedType && !p.rentFrequency);

    const numericPriceValue = (() => {
      if (p.priceValue != null && Number.isFinite(Number(p.priceValue))) {
        return Number(p.priceValue);
      }
      if (p.price != null) {
        const parsed = Number(String(p.price).replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    })();

    const rentFrequency = p.rentFrequency ?? null;
    const depositType = p.depositType ?? null;

    const securityDepositSource = resolveSecurityDepositSource(p);
    const holdingDepositSource = resolveHoldingDepositSource(p);

    const securityDeposit = normalizeDeposit(
      securityDepositSource,
      numericPriceValue,
      rentFrequency,
      depositType
    );
    const holdingDeposit = normalizeDeposit(
      holdingDepositSource,
      numericPriceValue,
      rentFrequency
    );
    const availableAt = resolveAvailabilityValue(p);

    acc.push({
      id: String(id),
      agentId:
        p.user?.id != null
          ? String(p.user.id)
          : p.userId != null
          ? String(p.userId)
          : p.negotiatorId != null
          ? String(p.negotiatorId)
          : null,
      title: p.displayAddress || p.address1 || p.title || '',
      description: p.summary || p.description || '',
      price:
        p.price != null
          ? p.priceCurrency === 'GBP'
            ? formatPriceGBP(p.price, { isSale })
            : p.price
          : null,
      priceValue: numericPriceValue,
      pricePrefix: extractPricePrefix(p),

      bedrooms: p.bedrooms ?? null,
      receptions: p.receptions ?? p.receptionRooms ?? p.reception_rooms ?? null,
      propertyType: p.propertyType ?? null,
      propertyTypeLabel: resolvePropertyTypeLabel(p) ?? null,
      rentFrequency,
      tenure: p.tenure ?? null,
      image: trimmedImages[0] || null,
      images: trimmedImages,
      media: extractMedia(p),
      status: p.status ?? null,
      featured: p.featured ?? false,
      lat: p.latitude ?? p.lat ?? p.location?.latitude ?? p.location?.lat ?? null,
      lng: p.longitude ?? p.lng ?? p.location?.longitude ?? p.location?.lng ?? null,
      city: p.city ?? null,
      county: p.county ?? null,
      matchingRegions: Array.isArray(p.matchingSearchRegions)
        ? p.matchingSearchRegions.filter(Boolean)
        : [],
      source: p.source ?? null,
      externalUrl: p.externalUrl ?? null,
      furnishedState: p.furnishedState ?? null,
      depositType,
      size: p.size ?? null,
      securityDeposit,
      holdingDeposit,
      availableAt,
      createdAt:
        p.dtsCreated ??
        p.createdAt ??
        p.created_at ??
        p.dtsMarketed ??
        p.dtsGoLive ??
        null,
      updatedAt:
        p.dtsUpdated ??
        p.updatedAt ??
        p.updated_at ??
        p.dtsRemarketed ??
        null,
    });
    return acc;
  }, []);

  const limited = typeof limit === 'number' ? result.slice(0, limit) : result;

  if (transactionType === 'sale') {
    await hydrateSalePricePrefixes(limited, { allowNetwork });
  }

  return limited;
}

export async function fetchPropertiesByTypeCachedFirst(type, options = {}) {
  const cachedResults = await fetchPropertiesByType(type, {
    ...options,
    useCacheOnly: true,
  });

  if (Array.isArray(cachedResults) && cachedResults.length > 0) {
    return cachedResults;
  }

  const { useCacheOnly: _ignored, ...rest } = options;
  return fetchPropertiesByType(type, rest);
}

export async function fetchSearchRegions() {
  if (!HAS_API_KEY) {
    return [];
  }

  if (!canAttemptNetwork(true)) {
    if (isRateLimitActive()) {
      logRateLimitNotice(
        'Skipping Apex27 search region lookup because a rate limit is active.'
      );
    }

    return [];
  }

  try {
    const res = await fetchWithRetry(REGIONS_URL, {
      headers: {
        'x-api-key': API_KEY,
        accept: 'application/json',
      },
    });

    if (res.status === 403) {
      console.error('Apex27 API key unauthorized (HTTP 403).');
      return [];
    }

    if (res.status === 429) {
      markRateLimited(res);
      logRateLimitNotice(
        'Rate limited when fetching Apex27 search regions; returning empty list.'
      );
      return [];
    }

    if (!res.ok) {
      console.error('Failed to fetch search regions', res.status);
      return [];
    }

    const data = await res.json();
    const regions = Array.isArray(data) ? data : data.data || data.regions || [];

    if (regions.some((r) => Array.isArray(r.children) && r.children.length)) {
      return regions;
    }

    const map = new Map();
    regions.forEach((r) => {
      map.set(r.id, { ...r, slug: r.slug || slugify(r.name), children: [] });

    });

    const roots = [];
    regions.forEach((r) => {
      const parentId = r.parentId ?? r.parent_id ?? r.parent ?? null;
      const node = map.get(r.id);
      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  } catch (err) {
    console.error('Failed to fetch search regions', err);
    return [];
  }
}
