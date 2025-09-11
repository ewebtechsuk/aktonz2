import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties, search }) {
  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Properties for Sale'}</h1>
      <PropertyList properties={properties} />
    </main>
  );
}

export async function getServerSideProps({ query }) {
  const allSale = await fetchPropertiesByType('sale');
  const allowed = ['available', 'under_offer', 'sold'];
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  let properties = allSale.filter(
    (p) => p.status && allowed.includes(normalize(p.status))
  );

  const search = query.search ? String(query.search) : '';
  if (search) {
    const lower = search.toLowerCase();
    properties = properties.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower))
    );
  }

  return { props: { properties, search } };
}
