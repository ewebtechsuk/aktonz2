import accountStorage from '../../../lib/account-storage.js';
import { applyApiHeaders, handlePreflight } from '../../../lib/api-helpers.js';
import { readSession } from '../../../lib/session.js';

const { readContactEntries, writeContactEntries } = accountStorage;

const STORE_NAME = 'contact-areas.json';

function normalisePoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }
  const lat = Number(point.lat ?? point.latitude ?? (Array.isArray(point) ? point[0] : null));
  const lng = Number(point.lng ?? point.longitude ?? (Array.isArray(point) ? point[1] : null));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function normaliseArea(area) {
  if (!area || typeof area !== 'object') {
    return null;
  }
  const id = typeof area.id === 'string' && area.id ? area.id : `area-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const type = area.type === 'polygon' ? 'polygon' : 'pin';
  const label = typeof area.label === 'string' ? area.label : null;

  if (type === 'pin') {
    const candidate = area.coordinates?.[0] ?? area.location ?? area.point ?? null;
    const point = normalisePoint(candidate);
    if (!point) {
      return null;
    }
    return { id, type, label, coordinates: [point] };
  }

  const raw = Array.isArray(area.coordinates) ? area.coordinates : [];
  const coords = raw.map((entry) => normalisePoint(entry)).filter(Boolean);
  if (coords.length < 3) {
    return null;
  }
  return { id, type: 'polygon', label, coordinates: coords };
}

function requireContactId(req, res) {
  const session = readSession(req);
  const contactId = session?.contactId;
  if (!contactId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return contactId;
}

export default async function handler(req, res) {
  applyApiHeaders(req, res, { methods: ['GET', 'PUT'] });

  if (handlePreflight(req, res)) {
    return;
  }

  const contactId = requireContactId(req, res);
  if (!contactId) {
    return;
  }

  if (req.method === 'GET') {
    try {
      const stored = await readContactEntries(STORE_NAME, contactId);
      const areas = Array.isArray(stored) ? stored.map(normaliseArea).filter(Boolean) : [];
      res.status(200).json({ areas });
    } catch (error) {
      console.error('Failed to read saved areas', error);
      res.status(500).json({ error: 'Failed to load saved areas' });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const incoming = Array.isArray(req.body?.areas) ? req.body.areas : [];
      const areas = incoming.map(normaliseArea).filter(Boolean);
      await writeContactEntries(STORE_NAME, contactId, areas);
      res.status(200).json({ ok: true, areas });
    } catch (error) {
      console.error('Failed to save account areas', error);
      res.status(500).json({ error: 'Failed to save areas' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT', 'OPTIONS']);
  res.status(405).end('Method Not Allowed');
}
