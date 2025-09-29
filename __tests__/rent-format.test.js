let formatPropertyPriceLabel;

beforeAll(async () => {
  ({ formatPropertyPriceLabel } = await import('../lib/rent.mjs'));
});

describe('formatPropertyPriceLabel', () => {
  it('formats rental prices with readable frequency labels', () => {
    const label = formatPropertyPriceLabel({
      price: '£1,750 pcm',
      rentFrequency: 'pcm',
    });

    expect(label).toBe('£1,750 Per month');
  });
});
