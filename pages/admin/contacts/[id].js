import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
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

const EMPTY_MANAGEMENT_OPTIONS = Object.freeze({
  stage: [],
  pipeline: [],
  type: [],
  agent: [],
});

const MANAGEMENT_INITIAL_FORM_STATE = Object.freeze({
  firstName: '',
  lastName: '',
  stage: '',
  type: '',
  pipeline: '',
  assignedAgentId: '',
  source: '',
  email: '',
  phone: '',
  locationFocus: '',
  tags: '',
  requirements: '',
  budgetSaleMax: '',
  budgetRentMax: '',
  nextStepDescription: '',
  nextStepDueDate: '',
  nextStepDueTime: '',
});

const INITIAL_STATUS_STATE = Object.freeze({
  type: 'idle',
  message: '',
  details: [],
});

function formatInputDate(value) {
  if (!value) {
    return '';
  }

  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return '';
  }
}

function formatInputTime(value) {
  if (!value) {
    return '';
  }

  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(11, 16);
  } catch (error) {
    return '';
  }
}

function buildManagementFormState(contact) {
  if (!contact) {
    return { ...MANAGEMENT_INITIAL_FORM_STATE };
  }

  return {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    stage: contact.stage || '',
    type: contact.type || '',
    pipeline: contact.pipeline || '',
    assignedAgentId: contact.assignedAgentId || '',
    source: contact.source || '',
    email: contact.email || '',
    phone: contact.phone || '',
    locationFocus: contact.locationFocus || '',
    tags: Array.isArray(contact.tags) ? contact.tags.join('\n') : '',
    requirements: Array.isArray(contact.requirements) ? contact.requirements.join('\n') : '',
    budgetSaleMax:
      Number.isFinite(contact?.budget?.saleMax) && contact.budget.saleMax != null
        ? String(contact.budget.saleMax)
        : '',
    budgetRentMax:
      Number.isFinite(contact?.budget?.rentMax) && contact.budget.rentMax != null
        ? String(contact.budget.rentMax)
        : '',
    nextStepDescription: contact.nextStep?.description || '',
    nextStepDueDate: formatInputDate(contact.nextStep?.dueAt),
    nextStepDueTime: formatInputTime(contact.nextStep?.dueAt),
  };
}

