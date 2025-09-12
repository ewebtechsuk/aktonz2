
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const minPrice = router.query.minPrice ? parseFloat(router.query.minPrice) : null;
  const maxPrice = router.query.maxPrice ? parseFloat(router.query.maxPrice) : null;
  const bedrooms = router.query.bedrooms ? parseInt(router.query.bedrooms, 10) : null;
  const propertyType =
    typeof router.query.propertyType === 'string' ? router.query.propertyType : '';

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return properties.filter((p) => {
      if (search) {
        const inTitle = p.title.toLowerCase().includes(lower);
        const inDesc = p.description && p.description.toLowerCase().includes(lower);
        if (!inTitle && !inDesc) return false;
      }
      if (minPrice != null && p.priceValue != null && p.priceValue < minPrice) return false;
      if (maxPrice != null && p.priceValue != null && p.priceValue > maxPrice) return false;
      if (bedrooms != null && p.bedrooms != null && p.bedrooms < bedrooms) return false;
      if (
        propertyType &&
        p.propertyType &&
        p.propertyType.toLowerCase() !== propertyType.toLowerCase()
      )
        return false;
      return true;
    });
  }, [properties, search, minPrice, maxPrice, bedrooms, propertyType]);

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const isSold = (p) => {
    const status = normalize(p.status || '');
    return status.includes('sold') || status.includes('sale_agreed');
  };
  const available = filtered.filter((p) => !isSold(p));
  const archived = filtered.filter(isSold);


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
    statuses: ['available', 'under_offer', 'sold', 'sold_stc', 'sale_agreed'],

  });

  return { props: { properties } };
}
