import {
  propertyMatchesIdentifier,
  resolvePropertyIdentifier,
  normalizePropertyIdentifierForComparison,
} from './property-id.mjs';

const API_URL = 'https://api.apex27.co.uk/listings';
const REGIONS_URL = 'https://api.apex27.co.uk/search-regions';

const API_KEY = process.env.APEX27_API_KEY;
const HAS_API_KEY = Boolean(API_KEY && API_KEY !== 'X-Api-Key');

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
    const fs = await import('fs/promises');
    const pathMod = await import('path');
    const filePath = pathMod.join(process.cwd(), 'data', 'listings.json');
    const json = await fs.readFile(filePath, 'utf8');
    return JSON.parse(json);
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
  if (img.thumbnailUrl) return img.thumbnailUrl;
  if (img.url) return img.url;
  return null;
}

export function normalizeImages(images = []) {
  return images.map((img) => normalizeImageUrl(img)).filter(Boolean);
}

function coerceText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean).join(' ');
  }
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

const BLOCK_TAG_REGEX = /<\/(p|div|li|ul|ol)\s*>/gi;
const LINE_BREAK_REGEX = /<br\s*\/?>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;

export function normalizeListingDescription(listing) {
  if (!listing || typeof listing !== 'object') {
    return '';
  }

  const candidates = [
    listing.normalizedDescription,
    listing.description,
    listing.summary,
    listing.details,
    listing.fullDescription,
    listing.full_description,
    listing.shortDescription,
    listing.short_description,
  ];

  const raw = candidates.find((value) => {
    const text = coerceText(value);
    return text.trim().length > 0;
  });

  const text = coerceText(raw);
  if (!text) {
    return '';
  }

  return text
    .replace(LINE_BREAK_REGEX, '\n')
    .replace(BLOCK_TAG_REGEX, '\n')
    .replace(HTML_TAG_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchProperties(params = {}) {
  const cached = await getCachedProperties();

  if (!HAS_API_KEY) {
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

export async function fetchPropertyById(id) {
  const cached = await getCachedProperties();
  const idStr = String(id ?? '').trim();

  if (!idStr) {
    return null;
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

  const targetedLookup = async () => {
    if (!HAS_API_KEY || candidateParamSets.length === 0) {
      return null;
    }

    for (const params of candidateParamSets) {
      for (const transactionType of ['sale', 'rent']) {
        try {
          const results = await fetchProperties({
            transactionType,
            ...params,
          });
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
        await sleep(150);
      }
    }

    return null;
  };

  const fallbackLookup = async () => {
    const cachedAgain = findMatchingProperty(cached);
    if (cachedAgain) {
      return cachedAgain;
    }

    const targeted = await targetedLookup();
    if (targeted) {
      return targeted;

    }

    if (!HAS_API_KEY) {
      return null;
    }

    try {
      const [sale, rent] = await Promise.all([
        fetchProperties({ transactionType: 'sale' }),
        fetchProperties({ transactionType: 'rent' }),
      ]);

      return (
        findMatchingProperty(sale) || findMatchingProperty(rent) || null
      );
    } catch (error) {
      console.error('Failed to resolve property via fallback lookup', error);
      return null;
    }
  };

  if (!HAS_API_KEY) {
    return await fallbackLookup();
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
      return await fallbackLookup();
    }

    if (res.status === 404) {
      return await fallbackLookup();
    }

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      const fallback = await fallbackLookup();
      return fallback;
    }

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.error('Failed to fetch property', err);
    return await fallbackLookup();
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
  } = options;

  const baseParams = { transactionType };
  if (propertyType) baseParams.propertyType = propertyType;

  let properties;
  if (Array.isArray(statuses) && statuses.length > 0) {

    const results = [];
    for (const status of statuses) {
      const props = await fetchProperties({ transactionType, status });
      results.push(Array.isArray(props) ? props : []);
      await sleep(200);
    }

    properties = results.flat();
  } else {
    const props = await fetchProperties(baseParams);
    properties = Array.isArray(props) ? props : [];
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
    const description = normalizeListingDescription(p);

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
      description,
      price:
        p.price != null
          ? p.priceCurrency === 'GBP'
            ? `£${p.price}`
            : p.price
          : null,
      priceValue: p.price != null ? Number(p.price) : null,
      bedrooms: p.bedrooms ?? null,
      propertyType: p.propertyType ?? null,
      rentFrequency: p.rentFrequency ?? null,
      tenure: p.tenure ?? null,
      image: trimmedImages[0] || null,
      images: trimmedImages,
      media: extractMedia(p),
      status: p.status ?? null,
      featured: p.featured ?? false,
      lat: p.latitude ?? p.lat ?? p.location?.latitude ?? p.location?.lat ?? null,
      lng: p.longitude ?? p.lng ?? p.location?.longitude ?? p.location?.lng ?? null,
    });
    return acc;
  }, []);

  return typeof limit === 'number' ? result.slice(0, limit) : result;
}

export async function fetchSearchRegions() {
  if (!HAS_API_KEY) {
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
