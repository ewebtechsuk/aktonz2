import { useEffect, useState } from 'react';
import { fetchNeighborhood } from '../lib/neighborhood.mjs';
import styles from '../styles/PropertyDetails.module.css';

export default function NeighborhoodInfo({ lat, lng }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchNeighborhood(lat, lng);
        if (active) setInfo(data);
      } catch (err) {
        if (active) setError(err);
      }
    }
    if (lat != null && lng != null) {
      load();
    }
    return () => {
      active = false;
    };
  }, [lat, lng]);

  if (lat == null || lng == null) return null;

  return (
    <section className={styles.neighborhood}>
      <h2>Neighborhood information</h2>
      {error && <p>Could not load neighborhood info.</p>}
      {!error && !info && <p>Loading...</p>}
      {info && (
        <div>
          {info.city && <p>Nearest City: {info.city}</p>}
          {info.locality && <p>Locality: {info.locality}</p>}
          {info.principalSubdivision && (
            <p>Region: {info.principalSubdivision}</p>
          )}
        </div>
      )}
    </section>
  );
}
