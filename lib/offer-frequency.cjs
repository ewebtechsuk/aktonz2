const { formatRentFrequency } = require('./format.cjs');

const OFFER_FREQUENCY_OPTIONS = [
  { value: 'pw', label: 'Per week' },
  { value: 'pcm', label: 'Per month' },
  { value: 'pq', label: 'Per quarter' },
  { value: 'pa', label: 'Per annum' },
];

const SUPPORTED_RENT_FREQUENCIES = new Set(
  OFFER_FREQUENCY_OPTIONS.map((option) => option.value)
);
const DEFAULT_OFFER_FREQUENCY_OPTION =
  OFFER_FREQUENCY_OPTIONS[0] ?? { value: '', label: '' };
const DEFAULT_OFFER_FREQUENCY = DEFAULT_OFFER_FREQUENCY_OPTION.value;

function formatOfferFrequencyLabel(value) {
  const normalized = formatRentFrequency(value);

  if (!normalized) {
    return '';
  }

  const matched = OFFER_FREQUENCY_OPTIONS.find(
    (option) => option.value === normalized
  );

  if (matched) {
    return matched.label;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return normalized;
}

function isSaleListing(property) {
  const transactionType = property?.transactionType
    ? String(property.transactionType).toLowerCase()
    : null;

  if (transactionType) {
    return transactionType === 'sale';
  }

  return !property?.rentFrequency;
}

function resolveOfferFrequency(property) {
  if (isSaleListing(property)) {
    return '';
  }

  const normalized = formatRentFrequency(property?.rentFrequency);

  if (SUPPORTED_RENT_FREQUENCIES.has(normalized)) {
    return normalized;
  }

  return DEFAULT_OFFER_FREQUENCY;
}

module.exports = {
  OFFER_FREQUENCY_OPTIONS,
  formatOfferFrequencyLabel,
  isSaleListing,
  resolveOfferFrequency,
};
