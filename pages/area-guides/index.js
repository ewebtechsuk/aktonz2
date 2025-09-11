import { fetchSearchRegions } from '../../lib/apex27.mjs';
import styles from '../../styles/AreaGuides.module.css';

export default function AreaGuides({ regions }) {
  return (
    <main className={styles.main}>
      <h1>Area Guides</h1>
      {regions.map((region) => (
        <section key={region.id} className={styles.region}>
          <h2>{region.name}</h2>
          {region.children && region.children.length > 0 && (
            <ul className={styles.subAreas}>
              {region.children.map((sub) => (
                <li key={sub.id}>{sub.name}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {regions.length === 0 && <p>No regions available.</p>}
    </main>
  );
}

export async function getStaticProps() {
  const regions = await fetchSearchRegions();
  return { props: { regions } };
}
