import { formatPriceGBP } from './format.mjs';
import { normalizeDeposit } from './deposits.mjs';
import { ProxyAgent } from 'undici';

const SCRAYE_API_URL = 'https://api.scraye.com/api';
const SCRAYE_SITEMAP_URL = 'https://assets.scraye.com/sitemap-listings.txt';
const SCRAYE_LISTING_URL = 'https://www.scraye.com/listings';

let cachedProxyAgent = null;
function getProxyAgent() {
  if (cachedProxyAgent !== null) {
    return cachedProxyAgent;
  }
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    null;
  cachedProxyAgent = proxy ? new ProxyAgent(proxy) : undefined;
  return cachedProxyAgent;
}

let cachedScrayeCache = null;
let cachedScrayeCachePromise = null;
const scrayeListingCacheMap = new Map();
const scrayeListingPromiseCacheMap = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SCRAYE_REQUEST_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.SCRAYE_FETCH_TIMEOUT_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();

const scrayeListingsCache = new Map();
const scrayeListingsPromiseCache = new Map();
const scrayeListingDetailCache = new Map();
const scrayeListingDetailPromiseCache = new Map();

function parseEnvBoolean(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function shouldFetchLiveScraye() {
  const explicit = parseEnvBoolean(process.env.SCRAYE_LIVE_FETCH);
  if (explicit !== null) {
    return explicit;
  }

  const disable = parseEnvBoolean(process.env.SCRAYE_DISABLE_LIVE_FETCH);
  if (disable !== null) {
    return !disable;
  }

  const ciFlag = parseEnvBoolean(process.env.CI);
  if (ciFlag === true) {
    return false;
  }

  const vercelFlag = parseEnvBoolean(process.env.VERCEL);
  if (vercelFlag === true) {
    return false;
  }

  return true;
}

function toTitleCase(value) {
  if (!value) return null;
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toIsoDate(value) {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  try {
    return new Date(numeric).toISOString();
  } catch {
    return null;
  }
}

function mapRentFrequency(value) {
  switch (value) {
    case 'PER_WEEK':
      return 'W';
    case 'PER_MONTH':
      return 'M';
    case 'PER_QUARTER':
      return 'Q';
    case 'PER_YEAR':
      return 'Y';
    default:
      return null;
  }
}

function formatFeature(value) {
  if (!value) return null;
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeScrayeImageEntry(entry) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed
      ? {
          id: null,
          url: trimmed,
          altText: null,
        }
      : null;
  }

  if (typeof entry === 'object') {
    const potentialUrlFields = [
      entry.url,
      entry.imageUrl,
      entry.mediaUrl,
      entry.filename,
    ];

    let url = null;
    for (const value of potentialUrlFields) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
          url = trimmed;
          break;
        }
      }
    }

    if (!url) {
      return null;
    }

    const altCandidates = [entry.altText, entry.caption, entry.tag];
    let altText = null;
    for (const candidate of altCandidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          altText = trimmed;
          break;
        }
      }
    }

    const id =
      entry.id ??
      (typeof entry.publicId === 'string' ? entry.publicId : null) ??
      null;

    return {
      id,
      url,
      altText,
    };
  }

  return null;
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed);
}


function mergeScrayeImages(...groups) {
  const seen = new Set();
  const images = [];

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const entry of group) {
      const normalized = normalizeScrayeImageEntry(entry);
      if (!normalized || !normalized.url) continue;
      if (seen.has(normalized.url)) continue;
      seen.add(normalized.url);
      images.push(normalized);
    }
  }

  return images;
}

