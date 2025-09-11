import PropertyList from '../components/PropertyList';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Stats from '../components/Stats';
import { fetchPropertiesByType } from '../lib/apex27';
import styles from '../styles/Home.module.css';

export default function Home({ properties }) {
  return (
    <main className={styles.main}>
      <Hero />
      <Features />
      <Stats />
      <section className={styles.listings} id="listings">
        <h2>Featured Lettings</h2>
        <PropertyList properties={properties} />
      </section>
    </main>
  );
}

export async function getStaticProps() {
  const allRent = await fetchPropertiesByType('rent');
  const properties = allRent.filter((p) => p.featured);
  return { props: { properties } };
}
