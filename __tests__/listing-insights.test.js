/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('../styles/ListingInsights.module.css', () => ({
  insights: 'insights',
  heading: 'heading',
  grid: 'grid',
  card: 'card',
  figure: 'figure',
  meta: 'meta',
  subFigure: 'subFigure',
  count: 'count',
}), { virtual: true });

jest.mock('../lib/format.mjs', () => {
  const formatPriceGBP = jest.fn((value, options = {}) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return `£${options.isSale ? amount.toLocaleString('en-GB') : String(amount)}`;
  });
  return {
    __esModule: true,
    formatPriceGBP,
  };
});

describe('ListingInsights rent formatting', () => {
  it('shows comma separators for four-digit rent figures', async () => {
    const componentModule = await import('../components/ListingInsights.js');
    const ListingInsights =
      componentModule.default?.default ?? componentModule.default ?? componentModule;
    const { formatPriceGBP } = jest.requireMock('../lib/format.mjs');

    const stats = {
      averagePrice: 2100,
      medianPrice: 2100,
      propertyTypes: [],
      topAreas: [],
      averageBedrooms: null,
    };

    const markup = renderToStaticMarkup(
      <ListingInsights stats={stats} searchTerm="" variant="rent" />
    );

    expect(markup).toContain('£2,100 pcm');
    expect(markup).toContain('Median: £2,100 pcm');
    expect(formatPriceGBP).toHaveBeenCalledTimes(2);
    expect(formatPriceGBP).toHaveBeenNthCalledWith(1, 2100, { isSale: true });
    expect(formatPriceGBP).toHaveBeenNthCalledWith(2, 2100, { isSale: true });
  });
});
