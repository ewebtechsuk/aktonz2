import Image from 'next/image';
import Link from 'next/link';

export default function AgentCard({ agent }) {
  if (!agent) return null;
  return (
    <div className="agent-card">
      {agent.photo && (
        <Image
          src={agent.photo}
          alt={agent.name}
          width={160}
          height={160}
          className="agent-photo"
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: 'var(--size-avatar)',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          sizes="(max-width: 600px) 120px, 150px"
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
