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
    </main>
  );
}

export async function getStaticPaths() {
  const regions = await fetchSearchRegions();
  const paths = [];
  const traverse = (nodes, isRoot = true) => {
    nodes.forEach((node) => {
      if (!isRoot) {
        paths.push({ params: { slug: node.slug } });
      }
      if (node.children && node.children.length) {
        traverse(node.children, false);
      }
    });
  };
  traverse(regions, true);
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
