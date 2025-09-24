import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

const STORE_PATH = new URL('../data/valuations.json', import.meta.url);

export const VALUATION_STATUSES = [
  'new',
  'contacted',
  'scheduled',
  'completed',
  'archived',
];

function applyDefaultStatus(status) {
  if (!status) {
    return 'new';
  }

  const normalized = String(status).trim().toLowerCase();
  return VALUATION_STATUSES.includes(normalized) ? normalized : 'new';
}

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { valuations: [] };
    }

    const valuations = Array.isArray(parsed.valuations)
      ? parsed.valuations.map((entry) => ({
          ...entry,
          status: applyDefaultStatus(entry.status),
        }))
      : [];

    return { valuations };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { valuations: [] };
    }
    throw error;
  }
}

async function writeStore(store) {
  const payload = JSON.stringify(store, null, 2);
  await writeFile(STORE_PATH, `${payload}\n`, 'utf8');
}

function generateId(base) {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  const hash = createHash('sha1');
  hash.update(base);
  hash.update(String(Date.now()));
  return `val-${hash.digest('hex').slice(0, 12)}`;
}

function sanitizeString(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeEmail(value) {
  const email = sanitizeString(value).toLowerCase();
  return email;
}

export async function listValuationRequests() {
  const store = await readStore();
  return store.valuations
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function createValuationRequest(payload) {
  const now = new Date().toISOString();
  const firstName = sanitizeString(payload.firstName);
  const lastName = sanitizeString(payload.lastName);
  const email = normalizeEmail(payload.email);
  const phone = sanitizeString(payload.phone);
  const address = sanitizeString(payload.address);
  const notes = sanitizeString(payload.notes);

  if (!firstName || !lastName || !email || !phone || !address) {
    const error = new Error('Missing required valuation details');
    error.code = 'VALUATION_VALIDATION_ERROR';
    throw error;
  }

  const baseId = `${email}-${address}`;
  const id = generateId(baseId);

  const record = {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'new',
    firstName,
    lastName,
    email,
    phone,
    address,
    notes: notes || null,
    source: payload.source ? sanitizeString(payload.source) : 'aktonz.co.uk valuation form',
  };

  const store = await readStore();
  store.valuations = [record, ...store.valuations];
  await writeStore(store);

  return record;
}

export async function updateValuationStatus(id, status) {
  const normalizedId = sanitizeString(id);
  if (!normalizedId) {
    const error = new Error('Valuation id is required');
    error.code = 'VALUATION_VALIDATION_ERROR';
    throw error;
  }

  const normalizedStatus = applyDefaultStatus(status);
  if (!VALUATION_STATUSES.includes(normalizedStatus)) {
    const error = new Error('Invalid valuation status');
    error.code = 'VALUATION_INVALID_STATUS';
    throw error;
  }

  const store = await readStore();
  const index = store.valuations.findIndex((entry) => sanitizeString(entry.id) === normalizedId);

  if (index === -1) {
    const error = new Error('Valuation not found');
    error.code = 'VALUATION_NOT_FOUND';
    throw error;
  }

  const now = new Date().toISOString();
  const updated = {
    ...store.valuations[index],
    status: normalizedStatus,
    updatedAt: now,
  };

  store.valuations[index] = updated;
  await writeStore(store);

  return updated;
}

export async function getValuationById(id) {
  const normalizedId = sanitizeString(id);
  if (!normalizedId) {
    return null;
  }

  const store = await readStore();
  return store.valuations.find((entry) => sanitizeString(entry.id) === normalizedId) || null;
}
