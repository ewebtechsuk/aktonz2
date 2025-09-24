import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminOffers.module.css';

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

function normalizeRouteId(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

export default function AdminOffersPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const loadOffers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/offers');
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const payload = await response.json();
      const entries = Array.isArray(payload.offers) ? payload.offers.slice() : [];
      entries.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setOffers(entries);
    } catch (err) {
      console.error(err);
      setError('Unable to load the offers pipeline. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setOffers([]);
      setLoading(false);
      return;
    }

    loadOffers();
  }, [isAdmin, loadOffers]);

  const sortedOffers = useMemo(() => offers.slice(), [offers]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const routeId = normalizeRouteId(router.query.id);
    if (routeId) {
      setSelectedId(routeId);
    }
  }, [router.isReady, router.query.id]);

  useEffect(() => {
    if (!sortedOffers.length) {
      return;
    }

    const routeId = router.isReady ? normalizeRouteId(router.query.id) : null;
    if (routeId && sortedOffers.some((offer) => offer.id === routeId)) {
      return;
    }

    const activeId = selectedId && sortedOffers.some((offer) => offer.id === selectedId)
      ? selectedId
      : sortedOffers[0]?.id;

    if (activeId && activeId !== routeId) {
      setSelectedId(activeId);
      if (router.isReady) {
        router.replace(
          { pathname: '/admin/offers', query: { id: activeId } },
          `/admin/offers?id=${activeId}`,
          { shallow: true },
        );
      }
    }
  }, [sortedOffers, router, selectedId]);

  const selectedOffer = useMemo(
    () => sortedOffers.find((offer) => offer.id === selectedId) || null,
    [sortedOffers, selectedId],
  );

  const handleSelectOffer = useCallback(
    (offerId) => {
      if (!offerId || offerId === selectedId) {
        return;
      }

      setSelectedId(offerId);
      if (router.isReady) {
        router.replace(
          { pathname: '/admin/offers', query: { id: offerId } },
          `/admin/offers?id=${offerId}`,
          { shallow: true },
        );
      }
    },
    [router, selectedId],
  );

  if (sessionLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Checking your admin access…</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.tableSection}>
            <p className={styles.emptyState}>
              You need to <Link href="/login">sign in with an admin account</Link> to review and manage offers.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Aktonz Admin — Offers workspace</title>
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">← Back to dashboard</Link>
            </p>
            <div className={styles.headerTop}>
              <div>
                <h1>Manage offers pipeline</h1>
                <p>Track negotiations, review contact details and keep the sales and lettings pipeline aligned.</p>
              </div>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={loadOffers}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
            {error ? <div className={styles.errorMessage}>{error}</div> : null}
          </header>

          <div className={styles.content}>
            <section className={styles.tableSection}>
              {loading && !sortedOffers.length ? (
                <p className={styles.loading}>Loading offers…</p>
              ) : sortedOffers.length ? (
                <div className={styles.tableWrapper}>
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
                      {sortedOffers.map((offer) => (
                        <tr
                          key={offer.id}
                          data-active={offer.id === selectedId}
                          onClick={() => handleSelectOffer(offer.id)}
                        >
                          <td>
                            <div className={styles.primaryCell}>
                              <strong>{formatDate(offer.date)}</strong>
                              {offer.agent?.name ? (
                                <span className={styles.muted}>Handled by {offer.agent.name}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className={styles.primaryCell}>
                              <strong>{offer.property?.title || 'Unlinked property'}</strong>
                              {offer.property?.address ? (
                                <span className={styles.muted}>{offer.property.address}</span>
                              ) : null}
                              {offer.property?.link ? (
                                <a
                                  href={offer.property.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.tableLink}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  View listing
                                </a>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className={styles.primaryCell}>
                              <strong>{offer.contact?.name || 'Unknown contact'}</strong>
                              {offer.contact?.email ? (
                                <a
                                  href={`mailto:${offer.contact.email}`}
                                  className={styles.tableLink}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {offer.contact.email}
                                </a>
                              ) : null}
                              {offer.contact?.phone ? (
                                <a
                                  href={`tel:${offer.contact.phone}`}
                                  className={styles.tableLink}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {offer.contact.phone}
                                </a>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className={styles.primaryCell}>
                              <strong>{offer.amount || '—'}</strong>
                              <span
                                className={`${styles.offerTag} ${
                                  offer.type === 'sale' ? styles.offerTagSale : styles.offerTagRent
                                }`}
                              >
                                {offer.type === 'sale' ? 'Sale offer' : 'Tenancy offer'}
                              </span>
                              {offer.status ? (
                                <span className={styles.muted}>{offer.status}</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.emptyState}>No live offers captured yet.</p>
              )}
            </section>

            <section className={styles.detailPanel}>
              {!sortedOffers.length && !loading ? (
                <p className={styles.emptyState}>
                  <strong>No offers in flight.</strong> Once offers are submitted across the platform they will appear here.
                </p>
              ) : !selectedOffer ? (
                <p className={styles.emptyState}>Select an offer from the table to see the full context.</p>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <h2>
                      {selectedOffer.contact?.name || 'Prospect'}
                    </h2>
                    <div
                      className={`${styles.offerTag} ${
                        selectedOffer.type === 'sale' ? styles.offerTagSale : styles.offerTagRent
                      }`}
                    >
                      {selectedOffer.type === 'sale' ? 'Sale offer' : 'Tenancy offer'}
                    </div>
                  </div>

                  <div className={styles.detailSummary}>
                    {selectedOffer.contact?.email ? (
                      <a href={`mailto:${selectedOffer.contact.email}`}>{selectedOffer.contact.email}</a>
                    ) : null}
                    {selectedOffer.contact?.phone ? (
                      <a href={`tel:${selectedOffer.contact.phone}`}>{selectedOffer.contact.phone}</a>
                    ) : null}
                    {selectedOffer.agent?.name ? (
                      <span className={styles.muted}>Assigned agent: {selectedOffer.agent.name}</span>
                    ) : null}
                  </div>

                  <dl className={styles.metaGrid}>
                    <div>
                      <dt>Received</dt>
                      <dd>{formatDate(selectedOffer.date)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedOffer.status || 'Pending review'}</dd>
                    </div>
                    <div>
                      <dt>Offer amount</dt>
                      <dd className={styles.highlight}>{selectedOffer.amount || '—'}</dd>
                    </div>
                    {selectedOffer.property?.address ? (
                      <div>
                        <dt>Property</dt>
                        <dd>{selectedOffer.property.address}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {selectedOffer.notes ? (
                    <p className={styles.notes}>{selectedOffer.notes}</p>
                  ) : (
                    <p className={styles.muted}>No additional notes recorded yet.</p>
                  )}

                  {selectedOffer.property?.link ? (
                    <a
                      href={selectedOffer.property.link}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.tableLink}
                    >
                      View property listing
                    </a>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
