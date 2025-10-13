import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminContacts.module.css';

const STAGE_BADGE_CLASS = {
  hot: styles.badgeHot,
  warm: styles.badgeWarm,
  nurture: styles.badgeNurture,
  client: styles.badgeClient,
  past_client: styles.badgePastClient,
};

function ContactActionsCell({ contact }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleDocumentClick(event) {
      if (!menuRef.current || !toggleRef.current) {
        return;
      }

      if (
        menuRef.current.contains(event.target) ||
        toggleRef.current.contains(event.target)
      ) {
        return;
      }

      setMenuOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = setTimeout(() => setStatusMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  const copyToClipboard = useCallback(
    async (value, label) => {
      if (!value) {
        return;
      }

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          setStatusMessage(label);
          return;
        }
      } catch (error) {
        console.error('Failed to copy to clipboard', error);
      }

      if (typeof window !== 'undefined') {
        window.prompt('Copy to clipboard: Ctrl+C, Enter', value);
        setStatusMessage(label);
      }
    },
    [],
  );

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((current) => !current);
  }, []);

  const contactId = contact?.id ?? null;
  const contactDetailsHref = useMemo(() => {
    if (!contactId) {
      return null;
    }

    return `/admin/contacts/${encodeURIComponent(contactId)}`;
  }, [contactId]);

  const handleUpdate = useCallback(() => {
    if (!contactDetailsHref) {
      return;
    }

    router.push(contactDetailsHref);
  }, [contactDetailsHref, router]);

  const menuItems = useMemo(() => {
    const items = [];

    if (contactDetailsHref) {
      items.push({
        key: 'view',
        label: 'View contact details',
        href: contactDetailsHref,
      });
      items.push({
        key: 'timeline',
        label: 'Jump to activity timeline',
        href: `${contactDetailsHref}#contact-timeline`,
      });
      items.push({
        key: 'nextStep',
        label: 'Review next step',
        href: `${contactDetailsHref}#contact-next-step`,
      });
    }

    if (contact?.email) {
      items.push({
        key: 'email',
        label: 'Send email',
        onSelect: () => {
          if (typeof window !== 'undefined') {
            window.location.href = `mailto:${contact.email}`;
          }
        },
      });
      items.push({
        key: 'copyEmail',
        label: 'Copy email address',
        onSelect: () => copyToClipboard(contact.email, 'Email address copied to clipboard'),
      });
    }

    if (contact?.phone) {
      items.push({
        key: 'call',
        label: 'Call contact',
        onSelect: () => {
          if (typeof window !== 'undefined') {
            window.location.href = `tel:${contact.phone}`;
          }
        },
      });
      items.push({
        key: 'copyPhone',
        label: 'Copy phone number',
        onSelect: () => copyToClipboard(contact.phone, 'Phone number copied to clipboard'),
      });
    }

    if (contactId) {
      items.push({
        key: 'copyId',
        label: 'Copy contact ID',
        onSelect: () => copyToClipboard(contactId, 'Contact ID copied to clipboard'),
      });
    }

    return items;
  }, [contact, contactDetailsHref, contactId, copyToClipboard]);

  return (
    <div className={styles.actionsWrapper}>
      <button type="button" className={styles.updateButton} onClick={handleUpdate}>
        Update
      </button>
      <button
        type="button"
        className={styles.menuToggle}
        onClick={handleMenuToggle}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label={`More actions for ${contact.name}`}
        ref={toggleRef}
      >
        <span aria-hidden="true">▾</span>
      </button>
      {menuOpen ? (
        <div className={styles.actionMenu} role="menu" ref={menuRef}>
          <ul className={styles.actionMenuList}>
            {menuItems.map((item) => (
              <li key={item.key} className={styles.actionMenuListItem}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={styles.actionMenuItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.actionMenuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onSelect?.();
                    }}
                    role="menuitem"
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <span className={styles.srOnly} role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
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
    const minutes = Math.round(absMs / minute) || 1;
    return `${minutes} min ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }
  if (absMs < day) {
    const hours = Math.round(absMs / hour);
    return `${hours} hr${hours > 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }
  if (absMs < week) {
    const days = Math.round(absMs / day);
    return `${days} day${days > 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
  }

  const weeks = Math.round(absMs / week);
  return `${weeks} wk${weeks > 1 ? 's' : ''} ${diffMs >= 0 ? 'ago' : 'from now'}`;
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

function formatBudget(budget) {
  if (!budget || typeof budget !== 'object') {
    return null;
  }

  const saleLabel = Number.isFinite(budget.saleMax)
    ? `Sale up to ${formatCurrency(budget.saleMax)}`
    : null;
  const rentLabel = Number.isFinite(budget.rentMax)
    ? `Rent up to ${formatCurrency(budget.rentMax)} pcm`
    : null;

  return [saleLabel, rentLabel].filter(Boolean).join(' • ') || null;
}

function buildBadgeClass(stage) {
  return STAGE_BADGE_CLASS[stage] || styles.badgeDefault;
}

function getSummaryCards(summary) {
  return [
    {
      label: 'Total contacts',
      value: summary?.total ?? 0,
    },
    {
      label: 'Hot pipeline',
      value: summary?.hot ?? 0,
    },
    {
      label: 'Active sales',
      value: summary?.activeSales ?? 0,
    },
    {
      label: 'Active lettings',
      value: summary?.activeLettings ?? 0,
    },
  ];
}

function formatGeneratedAt(value) {
  if (!value) {
    return null;
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

export default function AdminContactsPage() {
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ type: [], stage: [], pipeline: [], agent: [] });
  const [generatedAt, setGeneratedAt] = useState(null);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const loadContacts = useCallback(async () => {
    if (!isAdmin) {
      setContacts([]);
      setSummary(null);
      setFilters({ type: [], stage: [], pipeline: [], agent: [] });
      setGeneratedAt(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const payload = await response.json();
      setContacts(Array.isArray(payload.contacts) ? payload.contacts : []);
      setSummary(payload.summary || null);
      setFilters(payload.filters || { type: [], stage: [], pipeline: [], agent: [] });
      setGeneratedAt(payload.generatedAt || null);
    } catch (err) {
      console.error(err);
      setError('Unable to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadContacts();
  }, [isAdmin, loadContacts]);

  const availableStageOptions = useMemo(() => [{ value: 'all', label: 'All stages' }, ...filters.stage], [filters.stage]);
  const availableTypeOptions = useMemo(() => [{ value: 'all', label: 'All types' }, ...filters.type], [filters.type]);
  const availablePipelineOptions = useMemo(
    () => [{ value: 'all', label: 'All pipelines' }, ...filters.pipeline],
    [filters.pipeline]
  );
  const availableAgentOptions = useMemo(
    () => [{ value: 'all', label: 'All team members' }, ...filters.agent],
    [filters.agent]
  );

  const filteredContacts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (stageFilter !== 'all' && contact.stage !== stageFilter) {
        return false;
      }
      if (typeFilter !== 'all' && contact.type !== typeFilter) {
        return false;
      }
      if (pipelineFilter !== 'all' && contact.pipeline !== pipelineFilter) {
        return false;
      }
      if (agentFilter !== 'all') {
        const assigned = contact.assignedAgentId || 'unassigned';
        if (assigned !== agentFilter) {
          return false;
        }
      }

      if (searchTerm) {
        const target = contact.searchIndex || `${contact.name} ${contact.email ?? ''} ${contact.phone ?? ''}`;
        if (!target.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, stageFilter, typeFilter, pipelineFilter, agentFilter, search]);

  const summaryCards = useMemo(() => getSummaryCards(summary), [summary]);

  const generatedAtLabel = useMemo(() => formatGeneratedAt(generatedAt), [generatedAt]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStageFilter('all');
    setTypeFilter('all');
    setPipelineFilter('all');
    setAgentFilter('all');
  }, []);

  if (sessionLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>Admin access required.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Contacts • Aktonz Admin</title>
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">Operations</Link> / <span>Contacts</span>
            </p>
            <div className={styles.headerMain}>
              <div>
                <h1>Contacts</h1>
                <p>Pipeline visibility across sales and lettings sourced via Apex27.</p>
              </div>
              {generatedAtLabel ? (
                <p className={styles.generatedAt}>Synced {generatedAtLabel}</p>
              ) : null}
            </div>
          </header>

          <section className={styles.summaryGrid} aria-label="Contacts summary">
            {summaryCards.map((card) => (
              <article key={card.label} className={styles.summaryCard}>
                <p className={styles.summaryLabel}>{card.label}</p>
                <p className={styles.summaryValue}>{card.value}</p>
              </article>
            ))}
          </section>

          <section className={styles.filtersCard} aria-labelledby="contacts-filters">
            <div className={styles.filtersHeader}>
              <h2 id="contacts-filters">Filters</h2>
              <button type="button" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
            <div className={styles.filtersGrid}>
              <label>
                <span className={styles.fieldLabel}>Search</span>
                <input
                  type="search"
                  className={styles.textInput}
                  placeholder="Search name, email, phone or notes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>Stage</span>
                <select
                  className={styles.selectInput}
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                >
                  {availableStageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.fieldLabel}>Type</span>
                <select
                  className={styles.selectInput}
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  {availableTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.fieldLabel}>Pipeline</span>
                <select
                  className={styles.selectInput}
                  value={pipelineFilter}
                  onChange={(event) => setPipelineFilter(event.target.value)}
                >
                  {availablePipelineOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={styles.fieldLabel}>Team member</span>
                <select
                  className={styles.selectInput}
                  value={agentFilter}
                  onChange={(event) => setAgentFilter(event.target.value)}
                >
                  {availableAgentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === 'unassigned' ? 'Unassigned' : option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.tableCard} aria-labelledby="contacts-table">
            <div className={styles.tableHeader}>
              <div>
                <h2 id="contacts-table">All contacts</h2>
                <p>
                  Showing {filteredContacts.length} of {contacts.length} contacts
                </p>
              </div>
              <button type="button" className={styles.refreshButton} onClick={loadContacts} disabled={loading}>
                Refresh
              </button>
            </div>
            {loading ? (
              <div className={`${styles.loadingState} ${styles.emptyState}`}>Loading contacts…</div>
            ) : error ? (
              <div className={styles.errorState}>{error}</div>
            ) : filteredContacts.length === 0 ? (
              <div className={styles.emptyState}>No contacts match the selected filters yet.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Contact</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Source</th>
                      <th scope="col">Last activity</th>
                      <th scope="col">Next step</th>
                      <th scope="col">Focus &amp; requirements</th>
                      <th scope="col">Contact details</th>
                      <th scope="col">Owner</th>
                      <th scope="col" className={styles.actionsHeader}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => {
                      const stageClass = buildBadgeClass(contact.stage);
                      const budgetLabel = formatBudget(contact.budget);
                      const lastActivityRelative = formatRelativeTime(contact.lastActivityTimestamp);
                      const nextStepDueLabel = formatDueLabel(contact.nextStep?.dueTimestamp);
                      const createdRelative = formatRelativeTime(contact.createdAtTimestamp);

                      return (
                        <tr key={contact.id}>
                          <td className={styles.nameCell}>
                            <Link
                              href={`/admin/contacts/${contact.id}`}
                              className={styles.nameLink}
                            >
                              <strong>{contact.name}</strong>
                              <span className={styles.nameLinkIcon} aria-hidden="true">
                                ↗
                              </span>
                            </Link>
                            <div className={styles.meta}>
                              <span>{contact.typeLabel}</span>
                              {contact.pipelineLabel ? <span> • {contact.pipelineLabel}</span> : null}
                              {createdRelative ? <span> • in pipeline {createdRelative}</span> : null}
                            </div>
                            {contact.tags?.length ? (
                              <div className={styles.badges}>
                                {contact.tags.map((tag) => (
                                  <span key={tag} className={styles.tag}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <div className={`${styles.badge} ${stageClass}`}>{contact.stageLabel}</div>
                            <div className={styles.meta}>Engagement score {contact.engagementScore}</div>
                          </td>
                          <td>
                            <div>{contact.source || '—'}</div>
                            <div className={styles.meta}>{formatDateTime(contact.createdAt)}</div>
                          </td>
                          <td>
                            <div>{formatDateTime(contact.lastActivityAt)}</div>
                            {lastActivityRelative ? <div className={styles.meta}>{lastActivityRelative}</div> : null}
                          </td>
                          <td>
                            <div className={styles.nextStep}>
                              <strong>{contact.nextStep?.description || 'No upcoming tasks'}</strong>
                              {contact.nextStep?.dueAt ? (
                                <span>{formatDateTime(contact.nextStep.dueAt)}</span>
                              ) : null}
                              {nextStepDueLabel ? <span>{nextStepDueLabel}</span> : null}
                            </div>
                          </td>
                          <td>
                            <div className={styles.requirements}>
                              {contact.locationFocus ? <strong>{contact.locationFocus}</strong> : null}
                              {contact.requirements?.length ? (
                                <ul>
                                  {contact.requirements.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {budgetLabel ? <span className={styles.meta}>{budgetLabel}</span> : null}
                            </div>
                          </td>
                          <td>
                            <div>
                              {contact.email ? (
                                <a href={`mailto:${contact.email}`}>{contact.email}</a>
                              ) : (
                                '—'
                              )}
                            </div>
                            <div>
                              {contact.phone ? (
                                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                              ) : (
                                <span className={styles.meta}>No phone</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>{contact.assignedAgentName || 'Unassigned'}</div>
                            <div className={styles.meta}>{contact.pipelineLabel}</div>
                          </td>
                          <td className={styles.actionsCell}>
                            <ContactActionsCell contact={contact} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
