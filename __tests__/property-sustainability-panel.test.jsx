/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('../styles/PropertyDetails.module.css', () => new Proxy({}, {
  get: (target, prop) => (prop in target ? target[prop] : prop),
}));

import PropertySustainabilityPanel from '../components/PropertySustainabilityPanel';

describe('PropertySustainabilityPanel', () => {
  let container;
  function render(ui) {
    container.innerHTML = renderToStaticMarkup(ui);
  }

  function findAllMatchingText(pattern) {
    const matcher = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    return Array.from(container.querySelectorAll('*')).filter((node) => {
      if (!(node instanceof Element)) {
        return false;
      }

      const text = node.textContent;
      if (!text) {
        return false;
      }

      return matcher.test(text.trim());
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    container = null;
  });

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

    render(<PropertySustainabilityPanel property={property} />);

    const heading = container.querySelector('h2');
    expect(heading).toBeDefined();
    expect(heading.textContent).toMatch(/Energy & running costs/i);
    expect(findAllMatchingText(/^B$/i)).not.toHaveLength(0);
    expect(findAllMatchingText(/^Band D$/i)).not.toHaveLength(0);
    expect(findAllMatchingText(/^Electricity$/i)).not.toHaveLength(0);
    expect(findAllMatchingText(/^Water$/i)).not.toHaveLength(0);
    expect(findAllMatchingText(/^Council tax$/i)).not.toHaveLength(0);
  });

  it('falls back when sustainability data is missing', () => {
    const property = {
      includedUtilities: {},
    };

    render(
      <PropertySustainabilityPanel property={property} />
    );

    expect(findAllMatchingText(/^Not provided$/i)).toHaveLength(2);
    expect(findAllMatchingText(/Utilities information not provided/i)).not.toHaveLength(0);
  });
});
