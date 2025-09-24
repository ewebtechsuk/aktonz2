import { useEffect, useState } from 'react';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByTypeCachedFirst } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

export default function Favourites({ properties }) {
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ids = JSON.parse(localStorage.getItem('favourites') || '[]');
      const list = properties.filter((p) => ids.includes(p.id));
      setFavourites(list);
    } catch {
      setFavourites([]);
    }
  }, [properties]);

  return (
    <main className={styles.main}>
      <h1>Favourite Properties</h1>
      {favourites.length > 0 ? (
        <PropertyList properties={favourites} />
      ) : (
        <p>No favourite properties saved.</p>
      )}
    </main>
  );
}

export async function getStaticProps() {
  const sale = await fetchPropertiesByTypeCachedFirst('sale', {
    statuses: ['available', 'under_offer', 'sold'],
  });
  const rent = await fetchPropertiesByTypeCachedFirst('rent', {
    statuses: ['available', 'under_offer', 'let_agreed', 'let'],
  });
  const properties = [...sale.slice(0, 20), ...rent.slice(0, 20)];
  return { props: { properties } };
}
