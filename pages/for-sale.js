
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const minPrice =
    typeof router.query.minPrice === 'string'
      ? parseFloat(router.query.minPrice)
      : null;
  const maxPrice =
    typeof router.query.maxPrice === 'string'
      ? parseFloat(router.query.maxPrice)
      : null;
  const bedrooms =
    typeof router.query.bedrooms === 'string'
      ? parseInt(router.query.bedrooms, 10)
      : null;
  const propertyType =
    typeof router.query.propertyType === 'string'
      ? router.query.propertyType.toLowerCase()
      : '';

  const filtered = useMemo(() => {
    let list = properties;
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          (p.description && p.description.toLowerCase().includes(lower))
      );
    }
    if (minPrice != null) {
      list = list.filter((p) => p.priceValue != null && p.priceValue >= minPrice);
    }
    if (maxPrice != null) {
      list = list.filter((p) => p.priceValue != null && p.priceValue <= maxPrice);
    }
    if (bedrooms != null) {
      list = list.filter((p) => p.bedrooms != null && p.bedrooms >= bedrooms);
    }
    if (propertyType) {
      list = list.filter(
        (p) =>
          p.propertyType && p.propertyType.toLowerCase() === propertyType
      );
    }
    return list;
  }, [properties, search, minPrice, maxPrice, bedrooms, propertyType]);

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const available = filtered.filter(
    (p) => !p.status || normalize(p.status) !== 'sold'
  );
  const archived = filtered.filter(
    (p) => p.status && normalize(p.status) === 'sold'
  );

  return (
    <main className={styles.main}>
      <h1>{search ? `Search results for "${search}"` : 'Properties for Sale'}</h1>
      <PropertyList properties={available} />
      {archived.length > 0 && (
        <>
          <h2>Sold Properties</h2>
          <PropertyList properties={archived} />
        </>
      )}
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchPropertiesByType('sale', {
    statuses: ['available', 'under_offer', 'sold'],
  });

  return { props: { properties } };
}
