import { useEffect, useState } from 'react';
import listings from '../data/listings.json';

export default function PropertyComparison() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ids = JSON.parse(localStorage.getItem('compareList')) || [];
    const selected = listings.filter((p) => {
      const id = String(p.id || p.listingId || p.listing_id);
      return ids.includes(id);
    });
    const formatted = selected.map((p) => ({
      id: String(p.id || p.listingId || p.listing_id),
      title: p.displayAddress || p.address1 || p.title || '',
      price:
        p.price != null
          ? p.priceCurrency === 'GBP'
            ? `£${p.price}`
            : p.price
          : null,
    }));
    setProperties(formatted);
  }, []);

  if (properties.length === 0) {
    return <p>No properties selected for comparison.</p>;
  }

  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((p) => (
          <tr key={p.id}>
            <td>{p.title}</td>
            <td>{p.price || 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
