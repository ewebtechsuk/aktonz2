import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27';
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
  const properties = await fetchPropertiesByType('sale');
  return { props: { properties } };
}
