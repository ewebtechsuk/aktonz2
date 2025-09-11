import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function SearchBar() {
  const [mode, setMode] = useState('buy');

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
        <form className={styles.searchBar} onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="Search area or postcode" />
          <button type="submit">Search</button>
        </form>
        <a href="#valuation" className={styles.valuationButton}>
          Get a free valuation
        </a>
      </div>
    </div>
  );
}
