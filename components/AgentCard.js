import { useEffect, useMemo, useState } from 'react';
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

function normalizeTestimonialEntry(entry) {
  if (entry == null) {
    return null;
  }

  if (typeof entry === 'string') {
    const quote = normalizeString(entry);
    return quote ? { quote, attribution: null, role: null } : null;
  }

  if (typeof entry !== 'object') {
    return null;
  }

  const quote =
    normalizeString(entry.quote) ||
    normalizeString(entry.testimonial) ||
    normalizeString(entry.text) ||
    normalizeString(entry.statement) ||
    normalizeString(entry.snippet) ||
    normalizeString(entry.review) ||
    normalizeString(entry.body) ||
    null;

  if (!quote) {
    return null;
  }

  const attribution =
    normalizeString(entry.attribution) ||
    normalizeString(entry.source) ||
    normalizeString(entry.name) ||
    normalizeString(entry.author) ||
    normalizeString(entry.byline) ||
    normalizeString(entry.reviewer) ||
    normalizeString(entry.from) ||
    null;

  const role =
    normalizeString(entry.role) ||
    normalizeString(entry.title) ||
    normalizeString(entry.position) ||
    normalizeString(entry.context) ||
    normalizeString(entry.meta) ||
    null;

  return {
    quote,
    attribution,
    role,
  };
}

function normalizeTestimonialsCollection(value) {
  const normalized = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const entry = normalizeTestimonialEntry(item);
      if (entry) {
        normalized.push(entry);
      }
    }
    return normalized;
  }

  const single = normalizeTestimonialEntry(value);
  if (single) {
    normalized.push(single);
  }
  return normalized;
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

export default function AgentCard({ agent, className, testimonials: testimonialsProp }) {
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
  const rawReviewAttribution =
    normalizeString(agent.reviewAttribution) ||
    normalizeString(agent.reviewSource) ||
    null;
  const displayAttribution = formatAttribution(rawReviewAttribution) || null;

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

  const normalizedTestimonials = useMemo(() => {
    const normalized = [];
    const apply = (value) => {
      const entries = normalizeTestimonialsCollection(value);
      if (entries.length > 0) {
        normalized.push(...entries);
      }
    };

    if (testimonialsProp !== undefined) {
      apply(testimonialsProp);
    } else if (agent) {
      apply(agent.testimonials);
      apply(agent.testimonial);
      apply(agent.reviews);
      apply(agent.quotes);
    }

    return normalized;
  }, [agent, testimonialsProp]);

  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  useEffect(() => {
    if (normalizedTestimonials.length === 0) {
      setActiveTestimonialIndex(0);
      return;
    }

    setActiveTestimonialIndex((current) =>
      current < normalizedTestimonials.length ? current : 0
    );
  }, [normalizedTestimonials]);

  const activeTestimonial =
    normalizedTestimonials.length > 0
      ? normalizedTestimonials[activeTestimonialIndex]
      : null;

  const testimonialAttribution = activeTestimonial
    ? formatAttribution(activeTestimonial.attribution)
    : null;

  const handlePreviousTestimonial = () => {
    if (normalizedTestimonials.length === 0) {
      return;
    }
    setActiveTestimonialIndex((current) =>
      (current - 1 + normalizedTestimonials.length) %
      normalizedTestimonials.length
    );
  };

  const handleNextTestimonial = () => {
    if (normalizedTestimonials.length === 0) {
      return;
    }
    setActiveTestimonialIndex((current) =>
      (current + 1) % normalizedTestimonials.length
    );
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
        {activeTestimonial ? (
          <blockquote className={`${styles.review} agent-card__review`}>
            <p className={`${styles.reviewText} agent-card__reviewText`}>
              {activeTestimonial.quote}
            </p>
            {(testimonialAttribution || activeTestimonial.role) && (
              <footer
                className={`${styles.reviewAttribution} agent-card__reviewAttribution`}
              >
                {testimonialAttribution && <span>{testimonialAttribution}</span>}
                {activeTestimonial.role && (
                  <span
                    className={`${styles.reviewRole} agent-card__reviewRole`}
                  >
                    {activeTestimonial.role}
                  </span>
                )}
              </footer>
            )}
            {normalizedTestimonials.length > 1 && (
              <div
                className={`${styles.testimonialNav} agent-card__testimonialNav`}
              >
                <button
                  type="button"
                  className={`${styles.testimonialButton} agent-card__testimonialButton agent-card__testimonialButton--prev`}
                  onClick={handlePreviousTestimonial}
                  aria-label="View previous testimonial"
                >
                  ‹
                </button>
                <span
                  className={`${styles.testimonialCounter} agent-card__testimonialCounter`}
                  aria-live="polite"
                >
                  {activeTestimonialIndex + 1} / {normalizedTestimonials.length}
                </span>
                <button
                  type="button"
                  className={`${styles.testimonialButton} agent-card__testimonialButton agent-card__testimonialButton--next`}
                  onClick={handleNextTestimonial}
                  aria-label="View next testimonial"
                >
                  ›
                </button>
              </div>
            )}
          </blockquote>
        ) : (
          displayReview && (
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
          )
        )}
      </div>
    </article>
  );
}
