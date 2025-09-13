import Link from 'next/link';

export default function AgentCard({ agent }) {
  if (!agent) return null;
  return (
    <div className="agent-card">
      {agent.photo && (
        <img
          src={agent.photo}
          alt={agent.name}
          className="agent-photo"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      )}
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
