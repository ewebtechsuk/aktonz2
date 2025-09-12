
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import PropertyMap from '../components/PropertyMap';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ToRent({ properties }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const [viewMode, setViewMode] = useState('list');

  const filtered = useMemo(() => {
    let list = properties;
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          (p.description && p.description.toLowerCase().includes(lower))
      );
    }
    if (minPrice != null) {
      list = list.filter((p) => p.priceValue != null && p.priceValue >= minPrice);
    }
    if (maxPrice != null) {
      list = list.filter((p) => p.priceValue != null && p.priceValue <= maxPrice);
    }
    if (bedrooms != null) {
      list = list.filter((p) => p.bedrooms != null && p.bedrooms >= bedrooms);
    }
    if (propertyType) {
      list = list.filter(
        (p) =>
          p.propertyType && p.propertyType.toLowerCase() === propertyType
      );
    }
    return list;
  }, [properties, search, minPrice, maxPrice, bedrooms, propertyType]);

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const available = filtered.filter(
    (p) => !p.status || !normalize(p.status).startsWith('let')
  );
  const archived = filtered.filter(
    (p) => p.status && normalize(p.status).startsWith('let')
  );

  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Properties to Rent'}</h1>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setViewMode('list')} disabled={viewMode === 'list'}>
          List
        </button>{' '}
        <button onClick={() => setViewMode('map')} disabled={viewMode === 'map'}>
          Map
        </button>
      </div>
      {viewMode === 'list' ? (
        <>
          <PropertyList properties={available} />
          {archived.length > 0 && (
            <>
              <h2>Let Properties</h2>
              <PropertyList properties={archived} />
            </>
          )}
        </>
      ) : (
        <PropertyMap properties={available} />
      )}
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchPropertiesByType('rent', {
    statuses: ['available', 'under_offer', 'let_agreed', 'let', 'let_stc', 'let_by'],

  });
  return { props: { properties } };
}
