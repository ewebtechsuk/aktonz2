import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import styles from '../../styles/Admin.module.css';
import { useSession } from '../../components/SessionProvider';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'valuation_sent', label: 'Valuation Sent' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
];

const CLOSED_VALUATION_STATUSES = ['lost', 'archived'];

function formatDate(value) {
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
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectAuthorizationUrl, setConnectAuthorizationUrl] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const router = useRouter();
  const { user, loading: sessionLoading, clearSession, refresh } = useSession();
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [offersRes, valuationsRes] = await Promise.all([
        fetch('/api/admin/offers'),
        fetch('/api/admin/valuations'),
      ]);

      if (!offersRes.ok) {
        throw new Error('Failed to fetch offers');
      }
      if (!valuationsRes.ok) {
        throw new Error('Failed to fetch valuations');
      }

      const offersJson = await offersRes.json();
      const valuationsJson = await valuationsRes.json();

      setOffers(Array.isArray(offersJson.offers) ? offersJson.offers : []);
      setValuations(Array.isArray(valuationsJson.valuations) ? valuationsJson.valuations : []);

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
      console.error(err);
      setError('Unable to load the operations dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setOffers([]);
      setValuations([]);
      return;
    }

    loadData();
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

  const salesOffers = useMemo(
    () => offers.filter((offer) => offer.type === 'sale'),
    [offers],
  );
  const rentalOffers = useMemo(
    () => offers.filter((offer) => offer.type === 'rent'),
    [offers],
  );

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
      <header className={styles.adminHeader}>
        <div className={styles.adminHeaderInner}>
          <div className={styles.adminBrand}>
            <span className={styles.adminBrandName}>Aktonz</span>
            <span className={styles.adminBrandBadge}>Admin</span>
          </div>
          {showNavigation ? (
            <nav className={styles.adminNav} aria-label="Admin sections">
              <ul className={styles.adminNavList}>
                <li>
                  <a className={styles.adminNavLink} href="#email-settings">
                    Email
                  </a>
                </li>
                <li>
                  <a className={styles.adminNavLink} href="#valuations">
                    Valuations
                  </a>
                </li>
                <li>
                  <a className={styles.adminNavLink} href="#viewings">
                    Viewings
                  </a>
                </li>
                <li>
                  <a className={styles.adminNavLink} href="#offers">
                    Offers
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    className={styles.adminNavButton}
                    onClick={handleLogout}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? 'Signing out…' : 'Sign out'}
                  </button>
                </li>
              </ul>
            </nav>
          ) : null}
          {logoutError ? (
            <p className={styles.logoutError} role="alert">
              {logoutError}
            </p>
          ) : null}
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.container}>{content}</div>
      </main>
    </>
  );

  const handleConnectMicrosoft = useCallback(async () => {
    let popup = null;
    let authorizationUrl = null;

    if (typeof window !== 'undefined') {
      popup = window.open(
        '',
        'aktonzMicrosoftAuth',
        'noopener,noreferrer,width=600,height=720,menubar=no,toolbar=no,location=no,status=no',
      );

      if (popup && popup.document && popup.document.body) {
        popup.document.body.innerHTML = `<p style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; margin: 1.5rem;">Preparing Microsoft sign-in…</p>`;
      }
    }


    setConnectLoading(true);
    setConnectError(null);
    setConnectStatus(null);
    setConnectAuthorizationUrl(null);

    try {
      const response = await fetch('/api/admin/email/microsoft/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload && (payload.error || payload.message)) ||
          'Unable to start the Microsoft connection. Please try again.';
        throw new Error(message);
      }

      if (payload?.requiresConfiguration) {
        const missing = Array.isArray(payload?.missing)
          ? payload.missing.join(', ')
          : null;
        setConnectError(
          payload?.message ||
            (missing
              ? `Configure these Microsoft settings before connecting: ${missing}.`
              : 'Configure the Microsoft integration settings before connecting.'),
        );
        return;
      }

      if (payload?.authorizationUrl) {
        authorizationUrl = payload.authorizationUrl;
        setConnectAuthorizationUrl(payload.authorizationUrl);
        if (popup && !popup.closed) {
          popup.location.replace(payload.authorizationUrl);
          popup.focus();
        } else if (typeof window !== 'undefined') {
          window.open(payload.authorizationUrl, '_blank', 'noopener,noreferrer');

        }
      }

      if (payload?.message) {
        setConnectStatus(payload.message);
      } else {
        setConnectStatus('Follow the Microsoft 365 sign-in flow to finish configuring email.');
      }
    } catch (err) {
      console.error('Failed to start Microsoft connection', err);
      setConnectError(err?.message || 'Unable to start the Microsoft connection. Please try again.');

      if (popup && !popup.closed) {
        popup.close();
      }
    } finally {
      setConnectLoading(false);

      if (popup && !popup.closed) {
        if (authorizationUrl) {
          popup.focus();
        } else {
          popup.close();
        }
      }

    }
  }, []);

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
    'Aktonz Admin — Offers & valuations',
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>Operations</p>
          <h1 className={styles.pageTitle}>Offers & valuation requests</h1>
        </div>
        <button type="button" className={styles.refreshButton} onClick={loadData} disabled={loading}>
          Refresh
        </button>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section id="email-settings" className={`${styles.panel} ${styles.anchorSection}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Microsoft 365 email</h2>
            <p>Connect Aktonz to Microsoft 365 to automatically configure SMTP email delivery.</p>
          </div>
          <div className={styles.integrationActions}>
            <button
              type="button"
              className={styles.integrationButton}
              onClick={handleConnectMicrosoft}
              disabled={connectLoading}
              aria-label={
                connectLoading
                  ? 'Connecting to Microsoft 365'
                  : 'Connect Aktonz to Microsoft 365 email'
              }
            >
              {connectLoading ? 'Connecting…' : 'Connect Microsoft 365'}
            </button>
          </div>
        </div>
        <div className={styles.integrationDetails}>
          {connectError ? <p className={styles.integrationError}>{connectError}</p> : null}
          {connectStatus ? <p className={styles.integrationStatus}>{connectStatus}</p> : null}
          {connectAuthorizationUrl ? (
            <p className={styles.integrationStatus}>
              Not redirected?{' '}
              <a href={connectAuthorizationUrl}>Continue to Microsoft in a new tab</a>.
            </p>
          ) : null}
          <ul className={styles.integrationList}>
            <li>Sign in with the Microsoft 365 mailbox responsible for Aktonz email.</li>
            <li>Grant the requested permissions so we can retrieve SMTP configuration.</li>
            <li>Return to this dashboard once Microsoft confirms the connection.</li>
          </ul>
        </div>
      </section>

      <section id="valuations" className={`${styles.panel} ${styles.anchorSection}`}>
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

      <section id="offers" className={`${styles.panel} ${styles.anchorSection}`}>
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
                      {offer.notes ? <p className={styles.note}>{offer.notes}</p> : null}
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
    </>,
    true,
  );
}
