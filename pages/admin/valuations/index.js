import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminValuations.module.css';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'valuation_sent', label: 'Valuation Sent' },
  { value: 'lost', label: 'Lost' },
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

function formatStatusLabel(status, options) {
  const option = options.find((entry) => entry.value === status);
  if (option) {
    return option.label;
  }

  return options.length ? options[0].label : status;
}

function resolveStatusOptions(payload) {
  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => entry && typeof entry === 'object' && entry.value)
      .map((entry) => ({
        value: entry.value,
        label:
          entry.label ||
          String(entry.value)
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
      }));
  }

  if (Array.isArray(payload?.statuses)) {
    return payload.statuses.map((value) => ({
      value,
      label: String(value)
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    }));
  }

  if (Array.isArray(payload?.statusOptions)) {
    return resolveStatusOptions(payload.statusOptions);
  }

  return DEFAULT_STATUS_OPTIONS;
}

function normalizeRouteId(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return typeof value === 'string' ? value : null;
}

function toDateTimeLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

export default function AdminValuationsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [valuations, setValuations] = useState([]);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formState, setFormState] = useState({
    status: DEFAULT_STATUS_OPTIONS[0].value,
    appointmentAt: '',
    notes: '',
  });

  const loadValuations = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/valuations');
      if (!response.ok) {
        throw new Error('Failed to fetch valuations');
      }

      const payload = await response.json();
      const entries = Array.isArray(payload.valuations) ? payload.valuations.slice() : [];
      entries.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
      setValuations(entries);

      const nextStatusOptions = resolveStatusOptions(payload);
      if (nextStatusOptions.length) {
        setStatusOptions(nextStatusOptions);
      } else {
        setStatusOptions(DEFAULT_STATUS_OPTIONS);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load valuation requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setValuations([]);
      setLoading(false);
      return;
    }

    loadValuations();
  }, [isAdmin, loadValuations]);

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
    if (!valuations.length) {
      return;
    }

    const routeId = router.isReady ? normalizeRouteId(router.query.id) : null;
    if (routeId && valuations.some((entry) => entry.id === routeId)) {
      return;
    }

    const activeId = selectedId && valuations.some((entry) => entry.id === selectedId)
      ? selectedId
      : valuations[0]?.id;

    if (activeId && activeId !== routeId) {
      setSelectedId(activeId);
      if (router.isReady) {
        router.replace(
          { pathname: '/admin/valuations/[id]', query: { id: activeId } },
          `/admin/valuations/${activeId}`,
          { shallow: true },
        );
      }
    }
  }, [valuations, router, selectedId]);

  const selectedValuation = useMemo(
    () => valuations.find((entry) => entry.id === selectedId) || null,
    [valuations, selectedId],
  );

  useEffect(() => {
    if (!selectedValuation) {
      return;
    }

    setFormState({
      status: selectedValuation.status || statusOptions[0]?.value || 'new',
      appointmentAt: toDateTimeLocalInputValue(selectedValuation.appointmentAt),
      notes: selectedValuation.notes || '',
    });
    setFormError(null);
    setSuccessMessage('');
  }, [selectedValuation, statusOptions]);

  const handleSelectValuation = useCallback(
    (id) => {
      if (!id || id === selectedId) {
        return;
      }

      setSelectedId(id);
      setFormError(null);
      setSuccessMessage('');
      if (router.isReady) {
        router.replace(
          { pathname: '/admin/valuations/[id]', query: { id } },
          `/admin/valuations/${id}`,
          { shallow: true },
        );
      }
    },
    [router, selectedId],
  );

  const handleResetForm = useCallback(() => {
    if (!selectedValuation) {
      return;
    }

    setFormState({
      status: selectedValuation.status || statusOptions[0]?.value || 'new',
      appointmentAt: toDateTimeLocalInputValue(selectedValuation.appointmentAt),
      notes: selectedValuation.notes || '',
    });
    setFormError(null);
    setSuccessMessage('');
  }, [selectedValuation, statusOptions]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedValuation) {
        return;
      }

      const payload = { id: selectedValuation.id };
      let hasChanges = false;

      const nextStatus = formState.status || statusOptions[0]?.value || 'new';
      if (nextStatus !== (selectedValuation.status || statusOptions[0]?.value || 'new')) {
        payload.status = nextStatus;
        hasChanges = true;
      }

      const currentAppointmentValue = toDateTimeLocalInputValue(selectedValuation.appointmentAt);
      const nextAppointmentValue = formState.appointmentAt;
      if (nextAppointmentValue !== currentAppointmentValue) {
        if (nextAppointmentValue) {
          const parsed = new Date(nextAppointmentValue);
          if (Number.isNaN(parsed.getTime())) {
            setFormError('Enter a valid appointment date and time.');
            return;
          }
          payload.appointmentAt = parsed.toISOString();
        } else {
          payload.appointmentAt = null;
        }
        hasChanges = true;
      }

      const nextNotes = formState.notes ?? '';
      const currentNotes = selectedValuation.notes ?? '';
      if (nextNotes !== currentNotes) {
        payload.notes = nextNotes;
        hasChanges = true;
      }

      if (!hasChanges) {
        setFormError(null);
        setSuccessMessage('No changes to save — this valuation is already up to date.');
        return;
      }

      setSaving(true);
      setFormError(null);
      setSuccessMessage('');

      try {
        const response = await fetch('/api/admin/valuations', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update valuation');
        }

        const { valuation: updated } = await response.json();
        setValuations((current) =>
          current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)),
        );
        setSuccessMessage('Valuation updated successfully.');
      } catch (err) {
        console.error(err);
        setFormError('Unable to save the valuation changes. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [formState, selectedValuation, statusOptions],
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
          <section className={styles.detailPanel}>
            <p className={styles.emptyState}>
              You need to <Link href="/login">sign in with an admin account</Link> to manage valuation requests.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Aktonz Admin — Valuation requests</title>
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">← Back to dashboard</Link>
            </p>
            <div className={styles.headerTop}>
              <div>
                <h1>Manage valuation requests</h1>
                <p>Review enquiry details, log appointment notes and keep statuses in sync with your team.</p>
              </div>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={loadValuations}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
            {error ? <div className={styles.error}>{error}</div> : null}
          </header>

          <div className={styles.content}>
            <aside className={styles.listPanel}>
              <div className={styles.listHeader}>
                <h2>Valuation requests</h2>
                <p>Select a request to view the full record.</p>
              </div>
              {loading && !valuations.length ? (
                <p className={styles.loading}>Loading valuation requests…</p>
              ) : valuations.length ? (
                <ul className={styles.list}>
                  {valuations.map((valuation) => (
                    <li key={valuation.id}>
                      <button
                        type="button"
                        data-active={valuation.id === selectedId}
                        onClick={() => handleSelectValuation(valuation.id)}
                      >
                        <span className={styles.listPrimary}>
                          {valuation.firstName} {valuation.lastName}
                        </span>
                        <span className={styles.listMeta}>{formatDate(valuation.createdAt)}</span>
                        <span className={styles.listMeta}>
                          {formatStatusLabel(valuation.status, statusOptions)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyState}>No valuation requests to review just yet.</p>
              )}
            </aside>

            <section className={styles.detailPanel}>
              {!valuations.length && !loading ? (
                <p className={styles.emptyState}>
                  <strong>No valuation requests yet.</strong> Leads captured on the website will appear here ready for review.
                </p>
              ) : !selectedValuation ? (
                <p className={styles.emptyState}>Select a valuation from the list to see the full details.</p>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <h2>
                      {selectedValuation.firstName} {selectedValuation.lastName}
                    </h2>
                    <span className={styles.statusBadge}>
                      {formatStatusLabel(selectedValuation.status, statusOptions)}
                    </span>
                    <p className={styles.subtitle}>{selectedValuation.address}</p>
                  </div>

                  <div className={styles.contactLinks}>
                    {selectedValuation.email ? (
                      <a href={`mailto:${selectedValuation.email}`}>{selectedValuation.email}</a>
                    ) : null}
                    {selectedValuation.phone ? (
                      <a href={`tel:${selectedValuation.phone}`}>{selectedValuation.phone}</a>
                    ) : null}
                  </div>

                  <dl className={styles.metaGrid}>
                    <div>
                      <dt>Received</dt>
                      <dd>{formatDate(selectedValuation.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(selectedValuation.updatedAt)}</dd>
                    </div>
                    {selectedValuation.source ? (
                      <div>
                        <dt>Source</dt>
                        <dd>{selectedValuation.source}</dd>
                      </div>
                    ) : null}
                    {selectedValuation.appointmentAt ? (
                      <div>
                        <dt>Appointment</dt>
                        <dd>{formatDate(selectedValuation.appointmentAt)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {selectedValuation.presentation ? (
                    <div className={styles.presentationCard}>
                      <h3>Valuation style</h3>
                      <p className={styles.presentationMessage}>
                        {selectedValuation.presentation.title || selectedValuation.presentation.id}
                      </p>
                      {selectedValuation.presentation.presentationUrl ? (
                        <a
                          href={selectedValuation.presentation.presentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.presentationLink}
                        >
                          Open presentation
                        </a>
                      ) : null}
                      {selectedValuation.presentation.sentAt ? (
                        <p className={styles.presentationMeta}>
                          Sent {formatDate(selectedValuation.presentation.sentAt)}
                        </p>
                      ) : null}
                      {selectedValuation.presentation.message ? (
                        <p className={styles.presentationMessage}>
                          {selectedValuation.presentation.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {successMessage ? <div className={styles.success}>{successMessage}</div> : null}
                  {formError ? <div className={styles.error}>{formError}</div> : null}

                  <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                      <label htmlFor="valuation-status">Status</label>
                      <select
                        id="valuation-status"
                        value={formState.status}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, status: event.target.value }))
                        }
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="valuation-appointment">Appointment</label>
                      <input
                        id="valuation-appointment"
                        type="datetime-local"
                        value={formState.appointmentAt}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, appointmentAt: event.target.value }))
                        }
                      />
                      <p className={styles.helperText}>Leave blank if no appointment is scheduled.</p>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="valuation-notes">Notes</label>
                      <textarea
                        id="valuation-notes"
                        value={formState.notes}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, notes: event.target.value }))
                        }
                      />
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryButton} disabled={saving}>
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleResetForm}
                        disabled={saving}
                      >
                        Reset
                      </button>
                    </div>
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