function extractScrayeImagesFromNode(node) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const fileImages = Array.isArray(node.files)
    ? node.files.filter((file) => {
        if (!file) return false;
        if (typeof file.filename !== 'string') return false;

        const filename = file.filename.toLowerCase();
        const tag = typeof file.tag === 'string' ? file.tag.toLowerCase() : '';

        const isNonImageTag =
          tag.includes('floorplan') ||
          tag.includes('epc') ||
          tag.includes('brochure') ||
          tag.includes('virtual') ||
          tag.includes('tour');
        if (isNonImageTag) return false;

        const isNonImageFilename =
          filename.includes('floorplan') ||
          filename.includes('epc') ||
          filename.includes('brochure');
        if (isNonImageFilename) return false;

        if (!tag) return true;

        return (
          tag.includes('image') ||
          tag.includes('photo') ||
          tag.includes('picture')
        );
      })
    : [];

  return mergeScrayeImages(node.images, node.illustrativeImages, fileImages);
}

function countScrayeImageUrls(listing) {
  if (!listing) return 0;
  const images = Array.isArray(listing.images) ? listing.images : [];
  let count = 0;
  for (const entry of images) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      if (isValidHttpUrl(entry)) count += 1;
      continue;
    }
    if (typeof entry === 'object' && isValidHttpUrl(entry.url)) {
      count += 1;
    }
  }
  return count;
}

function hasDetailedScrayeDescription(listing) {
  if (!listing) return false;
  const description = typeof listing.description === 'string'
    ? listing.description.trim()
    : '';
  if (!description) {
    return false;
  }
  return !/^key features:/i.test(description);
}

function needsScrayeDetailEnrichment(listing) {
  if (!listing) return true;
  if (!hasDetailedScrayeDescription(listing)) {
    return true;
  }
  if (countScrayeImageUrls(listing) < 3) {
    return true;
  }
  return false;
}


async function scrayeFetch(operations, { pathname, searchTerm } = {}) {
  const maxAttempts = 4;
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    referer: 'https://www.scraye.com/',
    'apollo-require-preflight': 'true',
  };
  if (pathname) {
    headers['x-pathname'] = pathname;
  }
  if (typeof searchTerm === 'string') {
    headers['x-search'] = searchTerm;
  }

  const retriableStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);
  const payload = JSON.stringify(operations);
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response;
    try {
      const controller = new AbortController();
      const timeoutId =
        SCRAYE_REQUEST_TIMEOUT_MS > 0
          ? setTimeout(() => {
              controller.abort(
                new Error(
                  `Scraye API request timed out after ${SCRAYE_REQUEST_TIMEOUT_MS}ms`
                )
              );
            }, SCRAYE_REQUEST_TIMEOUT_MS)
          : null;

      try {
        response = await fetch(SCRAYE_API_URL, {
          method: 'POST',
          headers,
          body: payload,
          dispatcher: getProxyAgent(),
          signal: controller.signal,
        });
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        lastError = new Error(
          `Scraye API request timed out after ${SCRAYE_REQUEST_TIMEOUT_MS}ms`
        );
      } else {
        lastError = error;
      }
    }

    if (response?.ok) {
      return response.json();
    }

    if (response) {
      const text = await response.text().catch(() => '');
      const error = new Error(
        `Scraye API request failed with status ${response.status}: ${text.slice(0, 200)}`
      );
      lastError = error;
      if (!retriableStatusCodes.has(response.status) || attempt === maxAttempts - 1) {
        throw error;
      }
    } else if (attempt === maxAttempts - 1) {
      throw lastError ?? new Error('Scraye API request failed');
    }

    const backoff = 500 * 2 ** attempt;
    await sleep(backoff);
  }

  throw lastError ?? new Error('Scraye API request failed');
}

function buildFilter(type) {
  if (type === 'rent') {
    return {
      type: 'RENTAL',
      features: null,
      furnishedStates: null,
      allowedApplicantTypes: null,
      address: null,
      statuses: ['AVAILABLE'],
      instantViewingsEnabled: null,
      targetMoveInDate: null,
      depositTypes: null,
      agencyId: null,
      verified: null,
      studentOnly: null,
    };
  }

  return {
    type: 'SALE',
    features: null,
    address: null,
    statuses: ['AVAILABLE'],
    instantViewingsEnabled: null,
    agencyId: null,
  };
}

