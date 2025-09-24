import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'offers.json');

async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, '[]', 'utf8');
  }
}

export async function readOffers() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  try {
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeOffers(offers) {
  await fs.writeFile(DATA_PATH, JSON.stringify(offers, null, 2), 'utf8');
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
  price,
  frequency,
  name,
  email,
  depositAmount,
}) {
  const offers = await readOffers();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resolvedDeposit =
    toNumber(depositAmount, undefined) ?? getDefaultDepositAmount();

  const offer = {
    id,
    propertyId,
    propertyTitle,
    price,
    frequency,
    name,
    email,
    status: 'new',
    paymentStatus: 'pending',
    depositAmount: resolvedDeposit,
    createdAt: now,
    updatedAt: now,
    notes: '',
    payments: [],
  };

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
