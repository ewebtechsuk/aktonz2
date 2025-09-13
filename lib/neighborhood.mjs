const cache = new Map();

export async function fetchNeighborhood(lat, lng) {
  if (lat == null || lng == null) {
    throw new Error('Latitude and longitude are required');
  }
  // Round coordinates to reduce cache keys for nearby areas
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch neighborhood info: ${res.status}`);
  }
  const data = await res.json();
  cache.set(key, data);
  return data;
}

export function _clearNeighborhoodCache() {
  cache.clear();
}
