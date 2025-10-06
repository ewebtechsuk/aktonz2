import { useEffect, useRef, useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

const FETCH_OPTIONS = { credentials: 'include' };

export default function FavoriteButton({ propertyId, iconOnly = false, className = '' }) {
  const [favourite, setFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('idle');
  const resetTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadFavourite() {
      if (!propertyId) {
        setFavourite(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/account/favourites', FETCH_OPTIONS);
        if (!active) return;

        if (response.status === 401) {
          setFavourite(false);
          setStatusMessage('Sign in to save favourites.');
          setStatusTone('info');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load favourites');
        }

        const data = await response.json();
        if (!active) return;

        setFavourite(Array.isArray(data) && data.some((item) => item?.propertyId === propertyId));
        setStatusMessage('');
        setStatusTone('idle');
      } catch (error) {
        if (!active) return;
        console.warn('Unable to load favourites', error);
        setFavourite(false);
        setStatusMessage('We could not load your favourites.');
        setStatusTone('error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFavourite();

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (statusTone === 'success') {
      resetTimerRef.current = setTimeout(() => {
        setStatusTone('idle');
        setStatusMessage('');
      }, 3000);
    }

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [statusTone]);

  const toggleFavourite = async () => {
    if (!propertyId || updating || loading) {
      return;
    }

    const shouldFavourite = !favourite;
    setFavourite(shouldFavourite);
    setUpdating(true);
    setStatusTone('info');
    setStatusMessage(shouldFavourite ? 'Saving to favourites…' : 'Removing favourite…');

    try {
      const response = await fetch('/api/account/favourites', {
        method: shouldFavourite ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      });

      if (response.status === 401) {
        throw new Error('auth');
      }

      if (!response.ok) {
        throw new Error('request_failed');
      }

      setStatusTone('success');
      setStatusMessage(shouldFavourite ? 'Added to favourites.' : 'Removed from favourites.');
    } catch (error) {
      console.error('Unable to update favourites', error);
      setFavourite(!shouldFavourite);
      if (error instanceof Error && error.message === 'auth') {
        setStatusTone('error');
        setStatusMessage('Please sign in to manage favourites.');
      } else {
        setStatusTone('error');
        setStatusMessage('We could not update your favourites. Try again.');
      }
    } finally {
      setUpdating(false);
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
    <div className="favorite-button-wrapper">
      <button
        className={classNames}
        onClick={toggleFavourite}
        aria-pressed={favourite}
        type="button"
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        disabled={updating || loading}
      >
        {iconOnly ? (
          favourite ? (
            <FaHeart aria-hidden="true" />
          ) : (
            <FaRegHeart aria-hidden="true" />
          )
        ) : updating || loading ? (
          'Saving…'
        ) : (
          buttonText
        )}
      </button>
      {statusMessage ? (
        <p
          role={statusTone === 'error' ? 'alert' : 'status'}
          className={`favorite-button-feedback favorite-button-feedback-${statusTone}`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
