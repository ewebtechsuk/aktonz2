import { readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

import { getGalleryItemById } from './gallery.mjs';

const STORE_PATH = new URL('../data/valuations.json', import.meta.url);

export const VALUATION_STATUSES = [
  'new',
  'contacted',
  'valuation_sent',
  'lost',
  'archived',
];

const STATUS_ALIASES = new Map([
  ['scheduled', 'contacted'],
  ['completed', 'valuation_sent'],
  ['valuation-sent', 'valuation_sent'],
  ['valuation sent', 'valuation_sent'],
]);

const STATUS_ORDER = new Map(VALUATION_STATUSES.map((status, index) => [status, index]));

function sanitizeString(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function sanitizeNullableString(value) {
  const normalized = sanitizeString(value);
  return normalized || null;
}

function normalizeStatus(value) {
  const normalized = sanitizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) {
    return '';
  }

  if (STATUS_ALIASES.has(normalized)) {
    return STATUS_ALIASES.get(normalized);
  }

  return normalized;
}

function applyDefaultStatus(status) {
  const normalized = normalizeStatus(status);
  return VALUATION_STATUSES.includes(normalized) ? normalized : 'new';
}

function normalizePresentation(presentation) {
  if (!presentation || typeof presentation !== 'object') {
    return null;
  }

  const id = sanitizeString(presentation.id);
  if (!id) {
    return null;
  }

  const orderNumber = Number.parseInt(presentation.order, 10);
  const order = Number.isFinite(orderNumber) ? orderNumber : null;

  return {
    id,
    category: sanitizeNullableString(presentation.category),
    categorySlug: sanitizeNullableString(presentation.categorySlug),
    title: sanitizeNullableString(presentation.title),
    slide: sanitizeNullableString(presentation.slide),
    agency: sanitizeNullableString(presentation.agency),
    thumbnailUrl: sanitizeNullableString(presentation.thumbnailUrl),
    presentationUrl: sanitizeNullableString(presentation.presentationUrl),
    order,
    message: sanitizeNullableString(presentation.message),
    selectedAt: sanitizeNullableString(presentation.selectedAt),
    sentAt: sanitizeNullableString(presentation.sentAt),
  };
}

function normalizeValuationRecord(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const normalized = {
    ...entry,
    id: sanitizeString(entry.id),
    status: applyDefaultStatus(entry.status),
    firstName: sanitizeString(entry.firstName),
    lastName: sanitizeString(entry.lastName),
    email: sanitizeString(entry.email).toLowerCase(),
    phone: sanitizeString(entry.phone),
    address: sanitizeString(entry.address),
    source: sanitizeNullableString(entry.source) || 'aktonz.co.uk valuation form',
    notes: sanitizeNullableString(entry.notes),
    createdAt: sanitizeNullableString(entry.createdAt),
    updatedAt: sanitizeNullableString(entry.updatedAt),
    appointmentAt: sanitizeNullableString(entry.appointmentAt),
    presentation: normalizePresentation(entry.presentation),
  };

  if (!normalized.createdAt) {
    normalized.createdAt = new Date().toISOString();
  }

  if (!normalized.updatedAt) {
    normalized.updatedAt = normalized.createdAt;
  }

  return normalized;
}

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { valuations: [] };
    }

    const valuations = Array.isArray(parsed.valuations)
      ? parsed.valuations
          .map(normalizeValuationRecord)
          .filter(Boolean)
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

function normalizeEmail(value) {
  return sanitizeString(value).toLowerCase();
}

function statusRank(status) {
  return STATUS_ORDER.get(status) ?? VALUATION_STATUSES.length;
}

function recentTimestamp(valuation) {
  const updated = Date.parse(valuation.updatedAt || '');
  const created = Date.parse(valuation.createdAt || '');

  if (Number.isFinite(updated)) {
    return updated;
  }

  if (Number.isFinite(created)) {
    return created;
  }

  return 0;
}

export function formatValuationStatus(status) {
  const normalized = applyDefaultStatus(status);
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getValuationStatusOptions() {
  return VALUATION_STATUSES.map((status) => ({
    value: status,
    label: formatValuationStatus(status),
  }));
}

export async function listValuationRequests() {
  const store = await readStore();
  return store.valuations
    .slice()
    .sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return recentTimestamp(b) - recentTimestamp(a);
    });
}

