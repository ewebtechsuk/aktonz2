import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import {
  DEFAULT_OFFER_STATUS,
  formatOfferStatusLabel,
  getOfferStatusDefinition,
  normaliseOfferStatus,
} from './offer-statuses.js';

const fallbackModuleUrl =
  typeof __filename !== 'undefined' ? pathToFileURL(__filename).href : undefined;

const moduleUrl =
  typeof import.meta !== 'undefined' && import.meta?.url
    ? import.meta.url
    : fallbackModuleUrl;

const DATA_URL = new URL('../data/offers.json', moduleUrl);
const DATA_FILE_PATH = fileURLToPath(DATA_URL);
const DATA_DIR_PATH = path.dirname(DATA_FILE_PATH);

const IGNORABLE_FS_CODES = new Set([
  'EACCES',
  'EBUSY',
  'ENOENT',
  'ENOTDIR',
  'EPERM',
  'EROFS',
]);

function isIgnorableFsError(error) {
  return Boolean(error?.code && IGNORABLE_FS_CODES.has(error.code));
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_URL);
    return true;
  } catch (accessError) {
    try {
      await fs.mkdir(DATA_DIR_PATH, { recursive: true });
    } catch (mkdirError) {
      if (mkdirError?.code === 'EEXIST') {
        // Directory already exists; continue with file creation attempt.
      } else if (isIgnorableFsError(mkdirError)) {
        return false;
      } else {
        throw mkdirError;
      }
    }

    try {
      await fs.writeFile(DATA_URL, '[]', 'utf8');
      return true;
    } catch (writeError) {
      if (isIgnorableFsError(writeError)) {
        return false;
      }
      throw writeError;
    }
  }
}

