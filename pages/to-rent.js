import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ToRent({ properties }) {
  return (
    <main className={styles.main}>
      <h1>Properties to Rent</h1>
      <PropertyList properties={properties} />
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchPropertiesByType('rent');
  return { props: { properties } };
}
