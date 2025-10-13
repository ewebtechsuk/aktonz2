import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminContactDetails.module.css';

const STAGE_TONE_CLASS = {
  positive: styles.stagePositive,
  warning: styles.stageWarning,
  info: styles.stageInfo,
  neutral: styles.stageNeutral,
  muted: styles.stageMuted,
};

function buildStageClass(tone) {
  return STAGE_TONE_CLASS[tone] || styles.stageNeutral;
}

function normalizeRouteParam(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return null;
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return `${minutes} min ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  if (absMs < day) {
    const hours = Math.round(absMs / hour);
    return `${hours} hr${hours !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  if (absMs < week) {
    const days = Math.round(absMs / day);
    return `${days} day${days !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  const weeks = Math.round(absMs / week);
  return `${weeks} wk${weeks !== 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
}

function formatDueLabel(dueTimestamp) {
  if (!dueTimestamp) {
    return null;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueTimestamp - now) / dayMs);

  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays === 1) {
    return 'Due tomorrow';
  }
  if (diffDays > 1) {
    return `Due in ${diffDays} days`;
  }

  const overdueDays = Math.abs(diffDays);
  if (overdueDays === 1) {
    return '1 day overdue';
  }
  return `${overdueDays} days overdue`;
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    return `£${Math.round(value).toLocaleString('en-GB')}`;
  }
}

function formatBudget(budget = {}) {
  const lines = [];
  if (Number.isFinite(budget.saleMax)) {
    lines.push(`Purchase up to ${formatCurrency(budget.saleMax)}`);
  }
  if (Number.isFinite(budget.rentMax)) {
    lines.push(`Rent up to ${formatCurrency(budget.rentMax)} pcm`);
  }
  return lines;
}

