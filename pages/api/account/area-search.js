const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestTimestamps = [];

function allowRequest() {
  const now = Date.now();
  while (requestTimestamps.length && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

function sanitiseQuery(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalised = value.normalize('NFKC').trim();
  if (!normalised) {
    return '';
  }
  const cleaned = normalised.replace(/[^\w\s,.'-]/g, '');
  return cleaned.replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function performLookup(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '0',
    polygon_geojson: '0',
    limit: '5',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AktonzAccountAreaSearch/1.0 (+https://www.aktonz.com)',
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Geocoding lookup failed with status ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((entry, index) => {
      const lat = Number(entry?.lat);
      const lng = Number(entry?.lon ?? entry?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      const label = typeof entry?.display_name === 'string' ? entry.display_name.trim() : '';
      return {
        id: entry?.place_id ? String(entry.place_id) : `${lat.toFixed(5)},${lng.toFixed(5)},${index}`,
        lat,
        lng,
        label: label || 'Unnamed location',
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rawQuery = Array.isArray(req.query?.query) ? req.query.query.join(' ') : req.query?.query;
  const query = sanitiseQuery(rawQuery || '');

  if (!query) {
    res.status(200).json({ results: [] });
    return;
  }

  if (!allowRequest()) {
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return;
  }

  try {
    const results = await performLookup(query);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Area search lookup failed', error);
    res.status(500).json({ error: 'Failed to lookup area suggestions' });
  }
}
