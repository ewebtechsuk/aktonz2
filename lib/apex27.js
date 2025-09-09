const API_URL = 'https://api.apex27.co.uk/listings';

export async function fetchProperties(params = {}) {
  if (!process.env.APEX27_API_KEY) {
    return sampleProperties;
  }

  const searchParams = new URLSearchParams({
    status: 'live',
    includeImages: '1',
    includeGallery: '1',
    ...params,
  });

  if (process.env.APEX27_BRANCH_ID) {
    searchParams.set('branchId', process.env.APEX27_BRANCH_ID);
  }

  try {
    const res = await fetch(`${API_URL}?${searchParams.toString()}`, {
      headers: { 'X-API-Key': process.env.APEX27_API_KEY },
    });

    if (!res.ok) {
      console.error('Failed to fetch properties', res.status);
      return sampleProperties;
    }

    const data = await res.json();
    return data.properties || [];
  } catch (err) {
    console.error('Failed to fetch properties', err);
    return sampleProperties;
  }
}

export async function fetchPropertyById(id) {
  if (!process.env.APEX27_API_KEY) {
    return sampleProperties.find((p) => p.id === id) || null;
  }

  try {
    const url = new URL(`${API_URL}/${id}`);

    if (process.env.APEX27_BRANCH_ID) {
      url.searchParams.set('branchId', process.env.APEX27_BRANCH_ID);
    }

    const res = await fetch(url, {
      headers: { 'X-API-Key': process.env.APEX27_API_KEY },
    });

    if (!res.ok) {
      console.error('Failed to fetch property', res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch property', err);
    return null;
  }
}

export async function fetchPropertiesByType(type) {
  const properties = await fetchProperties({
    transactionType: type === 'sale' ? 'sales' : 'lettings',
  });
  return properties;
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
