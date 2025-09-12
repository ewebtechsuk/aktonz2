import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function Archive({ sales, lettings }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';

  const filter = (list) => {
    if (!search) return list;
    const lower = search.toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower))
    );
  };

  const filteredSales = useMemo(() => filter(sales), [sales, search]);
  const filteredLettings = useMemo(() => filter(lettings), [lettings, search]);

  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Archived Listings'}</h1>
      {filteredSales.length > 0 && (
        <>
          <h2>Sold Properties</h2>
          <PropertyList properties={filteredSales} />
        </>
      )}
      {filteredLettings.length > 0 && (
        <>
          <h2>Let Properties</h2>
          <PropertyList properties={filteredLettings} />
        </>
      )}
    </main>
  );
}

export async function getStaticProps() {
  const [sales, lettings] = await Promise.all([
    fetchPropertiesByType('sale', { statuses: ['sold'] }),
    fetchPropertiesByType('rent', { statuses: ['let', 'let_agreed'] }),
  ]);
  return { props: { sales, lettings } };
}
