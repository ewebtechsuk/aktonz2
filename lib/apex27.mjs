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

function enforceAspect(url, width = 640, height = 480) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      if (!u.pathname.includes(`_${width}x${height}`)) {
        u.pathname = `${parts.join('.')}_${width}x${height}.${ext}`;
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function normalizeImageUrl(img) {
  if (!img) return null;
  if (img.thumbnailUrl) return enforceAspect(img.thumbnailUrl);
  if (img.url) return enforceAspect(img.url);
  return null;
}

export function normalizeImages(images = []) {
  return images.map((img) => normalizeImageUrl(img)).filter(Boolean);
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
  const idStr = String(id);

  if (!HAS_API_KEY) {
    return cached
      ?
          cached.find(
            (p) =>
              String(p.id) === idStr ||
              String(p.listingId) === idStr ||
              String(p.listing_id) === idStr
          ) || null
      : null;
  }

  try {
    const url = new URL(`${API_URL}/${idStr}`);
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
      return cached
        ?
            cached.find(
              (p) =>
                String(p.id) === idStr ||
                String(p.listingId) === idStr ||
                String(p.listing_id) === idStr
            ) || null
        : null;
    }

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      return null;
    }

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.error('Failed to fetch property', err);
    return cached
      ?
          cached.find(
            (p) =>
              String(p.id) === idStr ||
              String(p.listingId) === idStr ||
              String(p.listing_id) === idStr
          ) || null
      : null;
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
      results.push(props);
      await sleep(200);
    }

    properties = results.flat();
  } else {
    properties = await fetchProperties(baseParams);
  }

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
    const id = p.id ?? p.listingId ?? p.listing_id;
    if (!id) return acc;
    const normalizedImages = normalizeImages(p.images || []);
    const trimmedImages =
      typeof maxImages === 'number' ? normalizedImages.slice(0, maxImages) : normalizedImages;
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
            ? `£${p.price}`
            : p.price
          : null,
      priceValue: p.price != null ? Number(p.price) : null,
      bedrooms: p.bedrooms ?? null,
      propertyType: p.propertyType ?? null,
      rentFrequency: p.rentFrequency ?? null,
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