async function enrichScrayeListingsWithDetails(
  listings,
  { force = false, concurrency = 6 } = {}
) {

  if (!Array.isArray(listings) || listings.length === 0) {
    return Array.isArray(listings) ? listings : [];
  }

  if (!shouldFetchLiveScraye()) {
    return listings;
  }

  const total = listings.length;
  const requestedConcurrency = Math.floor(Number(concurrency) || 1);
  const normalizedConcurrency = Math.max(
    1,
    Math.min(requestedConcurrency, total)
  );
  const enriched = new Array(total);
  let cursor = 0;

  async function processListing(index) {
    const listing = listings[index];
    if (!listing?.id) {
      enriched[index] = listing;
      return;
    }

    if (!force && !needsScrayeDetailEnrichment(listing)) {
      enriched[index] = listing;
      return;
    }



    try {
      const detailed = await fetchScrayeListingById(listing.id, {
        cachedListings: listings,
      });
      enriched[index] = detailed ?? listing;
    } catch (error) {
      console.warn(`Failed to load Scraye listing ${listing.id}`, error);
      enriched[index] = listing;
    }
  }

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= total) {
        break;
      }
      await processListing(index);
    }
  }

  const workers = Array.from({ length: normalizedConcurrency }, () => worker());
  await Promise.all(workers);


  return enriched;
}

const RESULTS_QUERY = `
  query ResultsContainer(
    $placeId: ID!
    $radius: Float
    $filterBy: ListingFilter
    $orderBy: ListingOrder
    $pagination: Page
  ) {
    place(id: $placeId) {
      id
      displayName
      slug
      listings(
        filterBy: $filterBy
        orderBy: $orderBy
        radius: $radius
        pagination: $pagination
      ) {
        pageInfo {
          startCursor
          endCursor
          hasNextPage
          hasPreviousPage
          __typename
        }
        totalCount
        edges {
          cursor
          node {
            id
            type
            status
            displayAddress
            pricing {
              price
              currency
              rentFrequency
              priceQualifier
              __typename
            }
            depositType
            priceReducedAt
            available
            allowedTenancyDurations {
              min
              max
              __typename
            }
            bedrooms
            bathrooms
            size
            features
            furnishedState
            floor
            tenure
            createdAt
            timeZone
            addressComponents {
              outcode
              __typename
            }
            hideImages
            images {
              id
              url(size: CARD)
              altText
              metadata {
                tags
                priority
                __typename
              }
              __typename
            }
            instantViewingsEnabled
            verified
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

const LISTING_QUERY = `
  query Listing($listingId: ObjectID!) {
    listing(id: $listingId) {
      id
      type
      reference
      propertyType
      verified
      depositType
      addressComponents {
        outcode
        __typename
      }
      agency {
        id
        name
        address
        logo
        __typename
      }
      bathrooms
      bedrooms
      description
      displayAddress
      timeZone
      features
      furnishedState
      files {
        id
        filename
        tag
        __typename
      }
      floor
      locality {
        id
        slug
        name
        __typename
      }
      borough {
        id
        slug
        name
        __typename
      }
      macrohood {
        id
        slug
        name
        __typename
      }
      neighbourhood {
        id
        slug
        name
        __typename
      }
      hideImages
      illustrativeImages
      images {
        id
        url(size: MEDIUM)
        altText
        metadata {
          tags
          priority
          __typename
        }
        __typename
      }
      pricing {
        price
        currency
        rentFrequency
        priceQualifier
        __typename
      }
      size
      status
      viewingsDisabled
      virtualTourUrl
      videoTourUrl
      videoTourUrlSecondary
      available
      securityDeposit {
        fixed
        weeks
        months
        __typename
      }
      holdingDeposit {
        fixed
        weeks
        months
        __typename
      }
      commission
      agencyFees
      tenure
      leaseholdExpiry
      serviceCharge
      groundRentYearly
      rentalYield
      instantViewingsEnabled
      noDepositMonthlyFeeRate
      scrayeGuarantor
      __typename
    }
  }