export default function AdminContactDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const contactId = useMemo(() => normalizeRouteParam(router.query.id), [router.query.id]);

  useEffect(() => {
    if (!router.isReady || sessionLoading) {
      return;
    }

    if (!isAdmin) {
      setContact(null);
      setError('Admin access required to view contact details.');
      setLoading(false);
      return;
    }

    if (!contactId) {
      setContact(null);
      setError('Contact not found.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadContact() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/admin/contacts/${encodeURIComponent(contactId)}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setContact(null);
          setError('Contact not found.');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch contact');
        }

        const payload = await response.json();
        if (!payload?.contact) {
          setContact(null);
          setError('Contact not found.');
          return;
        }

        setContact(payload.contact);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error(err);
        setContact(null);
        setError('Unable to load contact right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadContact();

    return () => controller.abort();
  }, [router.isReady, sessionLoading, isAdmin, contactId]);

  const pageTitle = contact
    ? `${contact.name} • Admin contacts`
    : 'Contact details • Admin contacts';

  const lastActivityRelative = contact?.lastActivityTimestamp
    ? formatRelativeTime(contact.lastActivityTimestamp)
    : null;
  const createdRelative = contact?.createdAtTimestamp
    ? formatRelativeTime(contact.createdAtTimestamp)
    : null;
  const daysInPipelineLabel = Number.isFinite(contact?.daysInPipeline)
    ? `${contact.daysInPipeline} day${contact.daysInPipeline === 1 ? '' : 's'}`
    : '—';
  const engagementLabel = Number.isFinite(contact?.engagementScore)
    ? `${contact.engagementScore}/100`
    : '—';
  const budgetLines = contact ? formatBudget(contact.budget) : [];
  const nextStepDueLabel = contact?.nextStep?.dueTimestamp
    ? formatDueLabel(contact.nextStep.dueTimestamp)
    : null;

  const mainDetails = contact
    ? [
        { label: 'Stage', value: contact.stageLabel || '—' },
        { label: 'Pipeline', value: contact.pipelineLabel || '—' },
        { label: 'Contact type', value: contact.typeLabel || '—' },
        { label: 'Source', value: contact.source || '—' },
        {
          label: 'Created',
          value: formatDateTime(contact.createdAt),
          hint: createdRelative ? `Added ${createdRelative}` : null,
        },
        {
          label: 'Last activity',
          value: formatDateTime(contact.lastActivityAt),
          hint: lastActivityRelative ? `Updated ${lastActivityRelative}` : null,
        },
        { label: 'Days in pipeline', value: daysInPipelineLabel },
        { label: 'Engagement score', value: engagementLabel },
      ]
    : [];

  const requirements = Array.isArray(contact?.requirements) ? contact.requirements : [];
  const tags = Array.isArray(contact?.tags) ? contact.tags : [];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">Operations</Link>
              <span aria-hidden="true"> / </span>
              <Link href="/admin/contacts">Contacts</Link>
              {contact ? (
                <>
                  <span aria-hidden="true"> / </span>
                  <span>{contact.name}</span>
                </>
              ) : null}
            </p>
            <div className={styles.headerMain}>
              <div className={styles.headerContent}>
                <div className={styles.headerTitle}>
                  <h1>
                    {contact
                      ? contact.name
                      : loading
                      ? 'Loading contact…'
                      : error
                      ? 'Contact unavailable'
                      : 'Contact details'}
                  </h1>
                  {contact ? (
                    <span className={`${styles.stageBadge} ${buildStageClass(contact.stageTone)}`}>
                      {contact.stageLabel}
                    </span>
                  ) : null}
                </div>
                {contact ? (
                  <>
                    <div className={styles.headerMeta}>
                      {contact.typeLabel ? <span className={styles.metaPill}>{contact.typeLabel}</span> : null}
                      {contact.pipelineLabel ? (
                        <span className={styles.metaPill}>{contact.pipelineLabel}</span>
                      ) : null}
                      {contact.source ? <span className={styles.metaPill}>Source: {contact.source}</span> : null}
                    </div>
                    {contact.locationFocus ? (
                      <p className={styles.locationFocus}>Primary focus: {contact.locationFocus}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className={styles.headerActions}>
                {contact?.lastActivityAt ? (
                  <div className={styles.headerMetric}>
                    <span className={styles.metricLabel}>Last activity</span>
                    <span className={styles.metricValue}>{formatDateTime(contact.lastActivityAt)}</span>
                    {lastActivityRelative ? (
                      <span className={styles.metricHint}>{lastActivityRelative}</span>
                    ) : null}
                  </div>
                ) : null}
                <Link href="/admin/contacts" className={styles.backLink}>
                  ← Back to contacts
                </Link>
              </div>
            </div>
          </header>

          {loading ? (
            <section className={styles.stateCard} aria-live="polite">
              <p>Loading contact details…</p>
            </section>
          ) : error ? (
            <section className={`${styles.stateCard} ${styles.errorState}`} role="alert">
              <p>{error}</p>
              <p>
                <Link href="/admin/contacts">Return to contacts</Link>
              </p>
            </section>
          ) : contact ? (
            <div className={styles.contentGrid}>
              <div className={styles.columnStack}>
                <section className={styles.card} aria-labelledby="contact-main-details">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-main-details">Main details</h2>
                  </div>
                  <div className={styles.fieldGrid}>
                    {mainDetails.map((item) => (
                      <div key={item.label} className={styles.field}>
                        <span className={styles.fieldLabel}>{item.label}</span>
                        <span className={styles.fieldValue}>{item.value || '—'}</span>
                        {item.hint ? <span className={styles.fieldHint}>{item.hint}</span> : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.card} aria-labelledby="contact-requirements">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-requirements">Requirements &amp; focus</h2>
                  </div>
                  {contact.locationFocus ? (
                    <p className={styles.fieldHint}>Primary area: {contact.locationFocus}</p>
                  ) : null}
                  {requirements.length ? (
                    <ul className={styles.requirementList}>
                      {requirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyNote}>No specific requirements recorded yet.</p>
                  )}
                  {budgetLines.length ? (
                    <div className={styles.budgetPills}>
                      {budgetLines.map((line) => (
                        <span key={line} className={styles.budgetPill}>
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className={styles.card} aria-labelledby="contact-notes">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-notes">Notes</h2>
                  </div>
                  {contact.generatedNotes ? (
                    <div className={styles.notesBody}>
                      <p>{contact.generatedNotes}</p>
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No additional notes have been added for this contact.</p>
                  )}

                  {tags.length ? (
                    <div>
                      <span className={styles.fieldLabel}>Tags</span>
                      <div className={styles.tagsRow}>
                        {tags.map((tag) => (
                          <span key={tag} className={styles.tagChip}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <div className={styles.columnStack}>
                <section className={`${styles.card} ${styles.nextStepCard}`} aria-labelledby="contact-next-step">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-next-step">Next step</h2>
                  </div>
                  {contact.nextStep ? (
                    <div className={styles.nextStepBody}>
                      <p className={styles.nextStepDescription}>{contact.nextStep.description}</p>
                      <div className={styles.nextStepDue}>
                        {contact.nextStep.dueAt ? <span>{formatDateTime(contact.nextStep.dueAt)}</span> : null}
                        {nextStepDueLabel ? <span>{nextStepDueLabel}</span> : null}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No upcoming tasks scheduled.</p>
                  )}
                </section>

                <section className={styles.card} aria-labelledby="contact-communication">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-communication">Contact details</h2>
                  </div>
                  <dl className={styles.contactList}>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Preferred pipeline</dt>
                      <dd>{contact.pipelineLabel || '—'}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{contact.source || '—'}</dd>
                    </div>
                  </dl>
                </section>

                <section className={styles.card} aria-labelledby="contact-team">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-team">Assigned team</h2>
                  </div>
                  {contact.assignedAgentName ? (
                    <dl className={styles.contactList}>
                      <div>
                        <dt>Owner</dt>
                        <dd>{contact.assignedAgentName}</dd>
                      </div>
                      {contact.assignedAgent?.phone ? (
                        <div>
                          <dt>Phone</dt>
                          <dd>
                            <a href={`tel:${contact.assignedAgent.phone}`}>{contact.assignedAgent.phone}</a>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className={styles.emptyNote}>This contact is not yet assigned to a team member.</p>
                  )}
                </section>

                <section className={styles.card} aria-labelledby="contact-timeline">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-timeline">Timeline</h2>
                  </div>
                  <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineLabel}>Last activity</span>
                      <span className={styles.timelineValue}>{formatDateTime(contact.lastActivityAt)}</span>
                      {lastActivityRelative ? (
                        <span className={styles.timelineHint}>{lastActivityRelative}</span>
                      ) : null}
                    </div>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineLabel}>Created</span>
                      <span className={styles.timelineValue}>{formatDateTime(contact.createdAt)}</span>
                      {createdRelative ? <span className={styles.timelineHint}>{createdRelative}</span> : null}
                    </div>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineLabel}>Days active</span>
                      <span className={styles.timelineValue}>{daysInPipelineLabel}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
