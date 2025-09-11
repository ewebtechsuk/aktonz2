import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties }) {
  return (
    <main className={styles.main}>
      <h1>Properties for Sale</h1>
      <PropertyList properties={properties} />
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
