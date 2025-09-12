import { useEffect, useState } from 'react';

export default function FavoriteButton({ propertyId }) {
  const [favourite, setFavourite] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem('favourites') || '[]');
      setFavourite(stored.includes(propertyId));
    } catch {
      setFavourite(false);
    }
  }, [propertyId]);

  const toggleFavourite = async () => {
    try {
      const stored = JSON.parse(localStorage.getItem('favourites') || '[]');
      const alerts = JSON.parse(localStorage.getItem('priceAlertEmails') || '{}');
      let updated;
      if (stored.includes(propertyId)) {
        updated = stored.filter((id) => id !== propertyId);
        setFavourite(false);
        if (alerts[propertyId]) {
          await fetch('/api/price-alerts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId, email: alerts[propertyId] }),
          });
          delete alerts[propertyId];
          localStorage.setItem('priceAlertEmails', JSON.stringify(alerts));
        }
      } else {
        updated = [...stored, propertyId];
        setFavourite(true);
        if (window.confirm('Notify me of price changes?')) {
          const email = window.prompt('Enter your email for alerts');
          if (email) {
            await fetch('/api/price-alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ propertyId, email }),
            });
            alerts[propertyId] = email;
            localStorage.setItem('priceAlertEmails', JSON.stringify(alerts));
          }
        }
      }
      localStorage.setItem('favourites', JSON.stringify(updated));
    } catch {
      // Ignore errors
    }
  };

  return (
    <button
      className={`favorite-button${favourite ? ' active' : ''}`}
      onClick={toggleFavourite}
      aria-pressed={favourite}
      type="button"
    >
      {favourite ? 'Unfavourite' : 'Favourite'}
    </button>
  );
}
