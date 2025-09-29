import { formatRentFrequency } from './format.mjs';

const SUPPORTED_RENT_FREQUENCIES = new Set(['pw', 'pcm', 'pq', 'pa']);

export function isSaleListing(property) {
  const transactionType = property?.transactionType
    ? String(property.transactionType).toLowerCase()
    : null;

  if (transactionType) {
    return transactionType === 'sale';
  }

  return !property?.rentFrequency;
}

export function resolveOfferFrequency(property) {
  if (isSaleListing(property)) {
    return '';
  }

  const normalized = formatRentFrequency(property?.rentFrequency);

  if (SUPPORTED_RENT_FREQUENCIES.has(normalized)) {
    return normalized;
  }

  if (normalized) {
    return normalized;
  }

  return 'pw';
}
