export function formatRentFrequency(freq) {
  if (!freq) return '';
  const map = {
    W: 'pw',
    M: 'pcm',
    Q: 'pq',
    Y: 'pa',
  };
  return map[freq] || freq;
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
