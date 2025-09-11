import { useState } from 'react';
import Link from 'next/link';

import { fetchSearchRegions } from '../../lib/apex27.mjs';
import styles from '../../styles/AreaGuides.module.css';

export default function AreaGuides({ regions }) {
  const [open, setOpen] = useState({});
  const toggle = (id) => setOpen((s) => ({ ...s, [id]: !s[id] }));


  return (
    <main className={styles.main}>
      <h1>Area Guides</h1>
      {regions.map((region) => (
        <section key={region.id} className={styles.region}>
          <div className={styles.regionHeader}>
            {region.children && region.children.length > 0 && (
              <button
                aria-label={open[region.id] ? 'Collapse' : 'Expand'}
                className={styles.toggle}
                onClick={() => toggle(region.id)}
              >
                {open[region.id] ? '−' : '+'}
              </button>
            )}
            <h2 className={styles.regionTitle}>{region.name}</h2>
          </div>
          {open[region.id] && region.children && region.children.length > 0 && (
            <ul className={styles.subAreas}>
              {region.children.map((sub) => (
                <li key={sub.id}>
                  <Link href={`/area-guides/${sub.slug}`}>{sub.name}</Link>
                </li>

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
