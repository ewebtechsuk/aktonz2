import { formatRentFrequency } from './format.mjs';

export const OFFER_FREQUENCY_OPTIONS = [
  { value: 'pw', label: 'Per week' },
  { value: 'pcm', label: 'Per month' },
  { value: 'pq', label: 'Per quarter' },
  { value: 'pa', label: 'Per annum' },
];

const SUPPORTED_RENT_FREQUENCIES = new Set(
  OFFER_FREQUENCY_OPTIONS.map((option) => option.value)
);
const DEFAULT_OFFER_FREQUENCY = OFFER_FREQUENCY_OPTIONS[0]?.value ?? '';

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

  return DEFAULT_OFFER_FREQUENCY;
}
