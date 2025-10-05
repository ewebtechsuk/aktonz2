import PropertyList from '../../components/PropertyList';
import agents from '../../data/agents.json';
import { fetchProperties } from '../../lib/apex27.mjs';

const PLACEHOLDER_IMAGE = '/images/agent-placeholder.svg';

function resolveAgentImage(agent) {
  if (!agent || !agent.photo) {
    return PLACEHOLDER_IMAGE;
  }

  return agent.photo;
}

export default function AgentPage({ agent, listings }) {
  if (!agent) {
    return (
      <main>
        <h1>Agent not found</h1>
      </main>
    );
  }

  const photoSrc = resolveAgentImage(agent);

  const handleImageError = (event) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackApplied === 'true') {
      return;
    }
    target.dataset.fallbackApplied = 'true';
    target.src = PLACEHOLDER_IMAGE;
  };

  return (
    <main>
      <img
        src={photoSrc}
        alt={agent.name}
        style={{ maxWidth: 'var(--size-avatar)' }}
        onError={handleImageError}
        data-fallback-applied="false"
      />
      <h1>{agent.name}</h1>
      {agent.bio && <p>{agent.bio}</p>}
      {agent.phone && (
        <p>
          <a href={`tel:${agent.phone}`}>{agent.phone}</a>
        </p>
      )}
      {listings && listings.length > 0 && (
        <section>
          <h2>Active Listings</h2>
          <PropertyList properties={listings} />
        </section>
      )}
    </main>
  );
}

export async function getStaticPaths() {
  const paths = agents.map((a) => ({ params: { id: String(a.id) } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const agent = agents.find((a) => String(a.id) === String(params.id)) || null;

  const allProperties = await fetchProperties();
  const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, '_');
  const listings = allProperties.filter((p) => {
    if (p.agentId !== params.id) return false;
    const status = normalize(p.status || '');
    return !(
      status.startsWith('sold') ||
      status.startsWith('let') ||
      status.includes('sale_agreed') ||
      status.includes('let_agreed')
    );
  });

  return { props: { agent, listings } };
}
