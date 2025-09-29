export function formatRentFrequency(freq) {
  if (!freq) return '';

  const raw = String(freq).trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  const directMap = {
    W: 'pw',
    M: 'pcm',
    Q: 'pq',
    Y: 'pa',
  };
  if (directMap[upper]) {
    return directMap[upper];
  }

  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) {
    return '';
  }

  const aliasMap = {
    w: 'pw',
    week: 'pw',
    weeks: 'pw',
    weekly: 'pw',
    perweek: 'pw',
    pw: 'pw',
    m: 'pcm',
    month: 'pcm',
    months: 'pcm',
    monthly: 'pcm',
    permonth: 'pcm',
    pm: 'pcm',
    pcm: 'pcm',
    q: 'pq',
    quarter: 'pq',
    quarters: 'pq',
    quarterly: 'pq',
    perquarter: 'pq',
    pq: 'pq',
    y: 'pa',
    year: 'pa',
    years: 'pa',
    yearly: 'pa',
    annually: 'pa',
    perannum: 'pa',
    peryear: 'pa',
    pa: 'pa',
  };

  if (aliasMap[normalized]) {
    return aliasMap[normalized];
  }

  return raw;
}

export function formatPricePrefix(prefix) {
  if (!prefix) return '';

  const normalized = String(prefix).trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized) return '';

  const map = {
    guide_price: 'Guide price',
    offers_invited: 'Offers invited',
    offers_in_excess_of: 'Offers in excess of',
    offers_in_region_of: 'Offers in region of',
    offers_in_the_region_of: 'Offers in the region of',
    offers_over: 'Offers over',
    offers_around: 'Offers around',
    offers_from: 'Offers from',
    asking_price: 'Asking price',
    fixed_price: 'Fixed price',
    price_on_application: 'Price on application',
    poa: 'POA',
    oiro: 'OIRO',
    starting_bid: 'Starting bid',
    from: 'From',
    shared_ownership: 'Shared ownership',
  };

  if (map[normalized]) {
    return map[normalized];
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizePriceAmount(value) {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return Math.ceil(numeric);
}

export function formatPriceGBP(value, { isSale = false } = {}) {
  const amount = normalizePriceAmount(value);
  if (amount == null) return '';
  const formattedNumber = isSale
    ? amount.toLocaleString('en-GB')
    : String(amount);
  return `£${formattedNumber}`;
}
