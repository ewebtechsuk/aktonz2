import { useEffect, useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

export default function FavoriteButton({ propertyId, iconOnly = false, className = '' }) {
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

  const buttonText = favourite ? 'Unfavourite' : 'Favourite';
  const label = favourite ? 'Remove from favourites' : 'Save to favourites';
  const classNames = [
    'favorite-button',
    favourite ? 'active' : '',
    iconOnly ? 'icon-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      onClick={toggleFavourite}
      aria-pressed={favourite}
      type="button"
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      {iconOnly ? (
        favourite ? (
          <FaHeart aria-hidden="true" />
        ) : (
          <FaRegHeart aria-hidden="true" />
        )
      ) : (
        buttonText
      )}
    </button>
  );
}
