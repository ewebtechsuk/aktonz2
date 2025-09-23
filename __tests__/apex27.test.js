let extractPricePrefix;

beforeAll(async () => {
  ({ extractPricePrefix } = await import('../lib/apex27.mjs'));
});

describe('extractPricePrefix', () => {
  test('reads direct pricePrefix field', () => {
    expect(extractPricePrefix({ pricePrefix: 'guide_price' })).toBe('guide_price');
  });

  test('reads snake_case price_prefix field', () => {
    expect(extractPricePrefix({ price_prefix: 'offers_invited' })).toBe('offers_invited');
  });

  test('reads nested sale.price.priceQualifier field', () => {
    const listing = { sale: { price: { priceQualifier: 'offers_over' } } };
    expect(extractPricePrefix(listing)).toBe('offers_over');
  });

  test('reads from object value property', () => {
    const listing = { pricing: { priceQualifier: { value: 'asking_price' } } };
    expect(extractPricePrefix(listing)).toBe('asking_price');
  });

  test('returns null when no prefix is present', () => {
    expect(extractPricePrefix({})).toBeNull();
  });
});
