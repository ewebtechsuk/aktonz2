import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import styles from '../../../styles/AdminOffers.module.css';
import {
  formatOfferStatusLabel,
  getOfferStatusOptions,
} from '../../../lib/offer-statuses.js';
import { resolveTimestamp } from '../../../lib/timestamps.js';

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

function formatDateOnly(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function toInputDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function formatActor(actor) {
  if (!actor) {
    return '';
  }

  if (actor.name) {
    return actor.name;
  }

  if (actor.type === 'admin') {
    return 'Aktonz admin';
  }

  if (actor.type === 'applicant') {
    return 'Applicant';
  }

  return '';
}

function normalizeRouteId(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

function parseHouseholdSize(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

function getOfferSortTimestamp(offer) {
  if (!offer) {
    return 0;
  }

  return resolveTimestamp(offer.updatedAt, offer.date);
}

const STATUS_OPTIONS = getOfferStatusOptions();

export default function AdminOffersPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';
  const pageTitle = 'Aktonz Admin — Offers workspace';

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: '',
    note: '',
    moveInDate: '',
    householdSize: '',
    referencingConsent: false,
    hasPets: false,
    employmentStatus: '',
    proofOfFunds: '',
    additionalConditions: '',
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

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
      entries.sort((a, b) => getOfferSortTimestamp(b) - getOfferSortTimestamp(a));
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
  const compliance = selectedOffer?.compliance || {};
  const timelineEntries = useMemo(() => {
    if (!selectedOffer) {
      return [];
    }

    const history = Array.isArray(selectedOffer.statusHistory)
      ? selectedOffer.statusHistory.slice()
      : [];

    history.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );

    return history;
  }, [selectedOffer]);

  useEffect(() => {
    if (!selectedOffer) {
      return;
    }

    const compliance = selectedOffer.compliance || {};
    setStatusForm({
      status: selectedOffer.status || '',
      note: '',
      moveInDate: toInputDate(compliance.moveInDate),
      householdSize:
        compliance.householdSize != null ? String(compliance.householdSize) : '',
      referencingConsent: Boolean(compliance.referencingConsent),
      hasPets: Boolean(compliance.hasPets),
      employmentStatus: compliance.employmentStatus || '',
      proofOfFunds: compliance.proofOfFunds || '',
      additionalConditions: compliance.additionalConditions || '',
    });
    setUpdateError('');
    setUpdateSuccess('');
  }, [selectedOffer]);

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

  const handleStatusFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleStatusCheckboxChange = useCallback((event) => {
    const { name, checked } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const handleStatusSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedOffer) {
        return;
      }

      setUpdating(true);
      setUpdateError('');
      setUpdateSuccess('');

      try {
        const compliancePayload = {
          moveInDate: statusForm.moveInDate || null,
          householdSize: parseHouseholdSize(statusForm.householdSize),
          referencingConsent: statusForm.referencingConsent,
          hasPets: statusForm.hasPets,
          employmentStatus: statusForm.employmentStatus || '',
          proofOfFunds: statusForm.proofOfFunds || '',
          additionalConditions: statusForm.additionalConditions || '',
        };

        const response = await fetch(`/api/admin/offers/${selectedOffer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statusForm.status || selectedOffer.status || undefined,
            note: statusForm.note,
            compliance: compliancePayload,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to update offer');
        }

        const updated = payload.offer;
        setOffers((prev) => {
          const next = prev.map((offer) => {
            if (offer.id !== updated.id) {
              return offer;
            }

            const merged = {
              ...offer,
              ...updated,
              amount: offer.amount,
              date: offer.date,
              type: offer.type,
              contact: offer.contact,
              property: offer.property,
              agent: offer.agent,
            };
            merged.statusLabel =
              updated.statusLabel || formatOfferStatusLabel(merged.status);
            return merged;
          });

          next.sort((a, b) => getOfferSortTimestamp(b) - getOfferSortTimestamp(a));
          return next;
        });

        setUpdateSuccess('Offer updated successfully.');
        setStatusForm((prev) => ({ ...prev, note: '' }));
      } catch (err) {
        console.error(err);
        setUpdateError(
          err instanceof Error ? err.message : 'Unable to update offer.',
        );
      } finally {
        setUpdating(false);
      }
    },
    [selectedOffer, statusForm],
  );

  if (sessionLoading) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
        </Head>
        <AdminNavigation items={[]} />
        <main className={styles.page}>
          <div className={styles.container}>
            <p className={styles.loading}>Checking your admin access…</p>
          </div>
        </main>
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
        <main className={styles.page}>
          <div className={styles.container}>
            <section className={styles.tableSection}>
              <p className={styles.emptyState}>
                You need to <Link href="/login">sign in with an admin account</Link> to review and manage offers.
              </p>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
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
                              <strong>{formatDate(offer.updatedAt || offer.date)}</strong>
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
                              <span className={styles.statusBadge}>
                                {offer.statusLabel || formatOfferStatusLabel(offer.status)}
                              </span>
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
                    <div>
                      <h2>{selectedOffer.contact?.name || 'Prospect'}</h2>
                      <p className={styles.detailSubtitle}>
                        {selectedOffer.property?.title ||
                          selectedOffer.property?.address ||
                          'Unlinked property'}
                      </p>
                    </div>
                    <div className={styles.detailBadges}>
                      <span
                        className={`${styles.offerTag} ${
                          selectedOffer.type === 'sale'
                            ? styles.offerTagSale
                            : styles.offerTagRent
                        }`}
                      >
                        {selectedOffer.type === 'sale' ? 'Sale offer' : 'Tenancy offer'}
                      </span>
                      <span className={styles.statusBadge}>
                        {selectedOffer.statusLabel ||
                          formatOfferStatusLabel(selectedOffer.status)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailSummary}>
                    {selectedOffer.contact?.email ? (
                      <a href={`mailto:${selectedOffer.contact.email}`}>
                        {selectedOffer.contact.email}
                      </a>
                    ) : null}
                    {selectedOffer.contact?.phone ? (
                      <a href={`tel:${selectedOffer.contact.phone}`}>
                        {selectedOffer.contact.phone}
                      </a>
                    ) : null}
                    {selectedOffer.agent?.name ? (
                      <span className={styles.muted}>
                        Assigned agent: {selectedOffer.agent.name}
                      </span>
                    ) : null}
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
                  </div>

                  <dl className={styles.metaGrid}>
                    <div>
                      <dt>Received</dt>
                      <dd>{formatDate(selectedOffer.date)}</dd>
                    </div>
                    <div>
                      <dt>Last update</dt>
                      <dd>{formatDate(selectedOffer.updatedAt || selectedOffer.date)}</dd>
                    </div>
                    <div>
                      <dt>Offer amount</dt>
                      <dd className={styles.highlight}>{selectedOffer.amount || '—'}</dd>
                    </div>
                    {selectedOffer.depositAmount ? (
                      <div>
                        <dt>Holding deposit</dt>
                        <dd>
                          {new Intl.NumberFormat('en-GB', {
                            style: 'currency',
                            currency: 'GBP',
                            minimumFractionDigits: 0,
                          }).format(Number(selectedOffer.depositAmount))}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <dl className={styles.complianceGrid}>
                    <div>
                      <dt>Move-in target</dt>
                      <dd>
                        {compliance.moveInDate
                          ? formatDateOnly(compliance.moveInDate)
                          : 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt>Household size</dt>
                      <dd>
                        {compliance.householdSize
                          ? compliance.householdSize
                          : 'Not declared'}
                      </dd>
                    </div>
                    <div>
                      <dt>Pets</dt>
                      <dd>{compliance.hasPets ? 'Pets declared' : 'No pets'}</dd>
                    </div>
                    <div>
                      <dt>Referencing</dt>
                      <dd>
                        {compliance.referencingConsent
                          ? 'Consent received'
                          : 'Consent pending'}
                      </dd>
                    </div>
                    {compliance.employmentStatus ? (
                      <div>
                        <dt>Employment</dt>
                        <dd>{compliance.employmentStatus}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {compliance.proofOfFunds ? (
                    <div className={styles.detailNoteBlock}>
                      <h3>Proof of funds</h3>
                      <p>{compliance.proofOfFunds}</p>
                    </div>
                  ) : null}

                  {compliance.additionalConditions ? (
                    <div className={styles.detailNoteBlock}>
                      <h3>Conditions</h3>
                      <p>{compliance.additionalConditions}</p>
                    </div>
                  ) : null}

                  <div className={styles.timelineCard}>
                    <h3>Negotiation timeline</h3>
                    <ol className={styles.timelineList}>
                      {timelineEntries.length ? (
                        timelineEntries.map((event) => (
                          <li key={event.id}>
                            <div className={styles.timelineHeader}>
                              <span className={styles.timelineLabel}>{event.label}</span>
                              {formatActor(event.actor) ? (
                                <span className={styles.timelineActor}>{formatActor(event.actor)}</span>
                              ) : null}
                            </div>
                            {event.note ? (
                              <p className={styles.timelineNote}>{event.note}</p>
                            ) : null}
                            <time
                              dateTime={event.createdAt || undefined}
                              className={styles.timelineDate}
                            >
                              {formatDate(event.createdAt)}
                            </time>
                          </li>
                        ))
                      ) : (
                        <li className={styles.timelineEmpty}>No timeline entries yet.</li>
                      )}
                    </ol>
                  </div>

                  <form className={styles.statusForm} onSubmit={handleStatusSubmit}>
                    <h3>Log progress</h3>
                    <div className={styles.statusFormGrid}>
                      <div className={styles.formGroup}>
                        <label htmlFor="status-stage">Stage</label>
                        <select
                          id="status-stage"
                          name="status"
                          value={statusForm.status}
                          onChange={handleStatusFieldChange}
                        >
                          <option value="">
                            Keep current —{' '}
                            {selectedOffer.statusLabel ||
                              formatOfferStatusLabel(selectedOffer.status)}
                          </option>
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="status-moveInDate">Move-in date</label>
                        <input
                          id="status-moveInDate"
                          name="moveInDate"
                          type="date"
                          value={statusForm.moveInDate}
                          onChange={handleStatusFieldChange}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="status-householdSize">Household size</label>
                        <input
                          id="status-householdSize"
                          name="householdSize"
                          type="number"
                          min="1"
                          value={statusForm.householdSize}
                          onChange={handleStatusFieldChange}
                        />
                      </div>
                    </div>

                    <div className={styles.statusFormGrid}>
                      <label className={styles.checkboxField} htmlFor="status-hasPets">
                        <input
                          id="status-hasPets"
                          name="hasPets"
                          type="checkbox"
                          checked={statusForm.hasPets}
                          onChange={handleStatusCheckboxChange}
                        />
                        Pets declared
                      </label>
                      <label
                        className={styles.checkboxField}
                        htmlFor="status-referencingConsent"
                      >
                        <input
                          id="status-referencingConsent"
                          name="referencingConsent"
                          type="checkbox"
                          checked={statusForm.referencingConsent}
                          onChange={handleStatusCheckboxChange}
                        />
                        Referencing consent received
                      </label>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="status-employmentStatus">Employment status</label>
                      <input
                        id="status-employmentStatus"
                        name="employmentStatus"
                        value={statusForm.employmentStatus}
                        onChange={handleStatusFieldChange}
                        placeholder="e.g. Full-time employed"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="status-proofOfFunds">Proof of funds</label>
                      <textarea
                        id="status-proofOfFunds"
                        name="proofOfFunds"
                        value={statusForm.proofOfFunds}
                        onChange={handleStatusFieldChange}
                        rows={3}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="status-additionalConditions">Conditions</label>
                      <textarea
                        id="status-additionalConditions"
                        name="additionalConditions"
                        value={statusForm.additionalConditions}
                        onChange={handleStatusFieldChange}
                        rows={3}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="status-note">Internal note</label>
                      <textarea
                        id="status-note"
                        name="note"
                        value={statusForm.note}
                        onChange={handleStatusFieldChange}
                        rows={3}
                        placeholder="Log landlord feedback, next actions or compliance updates"
                      />
                    </div>

                    {updateError ? (
                      <p className={styles.formError}>{updateError}</p>
                    ) : null}
                    {updateSuccess ? (
                      <p className={styles.formSuccess}>{updateSuccess}</p>
                    ) : null}

                    <button
                      type="submit"
                      className={styles.statusSubmit}
                      disabled={updating}
                    >
                      {updating ? 'Saving…' : 'Save update'}
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
