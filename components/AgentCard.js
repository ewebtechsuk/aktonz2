import styles from './AgentCard.module.css';

const PLACEHOLDER_IMAGE = '/images/agent-placeholder.svg';

function normalizeString(value) {
  if (value == null) return null;
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function formatAttribution(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const cleaned = normalized.replace(/^[-–—\s]+/, '').trim();
  if (!cleaned) {
    return null;
  }
  return `— ${cleaned}`;
}

function getAgentImage(agent) {
  if (!agent || typeof agent !== 'object') {
    return PLACEHOLDER_IMAGE;
  }

  const candidates = [
    agent.photo,
    agent.image,
    agent.avatar,
    agent.avatarUrl,
    agent.profilePhoto,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return PLACEHOLDER_IMAGE;
}

export default function AgentCard({ agent, className }) {
  if (!agent) return null;

  const imageSrc = getAgentImage(agent);
  const displayTitle =
    normalizeString(agent.title) || 'Your Aktonz property expert';
  const displayName = normalizeString(agent.name) || 'Aktonz advisor';
  const displayRole =
    normalizeString(agent.jobTitle) || normalizeString(agent.role);
  const displaySla =
    normalizeString(agent.responseSla) ||
    normalizeString(agent.responseSLA) ||
    'Replies within 15 minutes during business hours.';
  const displayReview =
    normalizeString(agent.reviewSnippet) ||
    normalizeString(agent.reviewQuote) ||
    null;
  const displayAttribution =
    formatAttribution(
      normalizeString(agent.reviewAttribution) ||
        normalizeString(agent.reviewSource)
    ) || null;

  const rootClassName = [styles.card, 'agent-card', className]
    .filter(Boolean)
    .join(' ');

  const handleImageError = (event) => {
    const target = event.currentTarget;
    if (target.dataset.fallbackApplied === 'true') {
      return;
    }
    target.dataset.fallbackApplied = 'true';
    target.src = PLACEHOLDER_IMAGE;
  };

  return (
    <article className={rootClassName}>
      <div className={`${styles.media} agent-card__media`}>
        <img
          src={imageSrc}
          alt={displayName}
          className={`${styles.image} agent-card__image`}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          data-fallback-applied="false"
          loading="lazy"
        />
      </div>
      <div className={`${styles.content} agent-card__content`}>
        {displayTitle && (
          <p className={`${styles.eyebrow} agent-card__eyebrow`}>
            {displayTitle}
          </p>
        )}
        <h3 className={`${styles.name} agent-card__name`}>{displayName}</h3>
        {displayRole && (
          <p className={`${styles.role} agent-card__role`}>{displayRole}</p>
        )}
        {displaySla && (
          <p className={`${styles.sla} agent-card__sla`}>{displaySla}</p>
        )}
        {displayReview && (
          <blockquote className={`${styles.review} agent-card__review`}>
            <p className={`${styles.reviewText} agent-card__reviewText`}>
              {displayReview}
            </p>
            {displayAttribution && (
              <footer
                className={`${styles.reviewAttribution} agent-card__reviewAttribution`}
              >
                {displayAttribution}
              </footer>
            )}
          </blockquote>
        )}
      </div>
    </article>
  );
}
