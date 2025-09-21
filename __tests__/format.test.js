let formatRentFrequency;
let formatPriceGBP;

beforeAll(async () => {
  ({ formatRentFrequency, formatPriceGBP } = await import('../lib/format.mjs'));
});

describe('formatRentFrequency', () => {
  test('maps known frequency codes', () => {
    expect(formatRentFrequency('W')).toBe('pw');
    expect(formatRentFrequency('M')).toBe('pcm');
    expect(formatRentFrequency('Q')).toBe('pq');
    expect(formatRentFrequency('Y')).toBe('pa');
  });

  test('returns original value for unknown codes', () => {
    expect(formatRentFrequency('X')).toBe('X');
  });

  test('returns empty string for falsy input', () => {
    expect(formatRentFrequency()).toBe('');
  });
});

describe('formatPriceGBP', () => {
  test('rounds up to the nearest pound for rent prices', () => {
    expect(formatPriceGBP('950.10')).toBe('£951');
  });

  test('adds thousand separators for sale prices', () => {
    expect(formatPriceGBP('450000.01', { isSale: true })).toBe('£450,001');
  });

  test('returns empty string for invalid values', () => {
    expect(formatPriceGBP(null)).toBe('');
    expect(formatPriceGBP('')).toBe('');
  });
});
