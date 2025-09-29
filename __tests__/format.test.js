let formatRentFrequency;
let formatPriceGBP;
let formatPricePrefix;

beforeAll(async () => {
  ({ formatRentFrequency, formatPriceGBP, formatPricePrefix } = await import(
    '../lib/format.mjs'
  ));
});

describe('formatRentFrequency', () => {
  test('maps known frequency codes', () => {
    expect(formatRentFrequency('W')).toBe('pw');
    expect(formatRentFrequency('M')).toBe('pcm');
    expect(formatRentFrequency('Q')).toBe('pq');
    expect(formatRentFrequency('Y')).toBe('pa');
  });

  test('normalizes descriptive rent cadence strings', () => {
    expect(formatRentFrequency('per week')).toBe('pw');
    expect(formatRentFrequency('Quarterly')).toBe('pq');
    expect(formatRentFrequency('per annum')).toBe('pa');
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

describe('formatPricePrefix', () => {
  test('maps known prefixes', () => {
    expect(formatPricePrefix('offers_invited')).toBe('Offers invited');
    expect(formatPricePrefix('oiro')).toBe('OIRO');
  });

  test('formats unknown prefixes', () => {
    expect(formatPricePrefix('best_and_final')).toBe('Best And Final');
  });

  test('returns empty string for falsy input', () => {
    expect(formatPricePrefix(null)).toBe('');
  });
});
