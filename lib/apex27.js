const API_URL = 'https://api.apex27.com/properties';

export async function fetchProperties() {
  if (!process.env.APEX27_API_KEY) {
    return sampleProperties;
  }
  const res = await fetch(API_URL, {
    headers: { 'X-API-Key': process.env.APEX27_API_KEY }
  });
  if (!res.ok) {
    console.error('Failed to fetch properties', res.status);
    return sampleProperties;
  }
  const data = await res.json();
  return data.properties || [];
}

export async function fetchPropertyById(id) {
  if (!process.env.APEX27_API_KEY) {
    return sampleProperties.find((p) => p.id === id) || null;
  }
  const res = await fetch(`${API_URL}/${id}`, {
    headers: { 'X-API-Key': process.env.APEX27_API_KEY }
  });
  if (!res.ok) {
    console.error('Failed to fetch property', res.status);
    return null;
  }
  return await res.json();
}

const sampleProperties = [
  {
    id: '1',
    title: 'Sample Flat in London',
    description: 'Two bedroom flat with garden.',
    price: '£500,000',
    image: 'https://via.placeholder.com/300'
  }
];
