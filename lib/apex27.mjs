const API_URL = 'https://api.apex27.co.uk/listings';
const REGIONS_URL = 'https://api.apex27.co.uk/search-regions';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
// Lazy-load cached listings only on the server to avoid bundling fs in the browser
async function getCachedProperties() {
  if (typeof window !== 'undefined') return null;
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

export async function fetchProperties(params = {}) {
  const cached = await getCachedProperties();

  if (!process.env.APEX27_API_KEY) {
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
    const res = await fetch(`${API_URL}?${searchParams.toString()}`, {
      headers: {
        'x-api-key': process.env.APEX27_API_KEY,
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

  if (!process.env.APEX27_API_KEY) {
    return cached ? cached.find((p) => String(p.id) === idStr) || null : null;
  }

  try {
    const url = new URL(`${API_URL}/${idStr}`);
    url.searchParams.set('includeImages', '1');
    url.searchParams.set('includeGallery', '1');
    if (process.env.APEX27_BRANCH_ID) {
      url.searchParams.set('branchId', process.env.APEX27_BRANCH_ID);
    }

    const res = await fetch(url, {
      headers: {
        'x-api-key': process.env.APEX27_API_KEY,
        accept: 'application/json',
      },
    });

    if (res.status === 403) {
      console.error('Apex27 API key unauthorized (HTTP 403) when fetching property by id.');
      return cached ? cached.find((p) => String(p.id) === idStr) || null : null;
    }

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      return null;
    }

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.error('Failed to fetch property', err);
    return cached ? cached.find((p) => String(p.id) === idStr) || null : null;
  }
}

export async function fetchPropertiesByType(type) {
  const transactionType = type === 'sale' ? 'sale' : 'rent';
  const properties = await fetchProperties({ transactionType });

  let list = properties;
  if (transactionType === 'rent') {
    const allowed = ['available', 'under_offer', 'let_agreed', 'let'];
    const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
    list = properties.filter((p) => p.status && allowed.includes(normalize(p.status)));
  }

  return list.map((p) => ({
    id: String(p.id),
    title: p.displayAddress || p.address1 || p.title || '',
    description: p.summary || p.description || '',
    price:
      p.price != null
        ? p.priceCurrency === 'GBP'
          ? `£${p.price}`
          : p.price
        : null,
    image: p.images && p.images[0] ? p.images[0].url : null,
    images: p.images ? p.images.map((img) => img.url) : [],
    status: p.status ?? null,
    featured: p.featured ?? false,

  }));
}

export async function fetchSearchRegions() {
  if (!process.env.APEX27_API_KEY) {
    return [];
  }

  try {
    const res = await fetch(REGIONS_URL, {
      headers: {
        'x-api-key': process.env.APEX27_API_KEY,
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
