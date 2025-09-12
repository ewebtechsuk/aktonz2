import { useRouter } from 'next/router';

export default function SaveSearchButton() {
  const router = useRouter();

  async function handleSave() {
    const params = router.query;

    try {
      const res = await fetch('/api/save-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Request failed');
    } catch (err) {
      // Fallback to localStorage if API request fails
      try {
        const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
        saved.push({ id: Date.now().toString(), params });
        localStorage.setItem('savedSearches', JSON.stringify(saved));
      } catch (storageErr) {
        console.error('Failed to save search', storageErr);
      }
    }
  }

  return (
    <button type="button" onClick={handleSave}>
      Save search
    </button>
  );
}
