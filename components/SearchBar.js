import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function SearchBar() {
  const [mode, setMode] = useState('buy');
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const base = mode === 'buy' ? '/for-sale' : '/to-rent';
    const url = query.trim()
      ? `${base}?search=${encodeURIComponent(query.trim())}`
      : base;
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
          <button type="submit">Search</button>
        </form>
        <Link href="/valuation" className={styles.valuationButton}>
          Get a free valuation
        </Link>
      </div>
    </div>
  );
}
