import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminLettingsArchive.module.css';
import { formatAdminDate } from '../../../lib/admin/formatters';
import { withBasePath } from '../../../lib/base-path';

const VIEW_OPTIONS = [
  { value: 'available', label: 'Live instructions' },
  { value: 'archived', label: 'Archive' },
  { value: 'all', label: 'All lettings' },
];

function normalizeView(value) {
  if (value === 'archived' || value === 'all') {
    return value;
  }
  return 'available';
}

const DATE_ONLY = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const DATE_WITH_TIME = {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const formatted = formatAdminDate(value, DATE_ONLY);
  return formatted || '—';
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const formatted = formatAdminDate(value, DATE_WITH_TIME);
  return formatted || '—';
}

function formatRelativeTime(value) {
  if (!value) {
    return '';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} mo${diffMonths === 1 ? '' : 's'} ago`;
    }

    const diffYears = Math.round(diffMonths / 12);
    return `${diffYears} yr${diffYears === 1 ? '' : 's'} ago`;
  } catch (error) {
    return '';
  }
}

function buildQuery(filters) {
  const query = {};
  if (filters.view && filters.view !== 'available') {
    query.view = filters.view;
  }
  if (filters.search) {
    query.search = filters.search;
  }
  if (filters.statuses.length === 1) {
    [query.status] = filters.statuses;
  } else if (filters.statuses.length > 1) {
    query.status = filters.statuses;
  }
  return query;
}

export default function AdminLettingsArchivePage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [initialized, setInitialized] = useState(false);
  const [filters, setFilters] = useState({ view: 'available', search: '', statuses: [] });
  const [searchDraft, setSearchDraft] = useState('');
  const [listings, setListings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || initialized) {
      return;
    }

    const view = normalizeView(typeof router.query.view === 'string' ? router.query.view : 'available');
    const search = typeof router.query.search === 'string' ? router.query.search : '';
    const statusesRaw = router.query.status;
    const statuses = Array.isArray(statusesRaw)
      ? statusesRaw.map((status) => String(status).toLowerCase())
      : statusesRaw
      ? [String(statusesRaw).toLowerCase()]
      : [];

    setFilters({ view, search, statuses });
    setSearchDraft(search);
    setInitialized(true);
  }, [router.isReady, router.query, initialized]);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const fetchListings = useCallback(async (activeFilters, options = {}) => {
    const signal =
      options && typeof options === 'object' && 'signal' in options ? options.signal : undefined;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (activeFilters.view) {
        params.set('view', activeFilters.view);
      }
      if (activeFilters.search) {
        params.set('search', activeFilters.search);
      }
      activeFilters.statuses.forEach((status) => {
        if (status) {
          params.append('status', status);
        }
      });

      const query = params.toString();
      const url = withBasePath(`/api/admin/listings${query ? `?${query}` : ''}`);
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch lettings archive');
      }
      const payload = await response.json();
      if (signal?.aborted) {
        return;
      }
      setListings(Array.isArray(payload.listings) ? payload.listings : []);
      setSummary(payload.summary || null);
    } catch (err) {
      if (
        signal?.aborted ||
        (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError')
      ) {
        return;
      }
      console.error(err);
      setError('Unable to load the lettings archive. Please try again.');
      setListings([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || !initialized) {
      if (!isAdmin && !sessionLoading) {
        setLoading(false);
      }
      return;
    }

    const controller = new AbortController();
    fetchListings(filters, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [fetchListings, filters, initialized, isAdmin, sessionLoading]);

  const applyFilters = useCallback(
    (nextFilters) => {
      setFilters((current) => {
        const resolved = typeof nextFilters === 'function' ? nextFilters(current) : nextFilters;
        const normalized = {
          view: normalizeView(resolved.view),
          search: typeof resolved.search === 'string' ? resolved.search.trim() : '',
          statuses: Array.isArray(resolved.statuses)
            ? resolved.statuses
                .map((status) => (typeof status === 'string' ? status.toLowerCase() : ''))
                .filter(Boolean)
            : [],
        };

        if (router.isReady) {
          const query = buildQuery(normalized);
          router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
        }

        return normalized;
      });
    },
    [router],
  );

  const handleViewChange = (value) => {
    applyFilters({ ...filters, view: value });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    applyFilters({ ...filters, search: searchDraft });
  };

  const handleResetSearch = () => {
    setSearchDraft('');
    applyFilters({ ...filters, search: '', statuses: [] });
  };

  const handleToggleStatus = (status) => {
    const normalized = String(status).toLowerCase();
    applyFilters((current) => {
      const exists = current.statuses.includes(normalized);
      const nextStatuses = exists
        ? current.statuses.filter((value) => value !== normalized)
        : current.statuses.concat(normalized);
      return { ...current, statuses: nextStatuses };
    });
  };

  const statusBreakdown = useMemo(() => {
    if (!summary) {
      return [];
    }

    const viewKey = filters.view === 'archived' ? 'archived' : filters.view === 'all' ? 'all' : 'available';
    const breakdown = summary?.totals?.[viewKey]?.statusBreakdown;
    if (Array.isArray(breakdown) && breakdown.length) {
      return breakdown;
    }

    const labels = summary?.statusLabels || {};
    return Object.entries(labels).map(([status, label]) => ({ status, label, count: 0 }));
  }, [summary, filters.view]);

  const viewSummary = useMemo(() => {
    if (!summary) {
      return null;
    }

    const viewKey = filters.view === 'archived' ? 'archived' : filters.view === 'all' ? 'all' : 'available';
    return summary.totals?.[viewKey] || null;
  }, [filters.view, summary]);

  const pageTitle = 'Aktonz Admin — Available lettings archive';

  const renderHero = () => {
    const totalCount = viewSummary?.count ?? 0;
    const averageRent = viewSummary?.averageRentLabel || '—';
    const updatedAt = viewSummary?.latestUpdatedAt ? formatDateTime(viewSummary.latestUpdatedAt) : '—';

    return (
      <section className={styles.hero}>
        <header className={styles.heroHeader}>
          <div className={styles.heroMeta}>
            <span className={styles.heroBadge}>Lettings archive</span>
            <h1 className={styles.heroTitle}>Available lettings archive</h1>
            <p className={styles.heroSubtitle}>
              Mirror the Apex27 archive with marketing history, rent levels, and quick access to each listing record.
            </p>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Records in view</span>
              <span className={styles.statValue}>{totalCount}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Average rent</span>
              <span className={styles.statValue}>{averageRent}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Latest update</span>
              <span className={styles.statValue}>{updatedAt}</span>
            </div>
          </div>
        </header>
        {viewSummary?.topAreas?.length ? (
          <div className={styles.heroHighlights}>
            <div>
              <h2 className={styles.highlightTitle}>Top areas</h2>
              <ul className={styles.highlightList}>
                {viewSummary.topAreas.map((area) => (
                  <li key={area.label}>
                    <span>{area.label}</span>
                    <span className={styles.highlightCount}>{area.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={styles.highlightTitle}>Bedroom mix</h2>
              <ul className={styles.highlightList}>
                {viewSummary.bedroomMix.length ? (
                  viewSummary.bedroomMix.map((entry) => (
                    <li key={`bedroom-${entry.bedrooms}`}>
                      <span>{entry.bedrooms}-bed</span>
                      <span className={styles.highlightCount}>{entry.count}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No bedroom data</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const renderStatusFilters = () => {
    if (!statusBreakdown.length) {
      return null;
    }

    return (
      <div className={styles.statusFilters}>
        {statusBreakdown.map((entry) => {
          const isActive = filters.statuses.includes(entry.status);
          return (
            <button
              key={entry.status}
              type="button"
              className={`${styles.statusChip} ${isActive ? styles.statusChipActive : ''}`}
              onClick={() => handleToggleStatus(entry.status)}
            >
              <span>{entry.label}</span>
              {entry.count != null ? <span className={styles.statusChipCount}>{entry.count}</span> : null}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMarketingTags = (marketing) => {
    if (!marketing) {
      return null;
    }

    const badges = [];
    if (marketing.hasPortal) {
      badges.push({ key: 'portal', label: 'Portal' });
    }
    if (marketing.hasVideo) {
      badges.push({ key: 'video', label: 'Video tour' });
    }
    if (marketing.hasVirtualTour) {
      badges.push({ key: 'virtual', label: '360° tour' });
    }
    if (marketing.hasSourceLink) {
      badges.push({ key: 'source', label: 'Source' });
    }

    if (!badges.length) {
      return <span className={styles.metaMuted}>No marketing assets logged</span>;
    }

    return badges.map((badge) => (
      <span key={badge.key} className={styles.marketingBadge}>
        {badge.label}
      </span>
    ));
  };

  const renderListings = () => {
    if (loading) {
      return <div className={styles.stateMessage}>Loading lettings archive…</div>;
    }

    if (error) {
      return <div className={styles.stateMessage}>{error}</div>;
    }

    if (!listings.length) {
      return <div className={styles.stateMessage}>No lettings found for the selected filters.</div>;
    }

    return (
      <div className={styles.tableCard}>
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Property</th>
              <th>Rent &amp; status</th>
              <th>Marketing</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div className={styles.propertyCell}>
                    {listing.image?.thumbnail ? (
                      <img
                        src={listing.image.thumbnail}
                        alt={listing.displayAddress || listing.title}
                        className={styles.propertyImage}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.imagePlaceholder} aria-hidden="true" />
                    )}
                    <div className={styles.propertyDetails}>
                      <div className={styles.propertyAddress}>{listing.displayAddress || listing.title}</div>
                      <div className={styles.propertyMeta}>
                        {listing.bedrooms != null ? `${listing.bedrooms} bed` : 'Beds n/a'} ·{' '}
                        {listing.bathrooms != null ? `${listing.bathrooms} bath` : 'Baths n/a'}
                        {listing.receptions != null ? ` · ${listing.receptions} reception` : ''}
                      </div>
                      <div className={styles.propertyReference}>Ref: {listing.reference}</div>
                      {listing.branch?.name ? (
                        <div className={styles.propertyBranch}>{listing.branch.name}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.rentValue}>{listing.rent?.label || 'Rent not set'}</div>
                  {listing.pricePrefix ? (
                    <div className={styles.metaMuted}>{listing.pricePrefix}</div>
                  ) : null}
                  <span className={styles.statusBadge} data-tone={listing.statusTone}>
                    {listing.statusLabel}
                  </span>
                  {listing.availabilityLabel ? (
                    <div className={styles.metaMuted}>{listing.availabilityLabel}</div>
                  ) : null}
                </td>
                <td>
                  <div className={styles.marketingCell}>{renderMarketingTags(listing.marketing)}</div>
                  {listing.matchingAreas?.length ? (
                    <div className={styles.metaMuted}>
                      {listing.matchingAreas.slice(0, 2).join(', ')}
                      {listing.matchingAreas.length > 2 ? '…' : ''}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className={styles.updatedAt}>{formatDateTime(listing.updatedAt)}</div>
                  <div className={styles.metaMuted}>{formatRelativeTime(listing.updatedAt)}</div>
                  <Link href={`/admin/listings/${encodeURIComponent(listing.id)}`} className={styles.rowLink}>
                    Open listing record
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFilters = () => (
    <section className={styles.filtersCard}>
      <div className={styles.filterRow}>
        <div className={styles.viewToggle}>
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.viewButton} ${filters.view === option.value ? styles.viewButtonActive : ''}`}
              onClick={() => handleViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <label htmlFor="lettings-archive-search" className="sr-only">
            Search lettings archive
          </label>
          <input
            id="lettings-archive-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className={styles.searchInput}
            placeholder="Search by address, reference, or area"
          />
          <button type="submit" className={styles.searchButton}>
            Apply
          </button>
          <button type="button" className={styles.resetButton} onClick={handleResetSearch}>
            Reset
          </button>
        </form>
      </div>
      {renderStatusFilters()}
    </section>
  );

  const renderContent = () => {
    if (sessionLoading) {
      return <div className={styles.stateMessage}>Checking admin access…</div>;
    }

    if (!isAdmin) {
      return <div className={styles.stateMessage}>You need admin access to view the lettings archive.</div>;
    }

    return (
      <>
        {renderHero()}
        {renderFilters()}
        {renderListings()}
      </>
    );
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <AdminNavigation items={ADMIN_NAV_ITEMS} />
      <main className={styles.main}>
        <div className={styles.container}>{renderContent()}</div>
      </main>
    </>
  );
}
