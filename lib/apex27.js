const API_URL = 'https://api.apex27.co.uk/listings';

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
    return cached ?? sampleProperties;
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
      console.error('Apex27 API key unauthorized (HTTP 403). Falling back to cached/sample data.');
      return cached ?? sampleProperties;
    }

    if (!res.ok) {
      console.error('Failed to fetch properties', res.status);
      return cached ?? sampleProperties;
    }

    const data = await res.json();
    return Array.isArray(data) ? data : data.properties || [];
  } catch (err) {
    console.error('Failed to fetch properties', err);
    return cached ?? sampleProperties;
  }
}

export async function fetchPropertyById(id) {
  const cached = await getCachedProperties();

  if (!process.env.APEX27_API_KEY) {
    const list = cached ?? sampleProperties;
    return list.find((p) => p.id === id) || null;
  }

  try {
    const url = new URL(`${API_URL}/${id}`);
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
      return cached ? cached.find((p) => p.id === id) || null : null;
    }

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch property', err);
    return cached ? cached.find((p) => p.id === id) || null : null;
  }
}

export async function fetchPropertiesByType(type) {
  const transactionType = type === 'sale' ? 'sale' : 'rent';
  const properties = await fetchProperties({ transactionType });

  let list = properties;
  if (transactionType === 'rent') {
    const allowed = ['available', 'under_offer', 'let_agreed', 'let'];
    list = properties.filter((p) => allowed.includes(p.status));
  }

  return list.map((p) => ({
    id: p.id,
    title: p.displayAddress || p.address1 || p.title || '',
    description: p.summary || p.description || '',
    price: p.priceCurrency === 'GBP' ? `£${p.price}` : p.price,
    image: p.images && p.images[0] ? p.images[0].url : null,
    status: p.status,
  }));
}

const sampleProperties = [
  {
    id: '1',
    title: 'Sample Flat in London',
    description: 'Two bedroom flat with garden.',
    price: '£500,000',
    image: 'https://via.placeholder.com/300',
    type: 'sale'
  },
  {
    id: '2',
    title: 'City Centre Apartment',
    description: 'Modern apartment close to amenities.',
    price: '£1,200 pcm',
    image: 'https://via.placeholder.com/300',
    type: 'rent'
  }
];