`;

function normalizeListingNode(node, context) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const coordinates = Array.isArray(node.location?.coordinates)
    ? node.location.coordinates
    : null;
  const longitude = coordinates?.[0] ?? null;
  const latitude = coordinates?.[1] ?? null;

  const rentFrequency = mapRentFrequency(node.pricing?.rentFrequency);
  const rawPrice = node.pricing?.price;
  const priceValue =
    rawPrice != null && Number.isFinite(Number(rawPrice))
      ? Number(rawPrice) / 100
      : null;
  const isSale = context.transactionType === 'sale';
  const priceFormatted =
    priceValue != null
      ? formatPriceGBP(priceValue, { isSale })
      : null;

  const images = extractScrayeImagesFromNode(node);

  const features = Array.isArray(node.features)
    ? node.features.map((feature) => formatFeature(feature)).filter(Boolean)
    : [];

  const placeName = context.placeName || toTitleCase(context.slug) || null;
  const matchingRegions = [placeName, node.addressComponents?.outcode]
    .map((value) => (value ? String(value).trim() : ''))
    .filter(Boolean);

  const title = node.displayAddress || placeName || 'Scraye Property';
  const description = features.length
    ? `Key features: ${features.join(', ')}`
    : '';

  const securityDeposit = normalizeDeposit(
    node.securityDeposit,
    priceValue,
    rentFrequency,
    node.depositType
  );

  const holdingDeposit = normalizeDeposit(
    node.holdingDeposit,
    priceValue,
    rentFrequency
  );

  return {
    id: `scraye-${node.id}`,
    sourceId: node.id,
    source: 'scraye',
    transactionType: context.transactionType,
    title,
    description,
    price: priceFormatted,
    priceValue,
    priceCurrency: node.pricing?.currency || 'GBP',
    priceQualifier: node.pricing?.priceQualifier ?? null,
    rentFrequency,
    bedrooms: node.bedrooms ?? null,
    bathrooms: node.bathrooms ?? null,
    receptions: null,
    propertyType: node.propertyType ?? null,
    status: node.status ?? null,
    features,
    furnishedState: node.furnishedState ?? null,
    image: images[0]?.url ?? null,
    images,
    media: [],
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    city: placeName,
    county: null,
    matchingRegions,
    createdAt: toIsoDate(node.createdAt),
    updatedAt: toIsoDate(node.priceReducedAt) || toIsoDate(node.createdAt),
    availableAt: toIsoDate(node.available),
    depositType: node.depositType ?? null,
    size: node.size ?? null,
    securityDeposit,
    holdingDeposit,
    allowedTenancyDurations: Array.isArray(node.allowedTenancyDurations)
      ? node.allowedTenancyDurations.map((entry) => ({
          min: entry?.min ?? null,
          max: entry?.max ?? null,
        }))
      : [],
    instantViewingsEnabled: Boolean(node.instantViewingsEnabled),
    verified: Boolean(node.verified),
    outcode: node.addressComponents?.outcode ?? null,
    url: `${SCRAYE_LISTING_URL}/${node.id}`,
    externalUrl: `${SCRAYE_LISTING_URL}/${node.id}`,
    provider: 'Scraye',
    _scraye: {
      placeId: context.placeId,
      placeName,
      slug: context.slug,
      longitude,
      latitude,
      listTimestamp: toIsoDate(node.createdAt),
    },
  };
}

async function fetchPlaceConfigs() {
  try {
    const res = await fetch(SCRAYE_SITEMAP_URL, {
      dispatcher: getProxyAgent(),
    });
    if (!res.ok) {
      throw new Error(`Failed to download Scraye sitemap (${res.status})`);
    }
    const text = await res.text();
    const configs = new Map();
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const url = new URL(trimmed);
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length < 3) continue;
        const typeSegment = segments[0];
        const placeId = segments[1];
        const slug = segments[2];
        const key = `${typeSegment}:${placeId}`;
        if (!configs.has(key)) {
          configs.set(key, {
            typeSegment,
            transactionType: typeSegment === 'rent' ? 'rent' : 'sale',
            placeId,
            slug,
            pathname: `/${typeSegment}/${placeId}/${slug}`,
          });
        }
      } catch {
        // ignore malformed lines
      }
    }
    if (configs.size > 0) {
      return Array.from(configs.values());
    }
  } catch (error) {
    console.warn('Unable to load Scraye sitemap entries', error);
  }

  // Fallback to London listings if sitemap fails
  return [
    { typeSegment: 'rent', transactionType: 'rent', placeId: 'MA', slug: 'london', pathname: '/rent/MA/london' },
    { typeSegment: 'buy', transactionType: 'sale', placeId: 'MA', slug: 'london', pathname: '/buy/MA/london' },
  ];
}

export async function fetchScrayeListings({
  transactionType = 'rent',
  placeIds,
  pageSize = 48,
  maxPages,
  maxListings,
} = {}) {
  if (!shouldFetchLiveScraye()) {
    return [];
  }

  const configs = await fetchPlaceConfigs();
  const desiredType = transactionType === 'sale' ? 'sale' : 'rent';
  const filtered = configs.filter((config) => config.transactionType === desiredType);

  let selected;
  if (Array.isArray(placeIds) && placeIds.length > 0) {
    const normalizedTargets = placeIds
      .map((id) => (id != null ? String(id).trim() : ''))
      .filter(Boolean);
    const seen = new Set();
    const prioritized = [];
    for (const target of normalizedTargets) {
      for (const config of filtered) {
        if (config.placeId !== target) continue;
        const key = `${config.placeId}:${config.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        prioritized.push(config);
      }
    }
    selected = prioritized.length > 0 ? prioritized : filtered;
  } else {
    selected = filtered;
  }

  const results = new Map();
  const limit =
    typeof maxListings === 'number' && Number.isFinite(maxListings) && maxListings > 0
      ? maxListings
      : Infinity;

  for (const config of selected) {
    let after = null;
    let page = 0;
    const filter = buildFilter(config.transactionType);
    const placeContext = {
      transactionType: config.transactionType,
      placeId: config.placeId,
      slug: config.slug,
    };

    do {
      const operations = [
        {
          operationName: 'ResultsContainer',
          variables: {
            placeId: config.placeId,
            filterBy: filter,
            orderBy: { field: 'UPDATED_AT', direction: 'DESCENDING' },
            pagination: {
              first: pageSize,
              ...(after ? { after } : {}),
            },
          },
          query: RESULTS_QUERY,
        },
      ];

      let json;
      try {
        json = await scrayeFetch(operations, {
          pathname: config.pathname,
          searchTerm: '',
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Scraye listings for place ${config.placeId} (${config.slug})`,
          error
        );
        break;
      }

      const payload = json.find((item) => item?.data?.place?.id === config.placeId);
      if (!payload) break;
      const listings = payload.data.place.listings;
      const edges = Array.isArray(listings?.edges) ? listings.edges : [];
      const displayName = payload.data.place.displayName;

      const context = {
        ...placeContext,
        placeName: displayName || toTitleCase(config.slug),
      };

      for (const edge of edges) {
        if (!edge?.node?.id) continue;
        const normalized = normalizeListingNode(edge.node, context);
        if (!normalized) continue;
        results.set(edge.node.id, normalized);
        if (results.size >= limit) {
          break;
        }
      }

      after = listings?.pageInfo?.hasNextPage ? listings.pageInfo.endCursor : null;
      page += 1;
    } while (
      results.size < limit &&
      after &&
      (typeof maxPages !== 'number' || page < maxPages)
    );

    if (results.size >= limit) {
      break;
    }

    await sleep(250);
  }

  const baseListings = Array.from(results.values());
  if (baseListings.length === 0) {
    return [];
  }

  const concurrency = Math.min(
    baseListings.length,
    Math.min(3, Math.max(1, Math.floor(baseListings.length / 20) || 2))
  );

  return enrichScrayeListingsWithDetails(baseListings, {
    force: false,
    concurrency,
  });

}

export async function fetchScrayeListingById(
  id,
  { cachedListings = [], allowRemoteFetch = true } = {}
) {
  if (!id) return null;
  const cacheKey = String(id).trim().toLowerCase();
  if (scrayeListingDetailCache.has(cacheKey)) {
    return scrayeListingDetailCache.get(cacheKey);
  }

  const cleanId = String(id).replace(/^scraye-/i, '');
  const baseEntry = cachedListings.find(
    (item) => item?.sourceId === cleanId || item?.id === `scraye-${cleanId}`
  );

  if (baseEntry) {
    if (!allowRemoteFetch || !needsScrayeDetailEnrichment(baseEntry)) {
      return baseEntry;
    }
  } else if (!allowRemoteFetch) {
    return null;
  }

  if (!allowRemoteFetch) {
    return baseEntry ?? null;
  }

  const operations = [
    {
      operationName: 'Listing',
      variables: { listingId: cleanId },
      query: LISTING_QUERY,
    },
  ];

  let json;
  try {
    json = await scrayeFetch(operations, {
      pathname: `/listings/${cleanId}`,
    });
  } catch (error) {
    if (baseEntry) {
      console.warn(
        `Falling back to cached Scraye listing ${cleanId} after fetch failure`,
        error
      );
      return baseEntry;
    }
    throw error;
  }

  const payload = json.find((item) => item?.data?.listing?.id === cleanId);
  if (!payload) {

    return baseEntry ?? null;
  }

  if (scrayeListingDetailPromiseCache.has(cacheKey)) {
    return scrayeListingDetailPromiseCache.get(cacheKey);
  }

  const loaderPromise = (async () => {
    const operations = [
      {
        operationName: 'Listing',
        variables: { listingId: cleanId },
        query: LISTING_QUERY,
      },
    ];

    try {
      const json = await scrayeFetch(operations, {
        pathname: `/listings/${cleanId}`,
      });

      const payload = json.find((item) => item?.data?.listing?.id === cleanId);
      if (!payload) {
        return baseEntry ?? null;
      }

      const listing = payload.data.listing;
      const baseContext = baseEntry?._scraye || {
        transactionType: listing.type === 'SALE' ? 'sale' : 'rent',
        placeId: null,
        slug: listing.locality?.slug || listing.neighbourhood?.slug || null,
        placeName:
          listing.locality?.name ||
          listing.neighbourhood?.name ||
          toTitleCase(listing.locality?.slug) ||
          null,
      };

      const normalized = normalizeListingNode(
        {
          ...listing,
          images: listing.images,
          location: baseEntry?.latitude
            ? { type: 'Point', coordinates: [baseEntry.longitude, baseEntry.latitude] }
            : undefined,
        },
        baseContext
      );

      if (!normalized) {
        return baseEntry ?? null;
      }

      normalized.description = listing.description || normalized.description || '';
      normalized.features = Array.isArray(listing.features)
        ? listing.features.map((feature) => formatFeature(feature)).filter(Boolean)
        : normalized.features;
      const detailRawPrice = listing.pricing?.price;
      const detailPriceValue =
        detailRawPrice != null && Number.isFinite(Number(detailRawPrice))
          ? Number(detailRawPrice) / 100
          : null;
      normalized.price =
        detailPriceValue != null
          ? formatPriceGBP(detailPriceValue, {
              isSale: normalized.transactionType === 'sale',
            })
          : normalized.price;
      if (detailPriceValue != null) {
        normalized.priceValue = detailPriceValue;
      }
      normalized.priceCurrency = listing.pricing?.currency || normalized.priceCurrency;
      normalized.priceQualifier = listing.pricing?.priceQualifier ?? normalized.priceQualifier;
      normalized.rentFrequency = mapRentFrequency(listing.pricing?.rentFrequency);
      normalized.depositType = listing.depositType ?? normalized.depositType;
      normalized.availableAt = toIsoDate(listing.available) ?? normalized.availableAt;
      normalized.size = listing.size ?? normalized.size;
      normalized.instantViewingsEnabled =
        listing.instantViewingsEnabled ?? normalized.instantViewingsEnabled;
      normalized.verified = listing.verified ?? normalized.verified;
      normalized.agency = listing.agency ?? null;
      normalized.securityDeposit =
        normalizeDeposit(
          listing.securityDeposit,
          normalized.priceValue,
          normalized.rentFrequency,
          listing.depositType ?? normalized.depositType
        ) ?? normalized.securityDeposit;
      normalized.holdingDeposit =
        normalizeDeposit(
          listing.holdingDeposit,
          normalized.priceValue,
          normalized.rentFrequency
        ) ?? normalized.holdingDeposit;
      normalized.virtualTourUrl = listing.virtualTourUrl ?? null;
      normalized.videoTourUrl = listing.videoTourUrl ?? null;
      normalized.videoTourUrlSecondary = listing.videoTourUrlSecondary ?? null;

      if (!normalized.latitude && baseEntry?.latitude) {
        normalized.latitude = baseEntry.latitude;
        normalized.longitude = baseEntry.longitude;
        normalized.lat = baseEntry.lat ?? baseEntry.latitude;
        normalized.lng = baseEntry.lng ?? baseEntry.longitude;
      }

      return normalized;
    } catch (error) {
      console.warn(`Failed to load Scraye listing ${cleanId}`, error);
      return baseEntry ?? null;
    }
  })();

  scrayeListingDetailPromiseCache.set(cacheKey, loaderPromise);

  try {
    const result = await loaderPromise;
    if (!scrayeListingDetailCache.has(cacheKey)) {
      scrayeListingDetailCache.set(cacheKey, result ?? null);
    }
    return result ?? null;
  } finally {
    scrayeListingDetailPromiseCache.delete(cacheKey);
  }
}

export async function loadScrayeCache() {
  if (cachedScrayeCache && typeof cachedScrayeCache === 'object') {
    return cachedScrayeCache;
  }

  if (cachedScrayeCachePromise) {
    return cachedScrayeCachePromise;
  }

  const loadPromise = (async () => {
    try {
      const fs = await import('node:fs/promises');
      const path = await import('path');

      const candidatePaths = [
        path.join(process.cwd(), 'data', 'scraye.json'),
        new URL('../data/scraye.json', import.meta.url),
      ];

      for (const candidate of candidatePaths) {
        try {
          const text = await fs.readFile(candidate, 'utf8');
          return JSON.parse(text);
        } catch (error) {
          if (error?.code === 'ENOENT') {
            continue;
          }
          if (error instanceof SyntaxError) {
            console.warn(
              'Scraye cache contains invalid JSON; falling back to live fetch'
            );
            return null;
          }
          throw error;
        }
      }

      console.warn(
        'Scraye cache not found in expected locations; falling back to live fetch'
      );
      return null;
    } catch (error) {
      console.warn('Unable to load Scraye cache', error);
      return null;
    }
  })();

  cachedScrayeCachePromise = loadPromise;

  try {
    const result = await loadPromise;
    if (result && typeof result === 'object') {
      cachedScrayeCache = result;
    }
    return result;
  } finally {
    cachedScrayeCachePromise = null;
  }
}

function derivePreferredScrayePlaceIds(listings, { limit = 6 } = {}) {
  if (!Array.isArray(listings) || listings.length === 0) {
    return [];
  }

  const counts = new Map();
  for (const listing of listings) {
    const placeId =
      (listing?._scraye && listing._scraye.placeId) ||
      listing?.placeId ||
      listing?.placeID ||
      null;
    if (!placeId) continue;
    const normalized = String(placeId).trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  if (counts.size === 0) {
    return [];
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([placeId]) => placeId);
}

export async function loadScrayeListingsByType(type) {
  const transactionType = type === 'sale' ? 'sale' : 'rent';
  const cacheKey = transactionType;

  if (scrayeListingCacheMap.has(cacheKey)) {
    return scrayeListingCacheMap.get(cacheKey);
  }

  if (scrayeListingPromiseCacheMap.has(cacheKey)) {
    return scrayeListingPromiseCacheMap.get(cacheKey);
  }

  const loadPromise = (async () => {
    const cache = await loadScrayeCache();


    let cachedListings = [];
    if (cache && typeof cache === 'object') {
      const bucket = transactionType === 'sale' ? cache.sale : cache.rent;
      if (Array.isArray(bucket) && bucket.length > 0) {
        cachedListings = bucket;
      }
    }

    let liveListings = [];
    try {
      const envPlaceIds = (process.env.SCRAYE_PLACE_IDS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const derivedPlaceIds = derivePreferredScrayePlaceIds(cachedListings, {
        limit: transactionType === 'sale' ? 6 : 8,
      });
      let placeIdTargets = envPlaceIds.length > 0 ? envPlaceIds : derivedPlaceIds;
      if (placeIdTargets.length === 0) {
        placeIdTargets = ['MA'];
      }

      const liveResults = await fetchScrayeListings({
        transactionType,
        placeIds: placeIdTargets,
        pageSize: transactionType === 'sale' ? 32 : 48,
        maxPages: transactionType === 'sale' ? 2 : 3,
        maxListings: transactionType === 'sale' ? 120 : 180,
      });
      if (Array.isArray(liveResults) && liveResults.length > 0) {
        liveListings = liveResults;
      }
    } catch (error) {
      console.warn('Failed to fetch live Scraye listings', error);

    }

    const combined = [];
    if (Array.isArray(liveListings) && liveListings.length > 0) {
      combined.push(...liveListings);
    }
    if (Array.isArray(cachedListings) && cachedListings.length > 0) {
      combined.push(...cachedListings);
    }

    if (combined.length === 0) {
      return [];
    }

    const unique = normalizeScrayeListings(combined);

    try {
      const enriched = await enrichScrayeListingsWithDetails(unique, {
        force: false,
        concurrency: 4,
      });
      return Array.isArray(enriched) ? enriched : [];

    } catch (error) {
      console.warn('Failed to enrich Scraye listings with details', error);
      return unique;
    }
  })();

  scrayeListingPromiseCacheMap.set(cacheKey, loadPromise);

  try {
    const result = await loadPromise;
    const normalizedResult = Array.isArray(result) ? result : [];
    scrayeListingCacheMap.set(cacheKey, normalizedResult);
    return normalizedResult;
  } finally {
    scrayeListingPromiseCacheMap.delete(cacheKey);

  }
}

export function normalizeScrayeListings(listings) {
  if (!Array.isArray(listings)) return [];
  const seen = new Set();
  return listings.filter((listing) => {
    if (!listing?.sourceId) return true;
    if (seen.has(listing.sourceId)) return false;
    seen.add(listing.sourceId);
    return true;
  });
}

function compareScrayeIds(a, b) {
  const normalizeId = (value) => {
    if (!value) return { str: '', num: NaN };
    const raw = String(value).trim();
    if (!raw) return { str: '', num: NaN };
    const digits = raw.replace(/[^0-9]/g, '');
    const num = digits ? Number(digits) : NaN;
    return { str: raw, num };
  };

  const left = normalizeId(a);
  const right = normalizeId(b);

  if (Number.isFinite(left.num) && Number.isFinite(right.num)) {
    return left.num - right.num;
  }

  return left.str.localeCompare(right.str);
}

export function sortScrayeListings(listings) {
  if (!Array.isArray(listings)) return [];
  const entries = listings.slice();
  entries.sort((entryA, entryB) =>
    compareScrayeIds(entryA?.sourceId ?? entryA?.id, entryB?.sourceId ?? entryB?.id)
  );
  return entries;
}
