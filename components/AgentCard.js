import Link from 'next/link';

const PLACEHOLDER_IMAGE = '/images/agent-placeholder.svg';

function getAgentImage(agent) {
  if (!agent || !agent.photo) {
    return PLACEHOLDER_IMAGE;
  }

  return agent.photo;
}

export default function AgentCard({ agent }) {
  if (!agent) return null;
  const imageSrc = getAgentImage(agent);

  const handleImageError = (event) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackApplied === 'true') {
      return;
    }
    target.dataset.fallbackApplied = 'true';
    target.src = PLACEHOLDER_IMAGE;
  };

  return (
    <div className="agent-card">
      <img
        src={imageSrc}
        alt={agent.name}
        className="agent-photo"
        referrerPolicy="no-referrer"
        onError={handleImageError}
        data-fallback-applied="false"
      />
      <h3>
        <Link href={`/agents/${agent.id}`}>{agent.name}</Link>
      </h3>
      {agent.phone && (
        <p>
          <a href={`tel:${agent.phone}`}>{agent.phone}</a>
        </p>
      )}
    </div>
  );
}
