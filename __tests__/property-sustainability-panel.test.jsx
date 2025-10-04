/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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

    render(<PropertySustainabilityPanel property={property} />);

    expect(
      screen.getByRole('heading', { name: /energy & running costs/i })
    ).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Band D')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Council tax')).toBeInTheDocument();
  });

  it('falls back when sustainability data is missing', () => {
    const property = {
      includedUtilities: {},
    };

    render(<PropertySustainabilityPanel property={property} />);

    expect(screen.getAllByText(/^Not provided$/i)).toHaveLength(2);
    expect(
      screen.getByText(/Utilities information not provided/i)
    ).toBeInTheDocument();
  });
});
