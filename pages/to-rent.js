
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ToRent({ properties }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const filtered = useMemo(() => {
    if (!search) return properties;
    const lower = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower))
    );
  }, [properties, search]);

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
      <PropertyList properties={available} />
      {archived.length > 0 && (
        <>
          <h2>Let Properties</h2>
          <PropertyList properties={archived} />
        </>
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