export async function createValuationRequest(payload) {
  const now = new Date().toISOString();
  const firstName = sanitizeString(payload.firstName);
  const lastName = sanitizeString(payload.lastName);
  const email = normalizeEmail(payload.email);
  const phone = sanitizeString(payload.phone);
  const address = sanitizeString(payload.address);
  const notes = sanitizeNullableString(payload.notes);

  if (!firstName || !lastName || !email || !phone || !address) {
    const error = new Error('Missing required valuation details');
    error.code = 'VALUATION_VALIDATION_ERROR';
    throw error;
  }

  const baseId = `${email}-${address}`;
  const id = generateId(baseId);

  const record = normalizeValuationRecord({
    id,
    createdAt: now,
    updatedAt: now,
    status: 'new',
    firstName,
    lastName,
    email,
    phone,
    address,
    notes,
    source: payload.source ? sanitizeString(payload.source) : 'aktonz.co.uk valuation form',
  });

  const store = await readStore();
  store.valuations = [record, ...store.valuations];
  await writeStore(store);

  return record;
}

export async function updateValuation(id, updates = {}) {
  const normalizedId = sanitizeString(id);
  if (!normalizedId) {
    const error = new Error('Valuation id is required');
    error.code = 'VALUATION_VALIDATION_ERROR';
    throw error;
  }

  const store = await readStore();
  const index = store.valuations.findIndex((entry) => sanitizeString(entry.id) === normalizedId);

  if (index === -1) {
    const error = new Error('Valuation not found');
    error.code = 'VALUATION_NOT_FOUND';
    throw error;
  }

  const current = store.valuations[index];
  const now = new Date().toISOString();
  let nextPresentation = normalizePresentation(current.presentation);

  if (Object.prototype.hasOwnProperty.call(updates, 'presentationId')) {
    const requestedId = sanitizeString(updates.presentationId);

    if (requestedId) {
      const galleryItem = await getGalleryItemById(requestedId);
      if (!galleryItem) {
        const error = new Error('Selected valuation style was not found');
        error.code = 'VALUATION_PRESENTATION_NOT_FOUND';
        throw error;
      }

      nextPresentation = {
        id: galleryItem.id,
        category: galleryItem.category,
        categorySlug: galleryItem.categorySlug,
        title: galleryItem.title,
        slide: galleryItem.slide,
        agency: galleryItem.agency,
        thumbnailUrl: galleryItem.thumbnailUrl,
        presentationUrl: galleryItem.presentationUrl,
        order: galleryItem.order,
        message: nextPresentation?.message ?? null,
        selectedAt: now,
        sentAt: nextPresentation?.sentAt ?? null,
      };
    } else {
      nextPresentation = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'presentationMessage')) {
    const message = sanitizeNullableString(updates.presentationMessage);

    if (!nextPresentation && message) {
      const error = new Error('Select a valuation style before adding a message');
      error.code = 'VALUATION_PRESENTATION_NOT_SELECTED';
      throw error;
    }

    if (nextPresentation) {
      nextPresentation = {
        ...nextPresentation,
        message,
      };
    }
  }

  const nextStatus = Object.prototype.hasOwnProperty.call(updates, 'status')
    ? applyDefaultStatus(updates.status)
    : current.status;

  if (!VALUATION_STATUSES.includes(nextStatus)) {
    const error = new Error('Invalid valuation status');
    error.code = 'VALUATION_INVALID_STATUS';
    throw error;
  }

  if (nextStatus === 'valuation_sent' && nextPresentation) {
    nextPresentation = {
      ...nextPresentation,
      sentAt: nextPresentation.sentAt || now,
    };
  }

  const notes = Object.prototype.hasOwnProperty.call(updates, 'notes')
    ? sanitizeNullableString(updates.notes)
    : current.notes ?? null;

  const appointmentAt = Object.prototype.hasOwnProperty.call(updates, 'appointmentAt')
    ? sanitizeNullableString(updates.appointmentAt)
    : current.appointmentAt ?? null;

  const updatedRecord = normalizeValuationRecord({
    ...current,
    status: nextStatus,
    updatedAt: now,
    notes,
    appointmentAt,
    presentation: nextPresentation,
  });

  store.valuations[index] = updatedRecord;
  await writeStore(store);

  return updatedRecord;
}

export async function updateValuationStatus(id, status) {
  return updateValuation(id, { status });
}

export async function getValuationById(id) {
  const normalizedId = sanitizeString(id);
  if (!normalizedId) {
    return null;
  }

  const store = await readStore();
  const valuation = store.valuations.find((entry) => sanitizeString(entry.id) === normalizedId);
  return valuation ? normalizeValuationRecord(valuation) : null;
}
