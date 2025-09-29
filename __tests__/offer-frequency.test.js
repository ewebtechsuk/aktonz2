describe('offer frequency helpers', () => {
  test('defaults pcm rentals to per month cadence', async () => {
    const { resolveOfferFrequency } = await import('../lib/offer-frequency.mjs');

    const property = {
      id: 'SCRAYE-PCM',
      transactionType: 'rent',
      rentFrequency: 'M',
    };

    expect(resolveOfferFrequency(property)).toBe('pcm');
  });

  test('omits frequency for sale listings', async () => {
    const { resolveOfferFrequency } = await import('../lib/offer-frequency.mjs');

    const property = {
      id: 'AKT-SALE',
      transactionType: 'sale',
      rentFrequency: 'M',
    };

    expect(resolveOfferFrequency(property)).toBe('');
  });
});
