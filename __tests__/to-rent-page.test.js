/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('../components/PropertyList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/PropertyMap', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/ListingFilters', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/ListingInsights', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/AgentCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../lib/format.mjs', () => {
  const formatPriceGBP = jest.fn((value, options = {}) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return `£${options.isSale ? amount.toLocaleString('en-GB') : String(amount)}`;
  });
  return {
    __esModule: true,
    formatPriceGBP,
    formatRentFrequency: jest.fn((frequency) => frequency || ''),
  };
});

jest.mock('../lib/offer-frequency.mjs', () => ({
  __esModule: true,
  formatOfferFrequencyLabel: jest.fn((freq) => {
    if (!freq) return '';
    if (freq === 'pcm') return 'Per month';
    if (typeof freq === 'string') return freq;
    return '';
  }),
}));

jest.mock('../lib/apex27.mjs', () => ({
  __esModule: true,
  fetchPropertiesByTypeCachedFirst: jest.fn(),
}));

jest.mock('../styles/Home.module.css', () => ({}), { virtual: true });
jest.mock('../styles/ToRent.module.css', () => ({
  hero: 'hero',
  heroContent: 'heroContent',
  breadcrumbs: 'breadcrumbs',
  heroTitle: 'heroTitle',
  heroSubtitle: 'heroSubtitle',
  heroStats: 'heroStats',
  heroStat: 'heroStat',
  heroStatValue: 'heroStatValue',
  content: 'content',
  filtersSection: 'filtersSection',
  filtersInner: 'filtersInner',
  activeFilters: 'activeFilters',
  filterChip: 'filterChip',
  resultsLayout: 'resultsLayout',
  listColumn: 'listColumn',
  resultsHeader: 'resultsHeader',
  mapColumn: 'mapColumn',
  mapCard: 'mapCard',
  mapSummary: 'mapSummary',
  agentsSection: 'agentsSection',
  ctaSection: 'ctaSection',
  ctaButtons: 'ctaButtons',
  primaryCta: 'primaryCta',
  secondaryCta: 'secondaryCta',
}), { virtual: true });

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }) => (
    <a {...props}>{children}</a>
  ),
}));

const { useRouter } = jest.requireMock('next/router');

describe('ToRent page hero stats', () => {
  beforeEach(() => {
    useRouter.mockReturnValue({
      query: {},
      push: jest.fn(),
      pathname: '/to-rent',
      isReady: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero average rent with comma separators for four-digit rents', async () => {
    const pageModule = await import('../pages/to-rent.js');
    const ToRent = pageModule.default?.default ?? pageModule.default ?? pageModule;
    const { formatPriceGBP } = jest.requireMock('../lib/format.mjs');
    expect(typeof ToRent).toBe('function');
    expect(jest.isMockFunction(formatPriceGBP)).toBe(true);

    const properties = [
      {
        id: '1',
        price: '£2,100 pcm',
        priceValue: 2100,
        rentFrequency: 'pcm',
        status: 'available',
        propertyType: 'apartment',
        bedrooms: 2,
        city: 'London',
        county: 'Greater London',
      },
    ];

    const markup = renderToStaticMarkup(
      <ToRent properties={properties} agents={[]} />
    );

    expect(markup).toContain('£2,100 Per month');
    expect(formatPriceGBP).toHaveBeenCalledWith(2100, { isSale: true });
  });
});
