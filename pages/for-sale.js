import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties }) {
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

  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Properties for Sale'}</h1>
      <PropertyList properties={filtered} />
    </main>
  );
}

export async function getStaticProps() {
  const allSale = await fetchPropertiesByType('sale');
  const allowed = ['available', 'under_offer', 'sold'];
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const properties = allSale.filter(
    (p) => p.status && allowed.includes(normalize(p.status))
  );

  return { props: { properties } };
}
