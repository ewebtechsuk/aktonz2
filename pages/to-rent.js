
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import PropertyMap from '../components/PropertyMap';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ToRent({ properties }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const minPrice =
    router.query.minPrice && !Array.isArray(router.query.minPrice)
      ? Number(router.query.minPrice)
      : null;
  const maxPrice =
    router.query.maxPrice && !Array.isArray(router.query.maxPrice)
      ? Number(router.query.maxPrice)
      : null;
  const bedrooms =
    router.query.bedrooms && !Array.isArray(router.query.bedrooms)
      ? Number(router.query.bedrooms)
      : null;
  const propertyType =
    router.query.propertyType && !Array.isArray(router.query.propertyType)
      ? router.query.propertyType.toLowerCase()
      : null;
  const [viewMode, setViewMode] = useState('list');
  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (search) {
        const lower = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(lower) &&
          !(p.description && p.description.toLowerCase().includes(lower))
        ) {
          return false;
        }
      }

      const price = p.price ?? 0;
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;

      const beds = Number(p.bedrooms || 0);
      if (bedrooms !== null && beds < bedrooms) return false;

      if (
        propertyType &&
        (p.propertyType || '').toLowerCase() !== propertyType
      )
        return false;

      return true;
    });

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
      <div className={styles.viewModeControls}>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          disabled={viewMode === 'list'}
        >
          List
        </button>{' '}
        <button
          type="button"
          onClick={() => setViewMode('map')}
          disabled={viewMode === 'map'}
        >
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
  const raw = await fetchPropertiesByType('rent', {
    statuses: ['available', 'under_offer', 'let_agreed', 'let', 'let_stc', 'let_by'],

  });

  const properties = raw.slice(0, 50).map((p) => ({
    ...p,
    images: (p.images || []).slice(0, 3),
    description: p.description ? p.description.slice(0, 200) : '',
  }));

  return { props: { properties } };
}
