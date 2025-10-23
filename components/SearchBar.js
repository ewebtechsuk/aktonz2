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
      <div className={styles.tabs} role="group" aria-label="Listing mode">
        <button
          type="button"
          className={mode === 'buy' ? styles.activeTab : ''}
          onClick={() => setMode('buy')}
          aria-pressed={mode === 'buy'}
        >
          Buy
          <span className="sr-only"> properties</span>
        </button>
        <button
          type="button"
          className={mode === 'rent' ? styles.activeTab : ''}
          onClick={() => setMode('rent')}
          aria-pressed={mode === 'rent'}
        >
          Rent
          <span className="sr-only"> properties</span>
        </button>
      </div>
      <div className={styles.searchControls}>
        <form className={styles.searchBar} onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="search-query">
            Search area or postcode
          </label>
          <input
            type="text"
            name="query"
            id="search-query"
            placeholder="Search area or postcode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="street-address"
          />
          <label className="sr-only" htmlFor="search-min-price">
            Min price
          </label>
          <input
            type="number"
            name="minPrice"
            id="search-min-price"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
            autoComplete="off"
          />
          <label className="sr-only" htmlFor="search-max-price">
            Max price
          </label>
          <input
            type="number"
            name="maxPrice"
            id="search-max-price"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
            autoComplete="off"
          />
          <label className="sr-only" htmlFor="search-bedrooms">
            Bedrooms
          </label>
          <input
            type="number"
            name="bedrooms"
            id="search-bedrooms"
            placeholder="Bedrooms"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            min="0"
            autoComplete="off"
          />
          <label className="sr-only" htmlFor="search-property-type">
            Property type
          </label>
          <input
            type="text"
            name="propertyType"
            id="search-property-type"
            placeholder="Property type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            autoComplete="off"
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
