const API_URL = 'https://private-anon-cd99d5599d-apex27.apiary-proxy.com/listings';

export async function fetchProperties() {
  if (!process.env.APEX27_API_KEY) {
    return sampleProperties;
  }
  try {
    const res = await fetch(API_URL, {
      headers: { 'X-API-Key': process.env.APEX27_API_KEY }
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
    const res = await fetch(`${API_URL}/${id}`, {
      headers: { 'X-API-Key': process.env.APEX27_API_KEY }
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

const sampleProperties = [
  {
    id: '1',
    title: 'Sample Flat in London',
    description: 'Two bedroom flat with garden.',
    price: '£500,000',
    image: 'https://via.placeholder.com/300'
  }
];
