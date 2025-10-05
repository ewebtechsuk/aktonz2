import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('../styles/PropertyDetails.module.css', () => new Proxy({}, {
  get: (target, prop) => (prop in target ? target[prop] : prop),
}));

import PropertySustainabilityPanel from '../components/PropertySustainabilityPanel';

describe('PropertySustainabilityPanel', () => {
  it('renders provided EPC score, council tax and included utilities', () => {
    const property = {
      epcScore: 'B',
      councilTaxBand: 'd',
      includedUtilities: {
        electricity: true,
        water: true,
        councilTax: true,
        internet: false,
      },
    };

    const markup = renderToStaticMarkup(
      <PropertySustainabilityPanel property={property} />
    );

    expect(markup).toContain('Energy &amp; running costs');
    expect(markup).toContain('EPC rating');
    expect(markup).toContain('B');
    expect(markup).toContain('Band D');
    expect(markup).toContain('Electricity');
    expect(markup).toContain('Water');
    expect(markup).toContain('Council tax');
  });

  it('falls back when sustainability data is missing', () => {
    const property = {
      includedUtilities: {},
    };

    const markup = renderToStaticMarkup(
      <PropertySustainabilityPanel property={property} />
    );

    const notProvidedMatches = markup.match(/Not provided/gi) || [];
    expect(notProvidedMatches.length).toBeGreaterThanOrEqual(2);
    expect(markup).toContain('Utilities information not provided');
  });
});
