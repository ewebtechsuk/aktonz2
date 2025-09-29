import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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
}) {
  const offers = await readOffers();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resolvedDeposit =
    toNumber(depositAmount, undefined) ?? getDefaultDepositAmount();
  const resolvedPrice = toNumber(offerAmount, undefined);

  const offer = {
    id,
    propertyId,
    price: resolvedPrice ?? null,
    frequency,
    name,
    email,
    ...(phone !== undefined ? { phone } : {}),
    ...(message !== undefined ? { message } : {}),
    status: 'new',
    paymentStatus: 'pending',
    depositAmount: resolvedDeposit,
    createdAt: now,
    updatedAt: now,
    notes: '',
    payments: [],
  };

  if (propertyTitle !== undefined) {
    offer.propertyTitle = propertyTitle;
  }

  if (propertyAddress !== undefined) {
    offer.propertyAddress = propertyAddress;
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
  const next = {
    ...current,
    ...updates,
    updatedAt: now,
  };
  offers[index] = next;
  await writeOffers(offers);
  return next;
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
