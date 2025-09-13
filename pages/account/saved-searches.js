import { useEffect, useState } from 'react';

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

  if (loading) return <p>Loading...</p>;

  if (searches.length === 0) return <p>No saved searches</p>;

  return (
    <div>
      <h1>Saved Searches</h1>
      <ul>
        {searches.map((s) => (
          <li key={s.id}>
            <code>{JSON.stringify(s.params)}</code>
            <button onClick={() => handleDelete(s.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
