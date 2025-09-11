import PropertyList from '../components/PropertyList';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Stats from '../components/Stats';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function Home({ properties }) {
  return (
    <main className={styles.main}>
      <Hero />
      <Features />
      <Stats />
      <section className={styles.listings} id="listings">
        <h2>Featured Sales</h2>
        <PropertyList properties={properties} />
      </section>
    </main>
  );
}

export async function getStaticProps() {
  const allSale = await fetchPropertiesByType('sale');
  const allowed = ['available', 'under_offer', 'sold'];
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const sale = allSale.filter(
    (p) => p.status && allowed.includes(normalize(p.status))
  );
  const properties = sale.filter((p) => p.featured);
  return { props: { properties } };
}
