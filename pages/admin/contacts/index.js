import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminContacts.module.css';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return typeof value === 'string' ? value : '—';
  }
}

function formatContactType(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFiltersObject(source) {
  return {
    name: source?.name || '',
    email: source?.email || '',
    phone: source?.phone || '',
  };
}

export default function AdminContactsPage() {
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [filters, setFilters] = useState(() => buildFiltersObject({}));
  const [appliedFilters, setAppliedFilters] = useState(() => buildFiltersObject({}));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [contacts, setContacts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const filtersKey = useMemo(
    () => `${appliedFilters.name || ''}|${appliedFilters.email || ''}|${appliedFilters.phone || ''}`,
    [appliedFilters],
  );
  const previousFiltersKeyRef = useRef(filtersKey);
  const previousPageSizeRef = useRef(pageSize);
  const contactCount = contacts.length;

  const applyFilters = useCallback((nextFilters) => {
    setAppliedFilters((current) => {
      const next = buildFiltersObject(nextFilters || {});
      if (
        current.name === next.name &&
        current.email === next.email &&
        current.phone === next.phone
      ) {
        return current;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      applyFilters(filters);
    }, 400);

    return () => clearTimeout(handle);
  }, [filters, applyFilters]);

  const loadContacts = useCallback(
    async ({ page: targetPage, pageSize: targetPageSize, filters: targetFilters } = {}) => {
      if (!isAdmin) {
        return;
      }

      const resolvedPage = Number.isFinite(targetPage) && targetPage > 0 ? targetPage : 1;
      const resolvedPageSize =
        Number.isFinite(targetPageSize) && targetPageSize > 0
          ? targetPageSize
          : PAGE_SIZE_OPTIONS[0];
      const activeFilters = buildFiltersObject(targetFilters || appliedFilters);

      const params = new URLSearchParams();
      params.set('page', String(resolvedPage));
      params.set('pageSize', String(resolvedPageSize));

      const trimmedName = activeFilters.name.trim();
      const trimmedEmail = activeFilters.email.trim();
      const trimmedPhone = activeFilters.phone.trim();

      if (trimmedName) {
        params.set('name', trimmedName);
      }
      if (trimmedEmail) {
        params.set('email', trimmedEmail);
      }
      if (trimmedPhone) {
        params.set('phone', trimmedPhone);
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/contacts?${params.toString()}`);
        if (!response.ok) {
          let message = 'Failed to fetch contacts';
          try {
            const payload = await response.json();
            if (payload?.error) {
              message = payload.error;
            }
          } catch (err) {
            // ignore JSON parse errors
          }
          throw new Error(message);
        }

        const payload = await response.json();
        const nextContacts = Array.isArray(payload?.contacts) ? payload.contacts : [];
        setContacts(nextContacts);

        const resolvedTotal = Number.isFinite(payload?.totalCount) && payload.totalCount >= 0
          ? payload.totalCount
          : nextContacts.length;
        setTotalCount(resolvedTotal);

        const resolvedPageSizeFromPayload =
          Number.isFinite(payload?.pageSize) && payload.pageSize > 0
            ? payload.pageSize
            : resolvedPageSize;

        setPageSize((current) =>
          resolvedPageSizeFromPayload && current !== resolvedPageSizeFromPayload
            ? resolvedPageSizeFromPayload
            : current,
        );

        const computedPageCount = Number.isFinite(payload?.pageCount) && payload.pageCount >= 0
          ? payload.pageCount
          : resolvedTotal && resolvedPageSizeFromPayload
          ? Math.ceil(resolvedTotal / resolvedPageSizeFromPayload)
          : 0;
        setPageCount(computedPageCount);

        const serverPage = Number.isFinite(payload?.page) && payload.page > 0 ? payload.page : resolvedPage;
        setPage((current) => (serverPage && current !== serverPage ? serverPage : current));

        const nextHasNext =
          typeof payload?.hasNextPage === 'boolean'
            ? payload.hasNextPage
            : computedPageCount
            ? serverPage < computedPageCount
            : nextContacts.length === resolvedPageSizeFromPayload;
        setHasNextPage(Boolean(nextHasNext));

        const nextHasPrevious =
          typeof payload?.hasPreviousPage === 'boolean' ? payload.hasPreviousPage : serverPage > 1;
        setHasPreviousPage(Boolean(nextHasPrevious));
      } catch (err) {
        console.error('Failed to fetch admin contacts', err);
        setContacts([]);
        setTotalCount(0);
        setPageCount(0);
        setHasNextPage(false);
        setHasPreviousPage(false);
        setError(err instanceof Error ? err.message : 'Unable to load contacts. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, isAdmin],
  );

  useEffect(() => {
    if (!isAdmin) {
      setContacts([]);
      setTotalCount(0);
      setPageCount(0);
      setHasNextPage(false);
      setHasPreviousPage(false);
      setLoading(false);
      setError(null);
      return;
    }

    const filtersChanged = previousFiltersKeyRef.current !== filtersKey;
    const pageSizeChanged = previousPageSizeRef.current !== pageSize;

    if ((filtersChanged || pageSizeChanged) && page !== 1) {
      previousFiltersKeyRef.current = filtersKey;
      previousPageSizeRef.current = pageSize;
      setPage(1);
      return;
    }

    previousFiltersKeyRef.current = filtersKey;
    previousPageSizeRef.current = pageSize;

    loadContacts({ page, pageSize, filters: appliedFilters });
  }, [isAdmin, page, pageSize, appliedFilters, filtersKey, loadContacts]);

  const handleFilterChange = useCallback((event) => {
    const { name: fieldName, value } = event.target;
    setFilters((current) => ({ ...current, [fieldName]: value }));
  }, []);

  const handleFilterSubmit = useCallback(
    (event) => {
      event.preventDefault();
      applyFilters(filters);
    },
    [applyFilters, filters],
  );

  const handleClearFilters = useCallback(() => {
    const empty = buildFiltersObject({});
    setFilters(empty);
    applyFilters(empty);
  }, [applyFilters]);

  const handleManualRefresh = useCallback(() => {
    if (!isAdmin) {
      return;
    }

    loadContacts({ page, pageSize, filters: appliedFilters });
  }, [isAdmin, loadContacts, page, pageSize, appliedFilters]);

  const handlePageSizeChange = useCallback((event) => {
    const nextSize = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(nextSize) && nextSize > 0) {
      setPageSize(nextSize);
    }
  }, []);

  const handleNextPage = useCallback(() => {
    if (hasNextPage && !loading) {
      setPage((current) => current + 1);
    }
  }, [hasNextPage, loading]);

  const handlePreviousPage = useCallback(() => {
    if (hasPreviousPage && !loading) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [hasPreviousPage, loading]);

  const visibleTotalPages = useMemo(() => {
    if (pageCount) {
      return pageCount;
    }
    if (totalCount && pageSize) {
      return Math.max(1, Math.ceil(totalCount / pageSize));
    }
    return 0;
  }, [pageCount, totalCount, pageSize]);

  const rangeStart = useMemo(() => {
    if (!totalCount) {
      return 0;
    }
    return (page - 1) * pageSize + 1;
  }, [page, pageSize, totalCount]);

  const rangeEnd = useMemo(() => {
    if (!totalCount) {
      return 0;
    }
    return Math.min(totalCount, rangeStart + contactCount - 1);
  }, [contactCount, rangeStart, totalCount]);

  if (sessionLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.contentCard}>
            <p className={styles.loading}>Checking your admin access…</p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.contentCard}>
            <p className={styles.signinNotice}>
              You need to <Link href="/login">sign in with an admin account</Link> to manage contacts.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Aktonz Admin — Contacts workspace</title>
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.breadcrumb}>
              <Link href="/admin">← Back to dashboard</Link>
            </p>
            <div className={styles.headerTop}>
              <div>
                <h1>Contacts workspace</h1>
                <p>Search, filter and review Apex27 contacts directly from the admin portal.</p>
              </div>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={handleManualRefresh}
                disabled={loading}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </header>

          <section className={styles.contentCard}>
            <form className={styles.filtersForm} onSubmit={handleFilterSubmit}>
              <div className={styles.filtersGrid}>
                <div className={styles.filterField}>
                  <label htmlFor="filter-name">Name</label>
                  <input
                    id="filter-name"
                    name="name"
                    className={styles.filterInput}
                    placeholder="Search by name"
                    value={filters.name}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className={styles.filterField}>
                  <label htmlFor="filter-email">Email</label>
                  <input
                    id="filter-email"
                    name="email"
                    className={styles.filterInput}
                    placeholder="Search by email"
                    value={filters.email}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className={styles.filterField}>
                  <label htmlFor="filter-phone">Phone</label>
                  <input
                    id="filter-phone"
                    name="phone"
                    className={styles.filterInput}
                    placeholder="Search by phone"
                    value={filters.phone}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className={styles.filterField}>
                  <label htmlFor="filter-page-size">Rows per page</label>
                  <select
                    id="filter-page-size"
                    className={styles.filterSelect}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.filtersActions}>
                <button type="submit" className={styles.applyButton} disabled={loading}>
                  {loading ? 'Filtering…' : 'Apply filters'}
                </button>
                <button type="button" className={styles.resetButton} onClick={handleClearFilters} disabled={loading}>
                  Clear filters
                </button>
              </div>
            </form>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            {loading && !contactCount ? (
              <div className={styles.loadingState}>
                <p>Loading contacts…</p>
              </div>
            ) : contactCount ? (
              <>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Contact</th>
                        <th scope="col">Email</th>
                        <th scope="col">Phone</th>
                        <th scope="col">Branch</th>
                        <th scope="col">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, index) => {
                        const key = contact?.id || contact?.email || contact?.phone || `contact-${index}`;
                        const typeLabel = formatContactType(contact?.type);
                        return (
                          <tr key={key}>
                            <td>
                              <div className={styles.nameCell}>
                                <strong>{contact?.name || 'Unnamed contact'}</strong>
                                {contact?.id ? (
                                  <span className={styles.muted}>ID: {contact.id}</span>
                                ) : null}
                                {typeLabel ? <span className={styles.statusBadge}>{typeLabel}</span> : null}
                              </div>
                            </td>
                            <td>
                              {contact?.email ? (
                                <a href={`mailto:${contact.email}`} className={styles.tableLink}>
                                  {contact.email}
                                </a>
                              ) : (
                                <span className={styles.muted}>—</span>
                              )}
                            </td>
                            <td>
                              {contact?.phone ? (
                                <a href={`tel:${contact.phone}`} className={styles.tableLink}>
                                  {contact.phone}
                                </a>
                              ) : (
                                <span className={styles.muted}>—</span>
                              )}
                            </td>
                            <td>{contact?.branch ? contact.branch : <span className={styles.muted}>—</span>}</td>
                            <td>{formatDateTime(contact?.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.tableFooter}>
                  <div className={styles.pagination}>
                    <div className={styles.stats}>
                      {totalCount
                        ? `Showing ${rangeStart}–${rangeEnd} of ${totalCount} contacts` +
                          (visibleTotalPages ? ` • Page ${page} of ${visibleTotalPages}` : '')
                        : 'No contacts found'}
                    </div>
                    <div className={styles.paginationControls}>
                      <button type="button" onClick={handlePreviousPage} disabled={loading || !hasPreviousPage}>
                        Previous
                      </button>
                      <button type="button" onClick={handleNextPage} disabled={loading || !hasNextPage}>
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>No contacts match your filters yet. Try adjusting your search terms.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
