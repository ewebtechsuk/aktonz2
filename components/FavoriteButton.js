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

  const toggleFavourite = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('favourites') || '[]');
      let updated;
      if (stored.includes(propertyId)) {
        updated = stored.filter((id) => id !== propertyId);
        setFavourite(false);
      } else {
        updated = [...stored, propertyId];
        setFavourite(true);
      }
      localStorage.setItem('favourites', JSON.stringify(updated));
    } catch {
      // Ignore write errors
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
