import PropertyList from '../../components/PropertyList';
import { fetchProperties } from '../../lib/apex27.mjs';
import styles from '../../styles/Home.module.css';

export default function PropertyArchive({ properties }) {
  return (
    <main className={styles.main}>
      <h1>All Properties</h1>
      <PropertyList properties={properties} />
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchProperties();
  return { props: { properties } };
}
