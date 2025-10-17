import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminListingDetails.module.css';

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return '—';
  }
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

    const diffMs = Date.now() - date.getTime();
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

function formatFact(value, fallback = 'Not recorded') {
  if (value == null || value === '') {
    return fallback;
  }
  return value;
}

function formatNumber(value) {
  if (value == null) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return String(numeric);
}

export default function AdminListingDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const listingId = useMemo(() => {
    if (!router.isReady) {
      return null;
    }
    const { id } = router.query;
    return Array.isArray(id) ? id[0] : id;
  }, [router.isReady, router.query]);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Listing not found');
        }
        throw new Error('Failed to fetch listing');
      }
      const payload = await response.json();
      setListing(payload.listing || null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load listing');
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!isAdmin || !listingId) {
      if (!isAdmin && !sessionLoading) {
        setLoading(false);
      }
      return;
    }

    fetchListing();
  }, [fetchListing, isAdmin, listingId, sessionLoading]);

  const pageTitle = listing?.displayAddress
    ? `${listing.displayAddress} • Aktonz Admin`
    : 'Listing details • Aktonz Admin';

  const marketingLinks = useMemo(() => listing?.marketing?.links ?? [], [listing]);

  const metadataDetails = useMemo(() => {
    if (!Array.isArray(listing?.metadata)) {
      return [];
    }

    return listing.metadata
      .filter((entry) => entry && typeof entry === 'object')
      .filter((entry) => {
        const type = typeof entry.type === 'string' ? entry.type.toLowerCase() : '';
        return type && !['portal', 'video', 'virtual_tour', '360', 'source'].includes(type);
      })
      .map((entry, index) => ({
        key: `${entry.label || entry.type || 'metadata'}-${index}`,
        label: entry.label || entry.type || 'Metadata',
        value: entry.value || entry.text || '',
      }))
      .filter((entry) => entry.value);
  }, [listing]);

  const propertyFacts = useMemo(() => {
    if (!listing) {
      return [];
    }

    const facts = [
      { label: 'Bedrooms', value: formatNumber(listing.bedrooms) },
      { label: 'Bathrooms', value: formatNumber(listing.bathrooms) },
      { label: 'Receptions', value: formatNumber(listing.receptions) },
      { label: 'Furnished', value: listing.furnished ? listing.furnished.replace(/_/g, ' ') : null },
      { label: 'Property type', value: listing.propertyType },
      { label: 'Reference', value: listing.reference },
    ];

    return facts.map((fact) => ({
      label: fact.label,
      value: fact.value ? fact.value : 'Not recorded',
    }));
  }, [listing]);

  const branchDetails = useMemo(() => {
    const branch = listing?.branch;
    if (!branch) {
      return [];
    }

    const details = [];
    if (branch.name) {
      details.push({ label: 'Branch', value: branch.name });
    }
    if (branch.address) {
      details.push({ label: 'Branch address', value: branch.address });
    }
    if (branch.contact?.phone) {
      details.push({ label: 'Branch phone', value: branch.contact.phone, type: 'phone' });
    }
    if (branch.contact?.email) {
      details.push({ label: 'Branch email', value: branch.contact.email, type: 'email' });
    }
    return details;
  }, [listing]);

  const negotiatorDetails = useMemo(() => {
    const negotiator = listing?.negotiator;
    if (!negotiator) {
      return [];
    }

    const details = [];
    if (negotiator.name) {
      details.push({ label: 'Negotiator', value: negotiator.name });
    }
    if (negotiator.contact?.phone) {
      details.push({ label: 'Negotiator phone', value: negotiator.contact.phone, type: 'phone' });
    }
    if (negotiator.contact?.email) {
      details.push({ label: 'Negotiator email', value: negotiator.contact.email, type: 'email' });
    }
    return details;
  }, [listing]);

  const locationDetails = useMemo(() => {
    if (!listing) {
      return [];
    }

    const details = [];
    if (listing.address?.line1) {
      details.push({ label: 'Address line 1', value: listing.address.line1 });
    }
    if (listing.address?.line2) {
      details.push({ label: 'Address line 2', value: listing.address.line2 });
    }
    if (listing.address?.city) {
      details.push({ label: 'Town/City', value: listing.address.city });
    }
    if (listing.address?.postalCode) {
      details.push({ label: 'Postcode', value: listing.address.postalCode });
    }
    if (listing.matchingAreas?.length) {
      details.push({ label: 'Matching areas', value: listing.matchingAreas.join(', ') });
    }
    if (listing.coordinates) {
      details.push({
        label: 'Coordinates',
        value: `${listing.coordinates.lat.toFixed(5)}, ${listing.coordinates.lng.toFixed(5)}`,
      });
    }
    return details;
  }, [listing]);

  const renderDefinitionList = (items) => {
    if (!items.length) {
      return <p className={styles.metaMuted}>Nothing recorded yet.</p>;
    }

    return (
      <dl className={styles.definitionList}>
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className={styles.definitionRow}>
            <dt>{item.label}</dt>
            <dd>
              {item.type === 'phone' ? (
                <a href={`tel:${item.value}`}>{item.value}</a>
              ) : item.type === 'email' ? (
                <a href={`mailto:${item.value}`}>{item.value}</a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderHero = () => {
    if (!listing) {
      return null;
    }

    return (
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <Link href="/admin/lettings/available-archive" className={styles.backLink}>
            ← Back to lettings archive
          </Link>
          <div className={styles.heroStatusGroup}>
            <span className={styles.statusBadge} data-tone={listing.statusTone}>
              {listing.statusLabel}
            </span>
            {listing.availabilityLabel ? (
              <span className={styles.availability}>{listing.availabilityLabel}</span>
            ) : null}
          </div>
        </div>
        <h1 className={styles.heroTitle}>{listing.displayAddress || listing.title}</h1>
        <div className={styles.heroRent}>{listing.rent?.label || 'Rent not set'}</div>
        <div className={styles.heroMetaRow}>
          <span className={styles.metaPill}>Reference {listing.reference}</span>
          <span className={styles.metaPill}>Updated {formatDateTime(listing.updatedAt)}</span>
          <span className={styles.metaMuted}>{formatRelativeTime(listing.updatedAt)}</span>
        </div>
        {listing.pricePrefix ? <p className={styles.metaMuted}>{listing.pricePrefix}</p> : null}
      </section>
    );
  };

  const renderMarketing = () => {
    if (!marketingLinks.length) {
      return <p className={styles.metaMuted}>No marketing links recorded.</p>;
    }

    return (
      <ul className={styles.linkList}>
        {marketingLinks.map((link) => (
          <li key={link.url} className={styles.linkItem}>
            <span className={styles.linkType}>{link.label}</span>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.url}
            </a>
          </li>
        ))}
      </ul>
    );
  };

  const renderMetadata = () => {
    if (!metadataDetails.length) {
      return <p className={styles.metaMuted}>No additional metadata captured.</p>;
    }

    return (
      <dl className={styles.definitionList}>
        {metadataDetails.map((entry) => (
          <div key={entry.key} className={styles.definitionRow}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderDescription = () => {
    if (!listing?.summary && !listing?.description) {
      return <p className={styles.metaMuted}>No description supplied.</p>;
    }

    return (
      <div className={styles.descriptionBody}>
        {listing.summary ? <p>{listing.summary}</p> : null}
        {listing.description ? (
          <pre className={styles.descriptionPre}>{listing.description}</pre>
        ) : null}
      </div>
    );
  };

  const renderContent = () => {
    if (sessionLoading || (loading && !listing && !error)) {
      return <div className={styles.stateMessage}>Loading listing details…</div>;
    }

    if (!isAdmin) {
      return <div className={styles.stateMessage}>You need admin access to view this listing.</div>;
    }

    if (error) {
      return <div className={styles.stateMessage}>{error}</div>;
    }

    if (!listing) {
      return <div className={styles.stateMessage}>Listing details unavailable.</div>;
    }

    return (
      <>
        {renderHero()}

        <section className={styles.panelGroup}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Key facts</h2>
            </header>
            <div className={styles.panelBody}>{renderDefinitionList(propertyFacts)}</div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Location</h2>
            </header>
            <div className={styles.panelBody}>{renderDefinitionList(locationDetails)}</div>
          </article>
        </section>

        <section className={styles.panelGroup}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Branch &amp; negotiator</h2>
            </header>
            <div className={styles.panelBody}>
              {renderDefinitionList(branchDetails.concat(negotiatorDetails))}
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Marketing links</h2>
            </header>
            <div className={styles.panelBody}>{renderMarketing()}</div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Property description</h2>
          </header>
          <div className={styles.panelBody}>{renderDescription()}</div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Additional metadata</h2>
          </header>
          <div className={styles.panelBody}>{renderMetadata()}</div>
        </section>
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
