import { useState, useEffect } from 'react';

export default function CompareButton({ propertyId }) {
  const [isCompared, setIsCompared] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const list = JSON.parse(localStorage.getItem('compareList')) || [];
    setIsCompared(list.includes(propertyId));
  }, [propertyId]);

  const toggleCompare = () => {
    if (typeof window === 'undefined') return;
    const list = JSON.parse(localStorage.getItem('compareList')) || [];
    if (list.includes(propertyId)) {
      const updated = list.filter((id) => id !== propertyId);
      localStorage.setItem('compareList', JSON.stringify(updated));
      setIsCompared(false);
    } else {
      list.push(propertyId);
      localStorage.setItem('compareList', JSON.stringify(list));
      setIsCompared(true);
    }
  };

  return (
    <button onClick={toggleCompare} className="compare-button">
      {isCompared ? 'Remove' : 'Compare'}
    </button>
  );
}
