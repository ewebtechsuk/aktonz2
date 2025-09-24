import PropertyList from '../../components/PropertyList';
import { fetchPropertiesByTypeCachedFirst } from '../../lib/apex27.mjs';
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
  const [sale, rent] = await Promise.all([
    fetchPropertiesByTypeCachedFirst('sale', {
      statuses: ['available', 'under_offer', 'sold'],
    }),
    fetchPropertiesByTypeCachedFirst('rent'),
  ]);

  const allowedSale = ['available', 'under_offer', 'sold'];
  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const saleFiltered = sale.filter(
    (p) => p.status && allowedSale.includes(normalize(p.status))
  );

  const properties = [...saleFiltered, ...rent];
  return { props: { properties } };
}
