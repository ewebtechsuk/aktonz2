import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/SavedSearches.module.css';

function humaniseKey(key = '') {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normaliseValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Any';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.map((item) => normaliseValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${humaniseKey(k)}: ${normaliseValue(v)}`)
      .join(', ');
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-GB').format(value);
  }
  return String(value);
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/save-search');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setSearches(data);
      } catch {
        const data = JSON.parse(localStorage.getItem('savedSearches') || '[]');
        setSearches(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/save-search?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      const stored = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      const updated = stored.filter((s) => s.id !== id);
      localStorage.setItem('savedSearches', JSON.stringify(updated));
      setSearches(updated);
    }
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className={styles.stateCard}>
          <p>Loading your saved searches...</p>
        </div>
      );
    }

    if (!searches.length) {
      return (
        <div className={styles.stateCard}>
          <h2>No saved searches yet</h2>
          <p>
            Set your filters and save a search to receive alerts as soon as matching properties go live. You can create
            as many searches as you like.
          </p>
          <Link href="/to-rent" className={styles.stateButton}>
            Create a lettings search
          </Link>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {searches.map((search) => {
          const entries = Object.entries(search.params || {});
          return (
            <article key={search.id} className={styles.searchCard}>
              <div className={styles.cardHeader}>
                <h2>Lettings search</h2>
                <span className={styles.savedOn}>Saved {new Date(Number(search.id)).toLocaleDateString('en-GB')}</span>
              </div>
              {entries.length ? (
                <ul className={styles.paramList}>
                  {entries.map(([key, value]) => (
                    <li key={key} className={styles.paramBadge}>
                      <span className={styles.paramKey}>{humaniseKey(key)}</span>
                      <span className={styles.paramValue}>{normaliseValue(value)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyParams}>We will use your default preferences for this search.</p>
              )}
              <div className={styles.cardActions}>
                <Link href="/to-rent" className={styles.viewButton}>
                  View matching homes
                </Link>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDelete(search.id)}
                >
                  Delete search
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [loading, searches]);

  return (
    <AccountLayout
      heroSubtitle="My activity"
      heroTitle="Saved searches"
      heroDescription="Jump straight back into your favourite filters or tidy up the searches you no longer need."
      heroCta={{
        label: 'Create a new search',
        href: '/to-rent',
      }}
    >
      {content}
    </AccountLayout>
  );
}
