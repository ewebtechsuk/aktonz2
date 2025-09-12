import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function SearchBar() {
  const [mode, setMode] = useState('buy');
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const base = mode === 'buy' ? '/for-sale' : '/to-rent';
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (propertyType) params.set('propertyType', propertyType);
    const url = `${base}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
  }

  return (
    <div className={styles.searchWrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'buy' ? styles.activeTab : ''}
          onClick={() => setMode('buy')}
        >
          Buy
        </button>
        <button
          type="button"
          className={mode === 'rent' ? styles.activeTab : ''}
          onClick={() => setMode('rent')}
        >
          Rent
        </button>
      </div>
      <div className={styles.searchControls}>
        <form className={styles.searchBar} onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Search area or postcode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="Bedrooms"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            min="0"
          />
          <input
            type="text"
            placeholder="Property type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <Link href="/valuation" className={styles.valuationButton}>
          Get a free valuation
        </Link>
      </div>
    </div>
  );
}
