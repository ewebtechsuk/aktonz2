import Head from 'next/head';
import PropertyList from '../components/PropertyList';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Stats from '../components/Stats';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function Home({ sales, lettings, archiveSales }) {
  return (
    <>
      <Head>
        <title>Property Portal</title>
      </Head>
      <main className={styles.main}>
        <Hero />
        <Features />
        <Stats />
        <section className={styles.listings} id="listings">
          <h2>Featured Sales</h2>
          <PropertyList properties={sales} />
        </section>
        <section className={styles.listings}>
          <h2>Featured Lettings</h2>
          <PropertyList properties={lettings} />
        </section>
        {archiveSales.length > 0 && (
          <section className={styles.listings}>
            <h2>Archive Sales</h2>
            <PropertyList properties={archiveSales} />
          </section>
        )}
      </main>
    </>
  );
}

export async function getStaticProps() {
  const [allSale, allRent] = await Promise.all([
    fetchPropertiesByType('sale', {
      statuses: ['available', 'under_offer', 'sold'],
    }),
    fetchPropertiesByType('rent', {
      statuses: ['available', 'under_offer'],
    }),
  ]);

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const isAvailable = (p) => p.status && normalize(p.status) === 'available';
  const isSold = (p) => p.status && normalize(p.status) === 'sold';

  const sales = allSale
    .filter((p) => isAvailable(p) && p.featured)
    .slice(0, 4);

  const lettings = allRent
    .filter((p) => isAvailable(p) && p.featured)
    .slice(0, 4);

  const archiveSales = allSale.filter(isSold).slice(0, 4);

  return { props: { sales, lettings, archiveSales } };
}
