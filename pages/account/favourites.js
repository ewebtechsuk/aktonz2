import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AccountLayout from '../../components/account/AccountLayout';
import styles from '../../styles/Favourites.module.css';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('en-GB');
}

export default function FavouritesPage() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/account/favourites', { credentials: 'include' });
        if (!active) return;

        if (res.status === 401) {
          setFavourites([]);
          setError('Sign in to view your favourites.');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load favourites');
        }

        const data = await res.json();
        if (!active) return;

        setFavourites(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load favourites', err);
        setError('We were unable to load your favourites. Please try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleRemove(propertyId) {
    setActionError('');
    try {
      const res = await fetch('/api/account/favourites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      });

      if (res.status === 401) {
        setActionError('Please sign in to manage favourites.');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to remove favourite');
      }

      setFavourites((prev) => prev.filter((item) => item.propertyId !== propertyId));
    } catch (err) {
      console.error('Failed to remove favourite', err);
      setActionError('We could not remove this favourite. Please try again.');
    }
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className={styles.stateCard}>
          <p>Loading your favourite homes...</p>
        </div>
      );
    }

    if (!favourites.length) {
      return (
        <div className={styles.stateCard}>
          <h2>No favourites yet</h2>
          <p>
            Tap the heart on any property to add it to this list. We will keep everything in sync across your devices so
            you can act quickly when the right home appears.
          </p>
          <Link href="/to-rent" className={styles.stateButton}>
            Browse lettings
          </Link>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {favourites.map((item) => {
          const savedOn = formatDate(item.createdAt);
          return (
            <article key={item.propertyId} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Property {item.propertyId}</h2>
                {savedOn ? <span className={styles.savedOn}>Saved {savedOn}</span> : null}
              </div>
              <p className={styles.cardHint}>We will send negotiators the full details so they can follow up with you.</p>
              <div className={styles.cardActions}>
                <Link href={`/property/${item.propertyId}`} className={styles.viewButton}>
                  View property
                </Link>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleRemove(item.propertyId)}
                >
                  Remove favourite
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [favourites, loading]);

  return (
    <AccountLayout
      heroSubtitle="My activity"
      heroTitle="Favourite homes"
      heroDescription="Keep track of the homes you love and let our team know where to focus their efforts."
      heroCta={{
        label: 'Find a new favourite',
        href: '/to-rent',
      }}
    >
      {error ? (
        <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
          {error}
        </div>
      ) : null}
      {actionError ? (
        <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
          {actionError}
        </div>
      ) : null}
      {content}
    </AccountLayout>
  );
}
