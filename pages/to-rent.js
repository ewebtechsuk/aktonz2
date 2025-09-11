import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ToRent({ properties, search }) {
  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Properties to Rent'}</h1>
      <PropertyList properties={properties} />
    </main>
  );
}

export async function getServerSideProps({ query }) {
  let properties = await fetchPropertiesByType('rent');
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
