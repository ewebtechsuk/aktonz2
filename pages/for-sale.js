
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyList from '../components/PropertyList';
import PropertyMap from '../components/PropertyMap';
import AgentCard from '../components/AgentCard';
import { fetchPropertiesByType } from '../lib/apex27.mjs';
import agentsData from '../data/agents.json';
import styles from '../styles/Home.module.css';

export default function ForSale({ properties, agents }) {
  const router = useRouter();
  const search = typeof router.query.search === 'string' ? router.query.search : '';
  const minPrice =
    router.query.minPrice && !Array.isArray(router.query.minPrice)
      ? Number(router.query.minPrice)
      : null;
  const maxPrice =
    router.query.maxPrice && !Array.isArray(router.query.maxPrice)
      ? Number(router.query.maxPrice)
      : null;
  const bedrooms =
    router.query.bedrooms && !Array.isArray(router.query.bedrooms)
      ? Number(router.query.bedrooms)
      : null;
  const propertyType =
    router.query.propertyType && !Array.isArray(router.query.propertyType)
      ? router.query.propertyType.toLowerCase()
      : null;
  const [viewMode, setViewMode] = useState('list');

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (search) {
        const lower = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(lower) &&
          !(p.description && p.description.toLowerCase().includes(lower))
        ) {
          return false;
        }
      }

      const price = p.price ?? 0;
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;

      const beds = Number(p.bedrooms || 0);
      if (bedrooms !== null && beds < bedrooms) return false;

      if (
        propertyType &&
        (p.propertyType || '').toLowerCase() !== propertyType
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
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button onClick={() => setViewMode('list')} disabled={viewMode === 'list'}>
          List
        </button>{' '}
        <button onClick={() => setViewMode('map')} disabled={viewMode === 'map'}>
          Map
        </button>
      </div>
      {viewMode === 'list' ? (
        <>
          <PropertyList properties={available} />
          {archived.length > 0 && (
            <>
              <h2>Sold Properties</h2>
              <PropertyList properties={archived} />
            </>
          )}
        </>
      ) : (
        <PropertyMap properties={available} />
      )}

      {agents && agents.length > 0 && (
        <section>
          <h2>Our Agents</h2>
          <div className="agent-list">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export async function getStaticProps() {
  const properties = await fetchPropertiesByType('sale', {
    statuses: ['available', 'under_offer', 'sold', 'sold_stc', 'sale_agreed'],

  });

  const agents = agentsData;

  return { props: { properties, agents } };
}
