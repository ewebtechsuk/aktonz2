import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

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
  const { user, loading: sessionLoading } = useSession();
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
              </ul>
            </nav>
          ) : null}
        </div>
      </header>
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
            You need to <Link href="/login">sign in with an admin account</Link> to manage valuation requests and
            offers.
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

      <section id="valuations" className={`${styles.panel} ${styles.anchorSection}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Valuation requests</h2>
            <p>Acaboom captures these valuation leads from the website and synchronises them here.</p>
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
                      {valuation.presentation ? (
                        <div className={styles.meta}>
                          Style{' '}
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
                        <div className={styles.meta}>Sent {formatDate(valuation.presentation.sentAt)}</div>
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

      <section id="viewings" className={`${styles.panel} ${styles.anchorSection}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Viewings schedule</h2>
            <p>Coordinate upcoming viewings and keep the team aligned.</p>
          </div>
        </div>
        <p className={styles.emptyState}>Viewing management tools are coming soon.</p>
      </section>

      <section id="offers" className={`${styles.panel} ${styles.anchorSection}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Offers pipeline</h2>
            <p>Review live sale and tenancy offers captured across the Aktonz platform.</p>
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
                      {offer.property?.address ? <div className={styles.meta}>{offer.property.address}</div> : null}
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
