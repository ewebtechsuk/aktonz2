import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import styles from '../../styles/Admin.module.css';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

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

function formatStatusLabel(status) {
  const option = STATUS_OPTIONS.find((entry) => entry.value === status);
  return option ? option.label : STATUS_OPTIONS[0].label;
}

export default function AdminDashboard() {
  const [offers, setOffers] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = useCallback(async () => {
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
    } catch (err) {
      console.error(err);
      setError('Unable to load the operations dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    () => valuations.filter((valuation) => !['completed', 'archived'].includes(valuation.status || '')),
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

  return (
    <>
      <Head>
        <title>Aktonz Admin — Offers &amp; valuations</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <div>
              <p className={styles.pageEyebrow}>Operations</p>
              <h1 className={styles.pageTitle}>Offers &amp; valuation requests</h1>
            </div>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </button>
          </header>

          {error ? <div className={styles.error}>{error}</div> : null}

          <section className={styles.panel}>
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
                          {valuation.source ? (
                            <div className={styles.meta}>{valuation.source}</div>
                          ) : null}
                          {valuation.appointmentAt ? (
                            <div className={styles.meta}>Appointment {formatDate(valuation.appointmentAt)}</div>
                          ) : null}
                        </td>
                        <td>
                          <select
                            className={styles.statusSelect}
                            value={valuation.status || 'new'}
                            onChange={(event) =>
                              handleStatusChange(valuation, event.target.value)
                            }
                            disabled={updatingId === valuation.id}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className={styles.badge}>{formatStatusLabel(valuation.status)}</div>
                          {valuation.notes ? (
                            <p className={styles.note}>{valuation.notes}</p>
                          ) : null}
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

          <section className={styles.panel}>
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
                          {offer.status ? (
                            <div className={styles.meta}>{offer.status}</div>
                          ) : null}
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
        </div>
      </main>
    </>
  );
}
