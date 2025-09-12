import { useEffect, useState } from 'react';
import PropertyList from '../components/PropertyList';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
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
  const [sale, rent] = await Promise.all([
    fetchPropertiesByType('sale', {
      statuses: ['available', 'under_offer', 'sold'],
    }),
    fetchPropertiesByType('rent', {
      statuses: ['available', 'under_offer', 'let_agreed', 'let'],
    }),
  ]);
  const properties = [...sale, ...rent];
  return { props: { properties } };
}
