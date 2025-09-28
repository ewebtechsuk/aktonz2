import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const FETCH_OPTIONS = { credentials: 'include' };

export default function SaveSearchButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('idle');
  const [searches, setSearches] = useState([]);

  const loadSearches = useCallback(async () => {
    try {
      const response = await fetch('/api/save-search', FETCH_OPTIONS);
      if (response.status === 401) {
        setSearches([]);
        setStatusTone('error');
        setStatusMessage('Sign in to save searches.');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load searches');
      }
      const data = await response.json();
      setSearches(Array.isArray(data) ? data : []);
      setStatusTone('idle');
      setStatusMessage('');
    } catch (error) {
      console.warn('Unable to load saved searches', error);
      setStatusTone('error');
      setStatusMessage('We could not load your saved searches.');
    }
  }, []);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  useEffect(() => {
    if (statusTone === 'success') {
      const timeout = setTimeout(() => {
        setStatusTone('idle');
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [statusTone]);

  async function handleSave() {
    if (saving) return;

    const params = router.query || {};
    const paramsSignature = JSON.stringify(params || {});
    const alreadySaved = Array.isArray(searches)
      ? searches.some((entry) => JSON.stringify(entry?.params || {}) === paramsSignature)
      : false;

    if (alreadySaved) {
      setStatusTone('info');
      setStatusMessage('You have already saved this search.');
      return;
    }

    setSaving(true);
    setStatusTone('info');
    setStatusMessage('Saving your search…');

    try {
      const response = await fetch('/api/save-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        throw new Error('auth');
      }

      if (!response.ok) {
        throw new Error('request_failed');
      }

      const entry = await response.json();
      setSearches((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const filtered = existing.filter((item) => item?.id !== entry?.id);
        return [...filtered, entry];
      });
      setStatusTone('success');
      setStatusMessage('Search saved.');
    } catch (error) {
      console.error('Unable to save search', error);
      if (error instanceof Error && error.message === 'auth') {
        setStatusTone('error');
        setStatusMessage('Please sign in to save searches.');
      } else {
        setStatusTone('error');
        setStatusMessage('We could not save your search. Try again.');
      }
    } finally {
      setSaving(false);
      try {
        await loadSearches();
      } catch (reloadError) {
        console.warn('Failed to refresh saved searches', reloadError);
      }
    }
  }

  return (
    <div className="save-search-button">
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save search'}
      </button>
      {statusMessage ? (
        <p
          role={statusTone === 'error' ? 'alert' : 'status'}
          className={`save-search-feedback save-search-feedback-${statusTone}`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
