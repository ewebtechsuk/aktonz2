let rentToMonthly;

beforeAll(async () => {
  ({ rentToMonthly } = await import('../lib/rent.mjs'));
});

describe('rentToMonthly', () => {
  it('converts weekly rent to monthly using normalized frequency labels', () => {
    expect(rentToMonthly('£400', 'pw')).toBeCloseTo((400 * 52) / 12);
  });

  it('converts monthly rent when already monthly', () => {
    expect(rentToMonthly('1200', 'pcm')).toBe(1200);
  });

  it('converts quarterly rent to monthly', () => {
    expect(rentToMonthly('3000', 'pq')).toBe(1000);
  });

  it('supports descriptive quarterly frequencies via normalization', () => {
    expect(rentToMonthly('3000', 'Quarterly')).toBe(1000);
  });

  it('converts yearly rent to monthly', () => {
    expect(rentToMonthly('24000', 'pa')).toBe(2000);
  });

  it('falls back to original amount when frequency missing', () => {
    expect(rentToMonthly('1500')).toBe(1500);
  });

  it('falls back to original amount when frequency is unknown', () => {
    expect(rentToMonthly('1500', 'weird')).toBe(1500);
  });
});
