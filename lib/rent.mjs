import { formatRentFrequency } from './format.mjs';

export function parsePriceNumber(value) {
  return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
}

export function rentToMonthly(price, freq) {
  const amount = parsePriceNumber(price);
  const normalized = formatRentFrequency(freq);
  const legacy = typeof freq === 'string' ? freq.trim().toUpperCase() : '';

  switch (normalized) {
    case 'pw':
      return (amount * 52) / 12;
    case 'pcm':
      return amount;
    case 'pq':
      return amount / 3;
    case 'pa':
      return amount / 12;
    default:
      break;
  }

  switch (legacy) {
    case 'W':
      return (amount * 52) / 12;
    case 'M':
      return amount;
    case 'Q':
      return amount / 3;
    case 'Y':
      return amount / 12;
    default:
      return amount;
  }
}
