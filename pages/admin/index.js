import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../components/admin/AdminNavigation';
import styles from '../../styles/Admin.module.css';
import { useSession } from '../../components/SessionProvider';
import { describeMicrosoftConnection } from '../../lib/microsoft-connection-status.js';
import { formatAdminCurrency, formatAdminDate } from '../../lib/admin/formatters';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'valuation_sent', label: 'Valuation Sent' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
];

const CLOSED_VALUATION_STATUSES = ['lost', 'archived'];

const INITIAL_MICROSOFT_STATUS_STATE = {
  loading: true,
  loaded: false,
  data: null,
  error: null,
};

const DATE_TIME_WITH_HOURS = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const formatted = formatAdminDate(value, DATE_TIME_WITH_HOURS);
  return formatted || value;
}

function formatStatusLabel(status, options) {
  const option = options.find((entry) => entry.value === status);
  if (option) {
    return option.label;
  }

  return options.length ? options[0].label : status;
}

export default function AdminDashboard() {
  const [offers, setOffers] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState('idle');
  const [connectRedirecting, setConnectRedirecting] = useState(false);
  const [microsoftStatus, setMicrosoftStatus] = useState(INITIAL_MICROSOFT_STATUS_STATE);
  const router = useRouter();
  const { user, loading: sessionLoading, clearSession, refresh } = useSession();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (router.query.connected === '1') {
      setIntegrationStatus('success');
      setConnectRedirecting(false);
    } else if (typeof router.query.error !== 'undefined') {
      setIntegrationStatus('error');
      setConnectRedirecting(false);
    } else {
      setIntegrationStatus('idle');
    }
  }, [router.isReady, router.query]);

  const integrationStatusMessage = useMemo(() => {
    switch (integrationStatus) {
      case 'success':
        return 'Microsoft Graph connection updated successfully.';
      case 'error':
        return 'Unable to complete Microsoft Graph connection. Please try again.';
      default:
        return null;
    }
  }, [integrationStatus]);

  const loadMicrosoftStatus = useCallback(() => {
    if (!isAdmin) {
      setMicrosoftStatus({ loading: false, loaded: false, data: null, error: null });
      return null;
    }

    setMicrosoftStatus((prev) => ({ ...prev, loading: true, error: null }));

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/microsoft/status', {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to load Microsoft Graph status');
        }

        const payload = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        setMicrosoftStatus({ loading: false, loaded: true, data: payload, error: null });
      } catch (error) {
        if (
          controller.signal.aborted ||
          (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
          (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
        ) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unable to load Microsoft Graph status';
        setMicrosoftStatus({ loading: false, loaded: true, data: null, error: message });
      }
    })();

    return controller;
  }, [isAdmin]);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    const controller = loadMicrosoftStatus();

    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [loadMicrosoftStatus, sessionLoading]);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (integrationStatus !== 'success' && integrationStatus !== 'error') {
      return;
    }

    const controller = loadMicrosoftStatus();

    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [integrationStatus, loadMicrosoftStatus, sessionLoading]);

  const baseMicrosoftConnection = useMemo(
    () => describeMicrosoftConnection(microsoftStatus),
    [microsoftStatus],
  );

  const microsoftConnection = useMemo(() => {
    if (connectRedirecting) {
      return {
        status: 'redirecting',
        badgeLabel: 'Redirecting',
        badgeTone: 'info',
        detail: 'Complete the Microsoft consent prompt to finish connecting.',
        buttonLabel: 'Redirecting…',
        buttonDisabled: true,
        suppressQuery: true,
        banner: {
          message: 'Opening Microsoft 365 to update the connector…',
          tone: 'info',
          suppressQuery: true,
        },
      };
    }

    const banner = baseMicrosoftConnection.bannerMessage
      ? {
          message: baseMicrosoftConnection.bannerMessage,
          tone: baseMicrosoftConnection.tone,
          suppressQuery: baseMicrosoftConnection.suppressQuery,
        }
      : null;

    const buttonDisabled = Boolean(baseMicrosoftConnection.actionDisabled || microsoftStatus.loading);
    const buttonLabel =
      microsoftStatus.loading && microsoftStatus.loaded
        ? 'Refreshing status…'
        : baseMicrosoftConnection.actionLabel;

    return {
      status: baseMicrosoftConnection.status,
      badgeLabel: baseMicrosoftConnection.badgeLabel,
      badgeTone: baseMicrosoftConnection.tone,
      detail: baseMicrosoftConnection.detailMessage,
      buttonLabel,
      buttonDisabled,
      suppressQuery: baseMicrosoftConnection.suppressQuery,
      banner,
    };
  }, [baseMicrosoftConnection, connectRedirecting, microsoftStatus.loaded, microsoftStatus.loading]);

  const integrationAlertToneClasses = useMemo(
    () => ({
      success: styles.integrationAlertSuccess,
      error: styles.integrationAlertError,
      warning: styles.integrationAlertWarning,
      info: styles.integrationAlertInfo,
    }),
    [],
  );

  const showQueryMessage = Boolean(integrationStatusMessage && !microsoftConnection.suppressQuery);

  const loadData = useCallback(async (options = {}) => {
    const signal =
      options && typeof options === 'object' && 'signal' in options ? options.signal : undefined;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [offersRes, valuationsRes, maintenanceRes] = await Promise.all([
        fetch('/api/admin/offers', { signal }),
        fetch('/api/admin/valuations', { signal }),
        fetch('/api/admin/maintenance', { signal }),
      ]);

      if (!offersRes.ok) {
        throw new Error('Failed to fetch offers');
      }
      if (!valuationsRes.ok) {
        throw new Error('Failed to fetch valuations');
      }
      if (!maintenanceRes.ok) {
        throw new Error('Failed to fetch maintenance tasks');
      }

      const offersJson = await offersRes.json();
      const valuationsJson = await valuationsRes.json();
      const maintenanceJson = await maintenanceRes.json();

      if (signal?.aborted) {
        return;
      }

      setOffers(Array.isArray(offersJson.offers) ? offersJson.offers : []);
      setValuations(Array.isArray(valuationsJson.valuations) ? valuationsJson.valuations : []);
      setMaintenanceTasks(Array.isArray(maintenanceJson.tasks) ? maintenanceJson.tasks : []);

      const resolvedStatusOptions = Array.isArray(valuationsJson.statusOptions)
        ? valuationsJson.statusOptions
            .filter((entry) => entry && typeof entry === 'object' && entry.value)
            .map((entry) => ({
              value: entry.value,
              label:
                entry.label ||
                String(entry.value)
                  .split('_')
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(' '),
            }))
        : Array.isArray(valuationsJson.statuses)
        ? valuationsJson.statuses.map((value) => ({
            value,
            label: String(value)
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' '),
          }))
        : null;

      if (resolvedStatusOptions && resolvedStatusOptions.length) {
        setStatusOptions(resolvedStatusOptions);
      }
    } catch (err) {
      if (
        signal?.aborted ||
        (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError')
      ) {
        return;
      }
      console.error(err);
      setError('Unable to load the operations dashboard. Please try again.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setOffers([]);
      setValuations([]);
      setMaintenanceTasks([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    loadData({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [isAdmin, loadData]);

  const handleStatusChange = useCallback(
    async (valuation, nextStatus) => {
      if (!valuation || valuation.status === nextStatus) {
        return;
      }

      setUpdatingId(valuation.id);
      setError(null);

      try {
        const response = await fetch('/api/admin/valuations', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: valuation.id, status: nextStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update valuation status');
        }

        const { valuation: updated } = await response.json();
        setValuations((current) =>
          current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)),
        );
      } catch (err) {
        console.error(err);
        setError('Unable to update valuation status. Please try again.');
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const openValuations = useMemo(
    () =>
      valuations.filter(
        (valuation) => !CLOSED_VALUATION_STATUSES.includes((valuation.status || '').toLowerCase()),
      ),
    [valuations],
  );
  const newValuationsCount = useMemo(
    () =>
      valuations.filter((valuation) => (valuation.status || '').toLowerCase() === 'new').length,
    [valuations],
  );
  const scheduledValuationsCount = useMemo(
    () => valuations.filter((valuation) => Boolean(valuation.appointmentAt)).length,
    [valuations],
  );
  const valuationsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return valuations.filter((valuation) => parseTimestamp(valuation.createdAt) >= weekAgo).length;
  }, [valuations]);

  const salesOffers = useMemo(
    () => offers.filter((offer) => offer.type === 'sale'),
    [offers],
  );
  const rentalOffers = useMemo(
    () => offers.filter((offer) => offer.type === 'rent'),
    [offers],
  );
  const openMaintenanceTasks = useMemo(
    () => maintenanceTasks.filter((task) => task.statusCategory !== 'closed'),
    [maintenanceTasks],
  );
  const overdueMaintenanceTasks = useMemo(
    () => openMaintenanceTasks.filter((task) => task.overdue),
    [openMaintenanceTasks],
  );
  const dueSoonMaintenanceTasks = useMemo(
    () => openMaintenanceTasks.filter((task) => task.dueSoon && !task.overdue),
    [openMaintenanceTasks],
  );
  const maintenanceTaskList = useMemo(() => maintenanceTasks.slice(), [maintenanceTasks]);

  const dashboardSecondaryLinks = useMemo(
    () => [
      { label: 'Dashboard overview', href: '#dashboard-overview' },
      { label: 'Valuation requests', href: '#valuations' },
      { label: 'Offers workspace', href: '#offers' },
      { label: 'Maintenance tasks', href: '#maintenance' },
      { label: 'Email setup', href: '#email-settings' },
    ],
    [],
  );

  const lastActivityLabel = useMemo(() => {
    const timestamps = [
      ...valuations.map((valuation) => valuation.updatedAt || valuation.createdAt),
      ...offers.map((offer) => offer.updatedAt || offer.date),
      ...maintenanceTasks.map((task) => task.updatedAt || task.dueAt || task.createdAt),
    ]
      .map((value) => {
        if (!value) {
          return null;
        }

        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? null : timestamp;
      })
      .filter((value) => typeof value === 'number');

    if (!timestamps.length) {
      return null;
    }

    return formatDate(new Date(Math.max(...timestamps)));
  }, [offers, maintenanceTasks, valuations]);

  const handleConnectClick = useCallback(() => {
    setMicrosoftStatus((prev) => ({ ...prev, error: null }));
    setConnectRedirecting(true);
    window.location.href = '/api/microsoft/connect';
  }, []);

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    setLogoutLoading(true);

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to sign out. Please try again.');
      }

      clearSession();

      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after logout', refreshError);
      }

      await router.push('/login');
    } catch (error) {
      console.error('Admin logout failed', error);
      const message =
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.';
      setLogoutError(message);
    } finally {
      setLogoutLoading(false);
    }
  }, [clearSession, refresh, router]);

  const renderLayout = (title, content, showNavigation = false) => (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AdminNavigation
        items={showNavigation ? ADMIN_NAV_ITEMS : []}
        secondaryItems={showNavigation ? dashboardSecondaryLinks : []}
        onLogout={showNavigation ? handleLogout : undefined}
        logoutLoading={logoutLoading}
        logoutLabel="Sign out"
        logoutLoadingLabel="Signing out…"
        errorMessage={logoutError || undefined}
      />
      <main className={styles.main}>
        <div className={styles.container}>{content}</div>
      </main>
    </>
  );

  if (sessionLoading) {
    return renderLayout(
      'Aktonz Admin — Loading',
      <p className={styles.loading}>Checking your admin access…</p>,
    );
  }

  if (!isAdmin) {
    return renderLayout(
      'Aktonz Admin — Access required',
      <>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.pageEyebrow}>Operations</p>
            <h1 className={styles.pageTitle}>Admin access required</h1>
          </div>
        </header>
        <section className={styles.panel}>
          <p className={styles.emptyState}>
            You need to <Link href="/login">sign in with an admin account</Link> to manage valuation
            requests and offers.
          </p>
        </section>
      </>,
    );
  }

  return renderLayout(
    'Aktonz Admin — Apex dashboard',
    <>
      <header
        id="dashboard-overview"
        className={`${styles.pageHeader} ${styles.dashboardHero} ${styles.anchorSection}`}
      >
        <div className={styles.heroContent}>
          <div className={styles.heroHeading}>
            <p className={styles.pageEyebrow}>Operations</p>
            <h1 className={styles.pageTitle}>Aktonz Apex dashboard</h1>
            <p className={styles.pageIntro}>
              Monitor valuation requests, keep an eye on live offers, and act quickly with the tools
              you use every day.
            </p>
          </div>
          {lastActivityLabel ? (
            <p className={styles.heroMeta}>Last activity {lastActivityLabel}</p>
          ) : null}
          <div className={styles.heroActions}>
            <button
              type="button"
              className={`${styles.refreshButton} ${styles.heroAction}`}
              onClick={loadData}
              disabled={loading}
            >
              Refresh data
            </button>
            <Link href="/admin/valuations" className={`${styles.heroAction} ${styles.heroActionLink}`}>
              Go to valuation workspace
            </Link>
          </div>
        </div>
        <dl className={styles.heroStats}>
          <div>
            <dt>Open valuations</dt>
            <dd>
              <span className={styles.heroStatValue}>{openValuations.length}</span>
              <span className={styles.heroStatDetail}>
                {valuations.length
                  ? `${newValuationsCount} new · ${valuations.length} total`
                  : 'Awaiting first lead'}
              </span>
            </dd>
          </div>
          <div>
            <dt>New this week</dt>
            <dd>
              <span className={styles.heroStatValue}>{valuationsThisWeek}</span>
              <span className={styles.heroStatDetail}>Fresh enquiries in the last 7 days</span>
            </dd>
          </div>
          <div>
            <dt>Appointments booked</dt>
            <dd>
              <span className={styles.heroStatValue}>{scheduledValuationsCount}</span>
              <span className={styles.heroStatDetail}>With an appointment date scheduled</span>
            </dd>
          </div>
          <div>
            <dt>Live offers</dt>
            <dd>
              <span className={styles.heroStatValue}>{offers.length}</span>
              <span className={styles.heroStatDetail}>
                {salesOffers.length} sale · {rentalOffers.length} rent
              </span>
            </dd>
          </div>
          <div>
            <dt>Maintenance</dt>
            <dd>
              <span className={styles.heroStatValue}>{openMaintenanceTasks.length}</span>
              <span className={styles.heroStatDetail}>
                {overdueMaintenanceTasks.length} overdue · {maintenanceTasks.length} total
              </span>
            </dd>
          </div>
        </dl>
      </header>

      <section className={styles.quickActionsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick actions</h2>
          <p className={styles.sectionSubtitle}>Jump straight into the work that needs attention.</p>
        </div>
        <div className={styles.quickActionsGrid}>
          <Link href="/admin/valuations" className={styles.quickActionCard}>
            <span className={styles.quickActionLabel}>Valuation pipeline</span>
            <span className={styles.quickActionValue}>{openValuations.length} open leads</span>
            <span className={styles.quickActionMeta}>
              {newValuationsCount} new instructions ready for follow-up.
            </span>
          </Link>
          <Link href="/admin/offers" className={styles.quickActionCard}>
            <span className={styles.quickActionLabel}>Offers workspace</span>
            <span className={styles.quickActionValue}>{offers.length} active offers</span>
            <span className={styles.quickActionMeta}>
              Review sales and tenancy offers from a single queue.
            </span>
          </Link>
          <Link href="/admin/email" className={styles.quickActionCard}>
            <span className={styles.quickActionLabel}>Email preferences</span>
            <span className={styles.quickActionValue}>info@aktonz.com</span>
            <span className={styles.quickActionMeta}>Manage Microsoft 365 connection and routing.</span>
          </Link>
          <button
            type="button"
            onClick={handleConnectClick}
            className={styles.quickActionCard}
            disabled={connectRedirecting}
          >
            <span className={styles.quickActionLabel}>Connect Microsoft 365</span>
            <span className={styles.quickActionValue}>
              {connectRedirecting ? 'Redirecting…' : 'Update Graph link'}
            </span>
            <span className={styles.quickActionMeta}>
              Enable outbound messaging through the Aktonz mailbox.
            </span>
          </button>
        </div>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.dashboardGrid}>
        <section
          id="valuations"
          className={`${styles.panel} ${styles.anchorSection} ${styles.dashboardPanel} ${styles.dashboardPanelWide}`}
        >
        <div className={styles.panelHeader}>
          <div>
            <h2>Valuation requests</h2>
            <p>Acaboom captures these valuation leads from the website and synchronises them here.</p>
            <div className={styles.panelLinks}>
              <Link href="/admin/valuations" className={styles.panelLink}>
                Manage valuation pipeline
              </Link>
            </div>
          </div>
          <dl className={styles.summaryList}>
            <div>
              <dt>Open</dt>
              <dd>{openValuations.length}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{valuations.length}</dd>
            </div>
          </dl>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading valuation requests…</p>
        ) : valuations.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Client</th>
                  <th>Property</th>
                  <th>Status &amp; notes</th>
                </tr>
              </thead>
              <tbody>
                {valuations.map((valuation) => (
                  <tr key={valuation.id}>
                    <td>
                      <div className={styles.primaryText}>{formatDate(valuation.createdAt)}</div>
                      {valuation.updatedAt && (
                        <div className={styles.meta}>Updated {formatDate(valuation.updatedAt)}</div>
                      )}
                    </td>
                    <td>
                      <div className={styles.primaryText}>
                        {valuation.firstName} {valuation.lastName}
                      </div>
                      <div className={styles.meta}>
                        <a href={`mailto:${valuation.email}`}>{valuation.email}</a>
                      </div>
                      <div className={styles.meta}>
                        <a href={`tel:${valuation.phone}`}>{valuation.phone}</a>
                      </div>
                    </td>
                    <td>
                      <div className={styles.primaryText}>{valuation.address}</div>
                      {valuation.source ? <div className={styles.meta}>{valuation.source}</div> : null}
                      {valuation.appointmentAt ? (
                        <div className={styles.meta}>Appointment {formatDate(valuation.appointmentAt)}</div>
                      ) : null}
                    </td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={valuation.status || statusOptions[0]?.value || 'new'}
                        onChange={(event) => handleStatusChange(valuation, event.target.value)}
                        disabled={updatingId === valuation.id}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className={styles.badge}>{formatStatusLabel(valuation.status, statusOptions)}</div>
                      <Link
                        href={`/admin/valuations/${encodeURIComponent(valuation.id)}`}
                        className={styles.rowLink}
                      >
                        Manage this valuation
                      </Link>
                      {valuation.presentation ? (
                        <div className={styles.meta}>
                          Style:{' '}
                          {valuation.presentation.presentationUrl ? (
                            <a
                              href={valuation.presentation.presentationUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {valuation.presentation.title || 'View presentation'}
                            </a>
                          ) : (
                            valuation.presentation.title || valuation.presentation.id
                          )}
                        </div>
                      ) : null}
                      {valuation.presentation?.sentAt ? (
                        <div className={styles.meta}>
                          Sent {formatDate(valuation.presentation.sentAt)}
                        </div>
                      ) : null}
                      {valuation.presentation?.message ? (
                        <p className={styles.note}>
                          <strong>Message:</strong> {valuation.presentation.message}
                        </p>
                      ) : null}
                      {valuation.notes ? <p className={styles.note}>{valuation.notes}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No valuation requests just yet.</p>
        )}
      </section>

        <section
          id="offers"
          className={`${styles.panel} ${styles.anchorSection} ${styles.dashboardPanel} ${styles.dashboardPanelWide}`}
        >
        <div className={styles.panelHeader}>
          <div>
            <h2>Offers pipeline</h2>
            <p>Review live sale and tenancy offers captured across the Aktonz platform.</p>
            <div className={styles.panelLinks}>
              <Link href="/admin/offers" className={styles.panelLink}>
                Manage offers workspace
              </Link>
            </div>
          </div>
          <dl className={styles.summaryList}>
            <div>
              <dt>Sale</dt>
              <dd>{salesOffers.length}</dd>
            </div>
            <div>
              <dt>Rent</dt>
              <dd>{rentalOffers.length}</dd>
            </div>
          </dl>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading offers…</p>
        ) : offers.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Property</th>
                  <th>Client</th>
                  <th>Offer</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <div className={styles.primaryText}>{formatDate(offer.date)}</div>
                      {offer.agent?.name ? (
                        <div className={styles.meta}>Handled by {offer.agent.name}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.primaryText}>{offer.property?.title || 'Unlinked property'}</div>
                      {offer.property?.address ? (
                        <div className={styles.meta}>{offer.property.address}</div>
                      ) : null}
                      {offer.property?.link ? (
                        <div className={styles.meta}>
                          <a href={offer.property.link} target="_blank" rel="noreferrer">
                            View listing
                          </a>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.primaryText}>
                        {offer.contact?.name || 'Unknown contact'}
                      </div>
                      {offer.contact?.email ? (
                        <div className={styles.meta}>
                          <a href={`mailto:${offer.contact.email}`}>{offer.contact.email}</a>
                        </div>
                      ) : null}
                      {offer.contact?.phone ? (
                        <div className={styles.meta}>
                          <a href={`tel:${offer.contact.phone}`}>{offer.contact.phone}</a>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.primaryText}>{offer.amount}</div>
                      <div
                        className={`${styles.offerType} ${
                          offer.type === 'sale' ? styles.offerTypeSale : styles.offerTypeRent
                        }`}
                      >
                        {offer.type === 'sale' ? 'Sale offer' : 'Tenancy offer'}
                      </div>
                      {offer.status ? <div className={styles.meta}>{offer.status}</div> : null}
                      <Link
                        href={`/admin/offers?id=${encodeURIComponent(offer.id)}`}
                        className={styles.rowLink}
                      >
                        Review this offer
                      </Link>
                      {Array.isArray(offer.notes) && offer.notes.length ? (
                        <p className={styles.note}>
                          {offer.notes[offer.notes.length - 1].note}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No live offers at the moment.</p>
        )}
        </section>

        <section
          id="maintenance"
          className={`${styles.panel} ${styles.anchorSection} ${styles.dashboardPanel} ${styles.dashboardPanelWide}`}
        >
        <div className={styles.panelHeader}>
          <div>
            <h2>Maintenance tasks</h2>
            <p>Track open repairs, contractor appointments, and resident requests in one view.</p>
          </div>
          <dl className={styles.summaryList}>
            <div>
              <dt>Open</dt>
              <dd>{openMaintenanceTasks.length}</dd>
            </div>
            <div>
              <dt>Due soon</dt>
              <dd>{dueSoonMaintenanceTasks.length}</dd>
            </div>
            <div>
              <dt>Overdue</dt>
              <dd>{overdueMaintenanceTasks.length}</dd>
            </div>
          </dl>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading maintenance tasks…</p>
        ) : maintenanceTaskList.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Task</th>
                  <th>Property</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceTaskList.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className={styles.primaryText}>
                        {task.dueAt ? formatDate(task.dueAt) : 'No due date'}
                      </div>
                      {task.overdue ? (
                        <div className={`${styles.badge} ${styles.maintenanceBadgeOverdue}`}>Overdue</div>
                      ) : task.dueSoon ? (
                        <div className={`${styles.badge} ${styles.maintenanceBadgeSoon}`}>Due soon</div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.primaryText}>{task.title}</div>
                      {task.priorityLabel ? (
                        <div className={`${styles.maintenancePriority}`} data-level={task.priority}>
                          {task.priorityLabel}
                        </div>
                      ) : null}
                      {task.reporter?.name ? (
                        <div className={styles.meta}>Reported by {task.reporter.name}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.primaryText}>
                        {task.property?.title || 'Unlinked property'}
                      </div>
                      {task.property?.address ? (
                        <div className={styles.meta}>{task.property.address}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.maintenanceStatus} data-tone={task.statusTone}>
                        {task.statusLabel}
                      </div>
                      {task.assignee?.name ? (
                        <div className={styles.meta}>Assigned to {task.assignee.name}</div>
                      ) : null}
                      {task.costEstimate != null ? (
                        <div className={styles.meta}>
                          {`Est. cost ${
                            formatAdminCurrency(task.costEstimate, {
                              currency: 'GBP',
                              maximumFractionDigits: 0,
                            }) || '—'
                          }`}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No maintenance items in progress.</p>
        )}
        </section>

        <section
          id="email-settings"
          className={`${styles.panel} ${styles.anchorSection} ${styles.dashboardPanel}`}
        >
          <div className={styles.panelHeader}>
            <div>
              <h2>Microsoft 365 email</h2>
              <p>
                Connect the info@aktonz.com mailbox so Aktonz can send website forms through Microsoft
                Graph.
              </p>
              <div className={styles.panelLinks}>
                <Link href="/admin/email" className={styles.panelLink}>
                  Open email settings
                </Link>
              </div>
            </div>
            <div className={styles.integrationActions}>
              <div className={styles.integrationState}>
                <span
                  className={styles.integrationStatusBadge}
                  data-tone={microsoftConnection.badgeTone}
                >
                  {microsoftConnection.badgeLabel}
                </span>
                {microsoftConnection.detail ? (
                  <p className={styles.integrationStateMessage}>{microsoftConnection.detail}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleConnectClick}
                className={styles.integrationButton}
                disabled={microsoftConnection.buttonDisabled}
              >
                {microsoftConnection.buttonLabel}
              </button>
            </div>
          </div>
          {microsoftConnection.banner ? (
            <p
              role="status"
              className={`${styles.integrationAlert} ${
                integrationAlertToneClasses[microsoftConnection.banner.tone] || ''
              }`}
            >
              {microsoftConnection.banner.message}
            </p>
          ) : null}
          {showQueryMessage ? (
            <p
              role="status"
              className={`${styles.integrationAlert} ${
                integrationAlertToneClasses[
                  integrationStatus === 'success' ? 'success' : 'error'
                ] || ''
              }`}
            >
              {integrationStatusMessage}
            </p>
          ) : null}
          <div className={styles.integrationDetails}>
            <ul className={styles.integrationList}>
              <li>Sign in with info@aktonz.com when Microsoft prompts for an account.</li>
              <li>Grant the requested permissions so Aktonz can send messages via Microsoft Graph.</li>
              <li>Tokens are encrypted and saved to <code>.aktonz-ms-tokens.json</code> on the server.</li>
            </ul>
            <p className={styles.integrationStatus}>
              Need help? Visit the <Link href="/admin/email">email workspace</Link> for a full
              breakdown.
            </p>
          </div>
        </section>
      </div>
    </>,
    true,
  );
}
