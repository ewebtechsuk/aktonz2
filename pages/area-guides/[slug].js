import Link from 'next/link';

import { fetchSearchRegions } from '../../lib/apex27.mjs';
import styles from '../../styles/AreaGuides.module.css';

export default function AreaGuide({ region }) {
  if (!region) {
    return (
      <main className={styles.main}>
        <p>Area not found.</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1>{region.name}</h1>
      {region.description && <p>{region.description}</p>}
      {region.children && region.children.length > 0 && (
        <ul className={styles.subAreas}>
          {region.children.map((sub) => (
            <li key={sub.id}>
              <Link href={`/area-guides/${sub.slug}`}>{sub.name}</Link>
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}

export async function getStaticPaths() {
  const regions = await fetchSearchRegions();
  const paths = [];
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      paths.push({ params: { slug: node.slug } });
      if (node.children && node.children.length) {
        traverse(node.children);
      }
    });
  };
  traverse(regions);

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const regions = await fetchSearchRegions();
  let found = null;
  const find = (nodes) => {
    for (const node of nodes) {
      if (node.slug === params.slug) {
        found = node;
        return;
      }
      if (node.children && node.children.length) {
        find(node.children);
      }
    }
  };
  find(regions);
  if (!found) {
    return { notFound: true };
  }
  return { props: { region: found } };
}
