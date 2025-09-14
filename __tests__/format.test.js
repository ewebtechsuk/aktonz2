let formatRentFrequency;

beforeAll(async () => {
  ({ formatRentFrequency } = await import('../lib/format.mjs'));
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
