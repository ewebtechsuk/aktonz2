const { formatPriceGBP, formatRentFrequency } = require('./format.cjs');
const { formatOfferFrequencyLabel } = require('./offer-frequency.cjs');

function parsePriceNumber(value) {
  return Number(String(value).replace(/[^0-9.]/g, '')) || 0;
}

function rentToMonthly(price, freq) {
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

function formatPropertyPriceLabel(property = {}) {
  if (!property || property.price == null) {
    return '';
  }

  const rentFrequency = property.rentFrequency;
  const hasRentFrequency =
    rentFrequency != null && String(rentFrequency).trim() !== '';

  if (!hasRentFrequency) {
    return String(property.price);
  }

  const rawPrice = property.price;
  const rawPriceString = String(rawPrice).trim();
  const hasDigits = /\d/.test(rawPriceString);
  const numericPrice = parsePriceNumber(rawPrice);
  const formattedPrice = hasDigits
    ? formatPriceGBP(numericPrice, { isSale: true })
    : rawPriceString;

  const frequencyLabel = formatOfferFrequencyLabel(rentFrequency);

  if (frequencyLabel) {
    if (formattedPrice) {
      return `${formattedPrice} ${frequencyLabel}`;
    }
    return frequencyLabel;
  }

  return formattedPrice;
}

module.exports = {
  parsePriceNumber,
  rentToMonthly,
  formatPropertyPriceLabel,
};
module.exports.default = module.exports;
