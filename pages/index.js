import PropertyList from '../components/PropertyList';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import { fetchProperties } from '../lib/apex27';
import styles from '../styles/Home.module.css';

export default function Home({ properties }) {
  return (
    <main className={styles.main}>
      <Hero />
      <Stats />
      <section className={styles.listings}>
        <h2>Latest Properties</h2>
        <PropertyList properties={properties} />
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  const properties = await fetchProperties();
  return { props: { properties } };
}
