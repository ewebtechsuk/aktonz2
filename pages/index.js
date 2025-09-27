import Head from 'next/head';
import PropertyList from '../components/PropertyList';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Stats from '../components/Stats';
import { fetchPropertiesByTypeCachedFirst } from '../lib/apex27.mjs';
import styles from '../styles/Home.module.css';

const FEATURED_COUNT = 5;

function extractRoadName(property) {
  if (!property || typeof property !== 'object') {
    return null;
  }

  const displayAddress =
    typeof property.displayAddress === 'string'
      ? property.displayAddress.split(',')[0]
      : null;

  const candidates = [property.address2, displayAddress, property.address1];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function createCardKeyBase(property, fallback = 'property') {
  const candidates = [
    property?.id,
    property?.listingId,
    property?.listing_id,
    property?.reference,
    property?.fullReference,
    property?.slug,
    property?.title,
    property?.displayAddress,
    property?.address1,
  ];

  for (const candidate of candidates) {
    if (candidate != null) {
      const str = String(candidate).trim();
      if (str) {
        return str.replace(/\s+/g, '-');
      }
    }
  }

  return fallback;
}

function clonePropertiesForDisplay(selected, sourcePool, targetCount) {
  if (!Array.isArray(sourcePool) || sourcePool.length === 0) {
    return [];
  }

  const clones = [];
  const baseSelection = Array.isArray(selected) && selected.length > 0 ? selected : sourcePool;
  const initial = baseSelection.slice(0, Math.min(baseSelection.length, targetCount));

  initial.forEach((property, index) => {
    const keyBase = createCardKeyBase(property, `property-${index}`);
    clones.push({ ...property, _cardKey: `${keyBase}-card-${index}` });
  });

  let nextIndex = clones.length;
  while (clones.length < targetCount) {
    const source = sourcePool[nextIndex % sourcePool.length];
    const keyBase = createCardKeyBase(source, `property-${nextIndex}`);
    clones.push({ ...source, _cardKey: `${keyBase}-card-${nextIndex}` });
    nextIndex += 1;
  }

  return clones;
}

function selectPropertiesOnSameRoad(properties, targetCount = FEATURED_COUNT) {
  if (!Array.isArray(properties) || properties.length === 0) {
    return [];
  }

  const roadGroups = new Map();

  for (const property of properties) {
    const road = extractRoadName(property);
    if (!road) {
      continue;
    }
    const key = road.toLowerCase();
    if (!roadGroups.has(key)) {
      roadGroups.set(key, { road, items: [] });
    }
    roadGroups.get(key).items.push(property);
  }

  const grouped = Array.from(roadGroups.values()).sort(
    (a, b) => b.items.length - a.items.length,
  );

  const preferredGroup =
    grouped.find((group) => group.items.length >= targetCount) ?? grouped[0];

  const sourcePool = preferredGroup ? preferredGroup.items : properties;

  return clonePropertiesForDisplay(preferredGroup?.items, sourcePool, targetCount);
}

export default function Home({ sales, lettings, archiveSales }) {
  return (
    <>
      <Head>
        <title>Property Portal</title>
      </Head>
      <main className={styles.main}>
        <Hero />
        <Features />
        <Stats />
        <section className={styles.listings} id="listings">
          <h2>Featured Sales</h2>
          <PropertyList properties={sales} />
        </section>
        <section className={styles.listings}>
          <h2>Featured Lettings</h2>
          <PropertyList properties={lettings} />
        </section>
        {archiveSales.length > 0 && (
          <section className={styles.listings}>
            <h2>Archive Sales</h2>
            <PropertyList properties={archiveSales} />
          </section>
        )}
      </main>
    </>
  );
}

export async function getStaticProps() {
  const [allSale, allRent] = await Promise.all([
    fetchPropertiesByTypeCachedFirst('sale', {
      statuses: ['available', 'under_offer', 'sold'],
    }),
    fetchPropertiesByTypeCachedFirst('rent', {
      statuses: ['available'],
    }),
  ]);

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, '_');
  const isAvailable = (p) => p.status && normalize(p.status) === 'available';
  const isSold = (p) => p.status && normalize(p.status) === 'sold';

  const availableSales = allSale.filter((p) => isAvailable(p) && p.featured);
  const availableLettings = allRent.filter((p) => isAvailable(p) && p.featured);

  const sales = selectPropertiesOnSameRoad(availableSales, FEATURED_COUNT);
  const lettings = selectPropertiesOnSameRoad(availableLettings, FEATURED_COUNT);

  const archiveSales = allSale.filter(isSold).slice(0, FEATURED_COUNT);

  return { props: { sales, lettings, archiveSales } };
}