export async function readOffers() {
  const hasDataFile = await ensureDataFile();
  if (!hasDataFile) {
    return [];
  }

  let raw;
  try {
    raw = await fs.readFile(DATA_URL, 'utf8');
  } catch (readError) {
    if (isIgnorableFsError(readError)) {
      return [];
    }
    throw readError;
  }
  try {
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeOffers(offers) {
  await fs.writeFile(DATA_URL, JSON.stringify(offers, null, 2), 'utf8');
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDefaultDepositAmount() {
  return toNumber(process.env.OFFER_DEPOSIT_AMOUNT, 500);
}

export async function addOffer({
  propertyId,
  propertyTitle,
  propertyAddress,
  offerAmount,
  frequency,
  name,
  email,
  phone,
  message,
  depositAmount,
  contactId,
  agentId,
  moveInDate,
  householdSize,
  hasPets,
  employmentStatus,
  referencingConsent,
  proofOfFunds,
  additionalConditions,
}) {
  const offers = await readOffers();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resolvedDeposit =
    toNumber(depositAmount, undefined) ?? getDefaultDepositAmount();
  const resolvedPrice = toNumber(offerAmount, undefined);
  const resolvedStatus = normaliseOfferStatus(DEFAULT_OFFER_STATUS);
  const statusDefinition = getOfferStatusDefinition(resolvedStatus);

  const statusEntry = {
    id: randomUUID(),
    status: resolvedStatus,
    label: statusDefinition?.label || formatOfferStatusLabel(resolvedStatus),
    note: statusDefinition?.defaultNote || '',
    actor: {
      type: 'applicant',
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    },
    createdAt: now,
    type: 'status',
  };

  const offer = {
    id,
    propertyId,
    price: resolvedPrice ?? null,
    frequency,
    name,
    email,
    ...(phone !== undefined ? { phone } : {}),
    ...(message !== undefined ? { message } : {}),
    status: resolvedStatus,
    statusLabel: statusEntry.label,
    statusHistory: [statusEntry],
    paymentStatus: 'pending',
    depositAmount: resolvedDeposit,
    createdAt: now,
    updatedAt: now,
    notes: [],
    payments: [],
    compliance: {
      moveInDate: moveInDate || null,
      householdSize:
        Number.isFinite(Number(householdSize)) && Number(householdSize) > 0
          ? Number(householdSize)
          : null,
      hasPets: Boolean(hasPets),
      employmentStatus: employmentStatus || '',
      referencingConsent: Boolean(referencingConsent),
      proofOfFunds: proofOfFunds || '',
      additionalConditions: additionalConditions || '',
    },
  };

  if (propertyTitle !== undefined) {
    offer.propertyTitle = propertyTitle;
  }

  if (propertyAddress !== undefined) {
    offer.propertyAddress = propertyAddress;
  }

  if (message !== undefined) {
    offer.message = message;
  }

  if (contactId !== undefined) {
    offer.contactId = contactId;
  }

  if (agentId !== undefined) {
    offer.agentId = agentId;
  }

  offers.push(offer);
  await writeOffers(offers);
  return offer;
}

export async function getOfferById(id) {
  const offers = await readOffers();
  return offers.find((offer) => offer.id === id) || null;
}

export async function updateOffer(id, updates = {}) {
  const offers = await readOffers();
  const index = offers.findIndex((offer) => offer.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = offers[index];
  const nextStatusHistory = Array.isArray(updates.statusHistory)
    ? updates.statusHistory
    : current.statusHistory || [];
  const statusLabel = updates.statusLabel
    ? updates.statusLabel
    : current.statusLabel || (current.status ? formatOfferStatusLabel(current.status) : '');
  const compliance = updates.compliance
    ? { ...(current.compliance || {}), ...updates.compliance }
    : current.compliance;
  const next = {
    ...current,
    ...updates,
    statusHistory: nextStatusHistory,
    statusLabel,
    compliance,
    updatedAt: now,
  };
  offers[index] = next;
  await writeOffers(offers);
  return next;
}

export async function appendOfferStatus(
  id,
  { status, note, actor, complianceUpdates, eventType } = {},
) {
  const offers = await readOffers();
  const index = offers.findIndex((offer) => offer.id === id);
  if (index === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const offer = offers[index];
  const history = Array.isArray(offer.statusHistory) ? [...offer.statusHistory] : [];

  const resolvedStatus = status
    ? normaliseOfferStatus(status)
    : normaliseOfferStatus(offer.status || DEFAULT_OFFER_STATUS);
  const definition = getOfferStatusDefinition(resolvedStatus);

  const entry = {
    id: randomUUID(),
    status: resolvedStatus,
    label: definition?.label || formatOfferStatusLabel(resolvedStatus),
    note: note ? String(note).trim() : '',
    actor: actor && typeof actor === 'object'
      ? {
          ...(actor.type ? { type: actor.type } : {}),
          ...(actor.id ? { id: actor.id } : {}),
          ...(actor.name ? { name: actor.name } : {}),
          ...(actor.email ? { email: actor.email } : {}),
        }
      : undefined,
    createdAt: now,
    type: eventType || (status ? 'status' : 'note'),
  };

  history.push(entry);

  const nextOffer = {
    ...offer,
    status: resolvedStatus,
    statusLabel: entry.label,
    statusHistory: history,
    updatedAt: now,
    compliance: complianceUpdates
      ? { ...(offer.compliance || {}), ...complianceUpdates }
      : offer.compliance,
  };

  if (entry.note) {
    const existingNotes = Array.isArray(offer.notes) ? offer.notes.slice() : [];
    existingNotes.push({
      id: entry.id,
      note: entry.note,
      createdAt: now,
      author: entry.actor,
    });
    nextOffer.notes = existingNotes;
  }

  offers[index] = nextOffer;
  await writeOffers(offers);
  return nextOffer;
}

export async function upsertOfferPayment(offerId, payment) {
  const offers = await readOffers();
  const index = offers.findIndex((offer) => offer.id === offerId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const offer = offers[index];
  const existingIndex = offer.payments.findIndex(
    (item) => item.sessionId === payment.sessionId
  );

  const nextPayment = {
    ...payment,
    updatedAt: now,
    createdAt: payment.createdAt ?? now,
  };

  if (existingIndex >= 0) {
    offer.payments[existingIndex] = {
      ...offer.payments[existingIndex],
      ...nextPayment,
    };
  } else {
    offer.payments.push(nextPayment);
  }

  offers[index] = {
    ...offer,
    updatedAt: now,
  };

  await writeOffers(offers);
  return offers[index];
}

export async function updatePaymentBySession(sessionId, updates = {}) {
  const offers = await readOffers();
  let result = null;
  const now = new Date().toISOString();

  const nextOffers = offers.map((offer) => {
    const paymentIndex = offer.payments.findIndex(
      (payment) => payment.sessionId === sessionId
    );

    if (paymentIndex === -1) return offer;

    const nextPayment = {
      ...offer.payments[paymentIndex],
      ...updates,
      updatedAt: now,
    };

    const nextOffer = {
      ...offer,
      payments: [
        ...offer.payments.slice(0, paymentIndex),
        nextPayment,
        ...offer.payments.slice(paymentIndex + 1),
      ],
      paymentStatus: updates.status ?? offer.paymentStatus,
      updatedAt: now,
    };

    result = nextOffer;
    return nextOffer;
  });

  if (result) {
    await writeOffers(nextOffers);
  }

  return result;
}

export async function listOffers() {
  return readOffers();
}