function parseListInput(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBudgetValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildBudgetPayloadFromState(state) {
  const saleMax = parseBudgetValue(state.budgetSaleMax);
  const rentMax = parseBudgetValue(state.budgetRentMax);
  return { saleMax, rentMax };
}

function buildNextStepDueAt(dateValue, timeValue) {
  if (!dateValue) {
    return null;
  }

  try {
    const [year, month, day] = dateValue.split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return null;
    }

    let hours = 9;
    let minutes = 0;

    if (timeValue) {
      const [hourPart, minutePart] = timeValue.split(':').map((part) => Number(part));
      if (Number.isInteger(hourPart) && hourPart >= 0 && hourPart <= 23) {
        hours = hourPart;
      }
      if (Number.isInteger(minutePart) && minutePart >= 0 && minutePart <= 59) {
        minutes = minutePart;
      }
    }

    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

function buildNextStepPayloadFromState(state) {
  const description = state.nextStepDescription?.trim() || '';
  const dueAt = buildNextStepDueAt(state.nextStepDueDate?.trim(), state.nextStepDueTime?.trim());

  if (!description && !dueAt) {
    return null;
  }

  const payload = {};
  if (description) {
    payload.description = description;
  }
  if (dueAt) {
    payload.dueAt = dueAt;
  }
  return payload;
}

function buildManagementPayloadFromState(state) {
  return {
    firstName: state.firstName,
    lastName: state.lastName,
    stage: state.stage,
    type: state.type,
    pipeline: state.pipeline,
    assignedAgentId: state.assignedAgentId || null,
    source: state.source,
    email: state.email,
    phone: state.phone,
    locationFocus: state.locationFocus,
    tags: parseListInput(state.tags),
    requirements: parseListInput(state.requirements),
    budget: buildBudgetPayloadFromState(state),
    nextStep: buildNextStepPayloadFromState(state),
  };
}

function normaliseManagementOptions(options) {
  if (!options || typeof options !== 'object') {
    return {
      stage: [...EMPTY_MANAGEMENT_OPTIONS.stage],
      pipeline: [...EMPTY_MANAGEMENT_OPTIONS.pipeline],
      type: [...EMPTY_MANAGEMENT_OPTIONS.type],
      agent: [...EMPTY_MANAGEMENT_OPTIONS.agent],
    };
  }

  return {
    stage: Array.isArray(options.stage) ? [...options.stage] : [],
    pipeline: Array.isArray(options.pipeline) ? [...options.pipeline] : [],
    type: Array.isArray(options.type) ? [...options.type] : [],
    agent: Array.isArray(options.agent) ? [...options.agent] : [],
  };
}

export default function AdminContactDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [options, setOptions] = useState(() => normaliseManagementOptions(null));
  const [formState, setFormState] = useState(() => ({ ...MANAGEMENT_INITIAL_FORM_STATE }));
  const [formStatus, setFormStatus] = useState(INITIAL_STATUS_STATE);
  const [saving, setSaving] = useState(false);

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
        setOptions(normaliseManagementOptions(payload.options));
        setFormState(buildManagementFormState(payload.contact));
        setFormStatus(INITIAL_STATUS_STATE);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error(err);
        setContact(null);
        setError('Unable to load contact right now. Please try again.');
        setOptions(normaliseManagementOptions(null));
        setFormState(() => ({ ...MANAGEMENT_INITIAL_FORM_STATE }));
        setFormStatus(INITIAL_STATUS_STATE);
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

  if (sessionLoading) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
        </Head>
        <AdminNavigation items={[]} />
        <div className={styles.page}>
          <div className={styles.container}>
            <section className={styles.stateCard} aria-live="polite">
              <p>Checking your admin access…</p>
            </section>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
        </Head>
        <AdminNavigation items={[]} />
        <div className={styles.page}>
          <div className={styles.container}>
            <section className={`${styles.stateCard} ${styles.errorState}`} role="alert">
              <p>Admin access required.</p>
              <p>
                You need to <Link href="/login">sign in with an admin account</Link> to view contact details.
              </p>
            </section>
          </div>
        </div>
      </>
    );
  }

  const lastActivityRelative = contact?.lastActivityTimestamp
    ? formatRelativeTime(contact.lastActivityTimestamp)
    : null;
  const createdRelative = contact?.createdAtTimestamp
    ? formatRelativeTime(contact.createdAtTimestamp)
    : null;
  const budgetLines = contact ? formatBudget(contact.budget) : [];
  const nextStepDueLabel = contact?.nextStep?.dueTimestamp
    ? formatDueLabel(contact.nextStep.dueTimestamp)
    : null;

  useEffect(() => {
    if (formStatus.type !== 'success') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setFormStatus(INITIAL_STATUS_STATE);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [formStatus]);

  const handleManagementChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleManagementReset = useCallback(() => {
    if (!contact) {
      return;
    }
    setFormState(buildManagementFormState(contact));
    setFormStatus(INITIAL_STATUS_STATE);
  }, [contact]);

  const handleManagementSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!contactId) {
        return;
      }

      setSaving(true);
      setFormStatus(INITIAL_STATUS_STATE);

      try {
        const payload = buildManagementPayloadFromState(formState);
        const response = await fetch(`/api/admin/contacts/${encodeURIComponent(contactId)}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        let result = null;
        try {
          result = await response.json();
        } catch (parseError) {
          result = null;
        }

        if (!response.ok) {
          const message = result?.error || 'Unable to update contact right now. Please try again.';
          const details = Array.isArray(result?.details)
            ? result.details.filter(Boolean).map((item) => String(item))
            : [];
          const error = new Error(message);
          error.details = details;
          throw error;
        }

        if (!result?.contact) {
          throw new Error('Contact not found in response.');
        }

        setContact(result.contact);
        setOptions(normaliseManagementOptions(result.options));
        setFormState(buildManagementFormState(result.contact));
        setFormStatus({ type: 'success', message: 'Contact updated successfully.', details: [] });
      } catch (submitError) {
        console.error('Failed to update contact', submitError);
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : 'Unable to update contact right now. Please try again.';
        const details = Array.isArray(submitError?.details)
          ? submitError.details.filter(Boolean).map((item) => String(item))
          : [];
        setFormStatus({ type: 'error', message, details });
      } finally {
        setSaving(false);
      }
    },
    [contactId, formState],
  );

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
      ]
    : [];

  const requirements = Array.isArray(contact?.requirements) ? contact.requirements : [];
  const tags = Array.isArray(contact?.tags) ? contact.tags : [];

  const stageOptions = useMemo(() => {
    const entries = [...options.stage];
    if (formState.stage && !entries.some((option) => option.value === formState.stage)) {
      entries.unshift({ value: formState.stage, label: contact?.stageLabel || formState.stage });
    }
    return entries;
  }, [options.stage, formState.stage, contact?.stageLabel]);

  const pipelineOptions = useMemo(() => {
    const entries = [...options.pipeline];
    if (formState.pipeline && !entries.some((option) => option.value === formState.pipeline)) {
      entries.unshift({ value: formState.pipeline, label: contact?.pipelineLabel || formState.pipeline });
    }
    return entries;
  }, [options.pipeline, formState.pipeline, contact?.pipelineLabel]);

  const typeOptions = useMemo(() => {
    const entries = [...options.type];
    if (formState.type && !entries.some((option) => option.value === formState.type)) {
      entries.unshift({ value: formState.type, label: contact?.typeLabel || formState.type });
    }
    return entries;
  }, [options.type, formState.type, contact?.typeLabel]);

  const agentOptions = useMemo(() => {
    const entries = [...options.agent];
    if (formState.assignedAgentId && !entries.some((option) => option.value === formState.assignedAgentId)) {
      entries.unshift({
        value: formState.assignedAgentId,
        label: contact?.assignedAgentName || formState.assignedAgentId,
      });
    }
    return entries;
  }, [options.agent, formState.assignedAgentId, contact?.assignedAgentName]);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
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

                <section className={styles.card} aria-labelledby="contact-tags">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-tags">Tags</h2>
                  </div>
                  {tags.length ? (
                    <div className={styles.tagsRow}>
                      {tags.map((tag) => (
                        <span key={tag} className={styles.tagChip}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyNote}>No tags recorded for this contact.</p>
                  )}
                </section>
              </div>

              <div className={styles.columnStack}>
                <section className={styles.card} aria-labelledby="contact-management">
                  <div className={styles.cardHeader}>
                    <h2 id="contact-management">Manage contact</h2>
                  </div>
                  <form className={styles.form} onSubmit={handleManagementSubmit}>
                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-first-name" className={styles.formLabel}>
                          First name
                        </label>
                        <input
                          id="contact-first-name"
                          name="firstName"
                          type="text"
                          className={styles.input}
                          value={formState.firstName}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="given-name"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-last-name" className={styles.formLabel}>
                          Last name
                        </label>
                        <input
                          id="contact-last-name"
                          name="lastName"
                          type="text"
                          className={styles.input}
                          value={formState.lastName}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="family-name"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-type" className={styles.formLabel}>
                          Contact type
                        </label>
                        <select
                          id="contact-type"
                          name="type"
                          className={styles.select}
                          value={formState.type}
                          onChange={handleManagementChange}
                          disabled={!contact || saving || !typeOptions.length}
                        >
                          {typeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-stage" className={styles.formLabel}>
                          Stage
                        </label>
                        <select
                          id="contact-stage"
                          name="stage"
                          className={styles.select}
                          value={formState.stage}
                          onChange={handleManagementChange}
                          disabled={!contact || saving || !stageOptions.length}
                        >
                          {stageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-pipeline" className={styles.formLabel}>
                          Pipeline
                        </label>
                        <select
                          id="contact-pipeline"
                          name="pipeline"
                          className={styles.select}
                          value={formState.pipeline}
                          onChange={handleManagementChange}
                          disabled={!contact || saving || !pipelineOptions.length}
                        >
                          {pipelineOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-agent" className={styles.formLabel}>
                          Assigned to
                        </label>
                        <select
                          id="contact-agent"
                          name="assignedAgentId"
                          className={styles.select}
                          value={formState.assignedAgentId}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        >
                          <option value="">Unassigned</option>
                          {agentOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-source" className={styles.formLabel}>
                          Source
                        </label>
                        <input
                          id="contact-source"
                          name="source"
                          type="text"
                          className={styles.input}
                          value={formState.source}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-email" className={styles.formLabel}>
                          Email
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          className={styles.input}
                          value={formState.email}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="email"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-phone" className={styles.formLabel}>
                          Phone
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          className={styles.input}
                          value={formState.phone}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                          autoComplete="tel"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-location" className={styles.formLabel}>
                          Location focus
                        </label>
                        <input
                          id="contact-location"
                          name="locationFocus"
                          type="text"
                          className={styles.input}
                          value={formState.locationFocus}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-budget-sale" className={styles.formLabel}>
                          Purchase budget (£)
                        </label>
                        <input
                          id="contact-budget-sale"
                          name="budgetSaleMax"
                          type="number"
                          min="0"
                          step="1"
                          className={styles.input}
                          value={formState.budgetSaleMax}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-budget-rent" className={styles.formLabel}>
                          Rent budget (£pcm)
                        </label>
                        <input
                          id="contact-budget-rent"
                          name="budgetRentMax"
                          type="number"
                          min="0"
                          step="1"
                          className={styles.input}
                          value={formState.budgetRentMax}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                    </div>

                    <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-tags" className={styles.formLabel}>
                          Tags
                        </label>
                        <textarea
                          id="contact-tags"
                          name="tags"
                          className={styles.textarea}
                          value={formState.tags}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                        <p className={styles.fieldHint}>Separate entries with commas or new lines.</p>
                      </div>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-requirements" className={styles.formLabel}>
                          Requirements
                        </label>
                        <textarea
                          id="contact-requirements"
                          name="requirements"
                          className={styles.textarea}
                          value={formState.requirements}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                        <p className={styles.fieldHint}>Separate entries with commas or new lines.</p>
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formRow}>
                        <label htmlFor="contact-next-step" className={styles.formLabel}>
                          Next step description
                        </label>
                        <textarea
                          id="contact-next-step"
                          name="nextStepDescription"
                          className={styles.textarea}
                          value={formState.nextStepDescription}
                          onChange={handleManagementChange}
                          disabled={!contact || saving}
                        />
                      </div>
                      <div className={`${styles.formGrid} ${styles.formGridColumns2}`}>
                        <div className={styles.formRow}>
                          <label htmlFor="contact-next-step-date" className={styles.formLabel}>
                            Due date
                          </label>
                          <input
                            id="contact-next-step-date"
                            name="nextStepDueDate"
                            type="date"
                            className={styles.input}
                            value={formState.nextStepDueDate}
                            onChange={handleManagementChange}
                            disabled={!contact || saving}
                          />
                        </div>
                        <div className={styles.formRow}>
                          <label htmlFor="contact-next-step-time" className={styles.formLabel}>
                            Due time
                          </label>
                          <input
                            id="contact-next-step-time"
                            name="nextStepDueTime"
                            type="time"
                            className={styles.input}
                            value={formState.nextStepDueTime}
                            onChange={handleManagementChange}
                            disabled={!contact || saving}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryButton} disabled={!contact || saving}>
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleManagementReset}
                        disabled={!contact || saving}
                      >
                        Reset
                      </button>
                      {formStatus.message ? (
                        <p
                          className={`${styles.statusMessage} ${
                            formStatus.type === 'success'
                              ? styles.statusSuccess
                              : formStatus.type === 'error'
                              ? styles.statusError
                              : ''
                          }`}
                        >
                          {formStatus.message}
                        </p>
                      ) : null}
                    </div>

                    {formStatus.details?.length ? (
                      <ul
                        className={`${styles.statusDetails} ${
                          formStatus.type === 'error' ? styles.statusError : styles.statusSuccess
                        }`}
                      >
                        {formStatus.details.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </form>
                </section>

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
