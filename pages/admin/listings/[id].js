import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import styles from '../../../styles/AdminListingDetails.module.css';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Marketing in progress' },
  { value: 'let_agreed', label: 'Let agreed' },
  { value: 'under_offer', label: 'Under offer' },
];

const STATUS_TONES = {
  available: 'success',
  pending: 'info',
  let_agreed: 'muted',
  under_offer: 'muted',
};

const RENT_FREQUENCY_OPTIONS = [
  { value: 'pcm', label: 'Per month' },
  { value: 'pw', label: 'Per week' },
  { value: 'pq', label: 'Per quarter' },
  { value: 'pa', label: 'Per annum' },
];

const MARKETING_TYPE_OPTIONS = [
  { value: 'portal', label: 'Portal' },
  { value: 'video', label: 'Video' },
  { value: 'virtual_tour', label: 'Virtual tour' },
  { value: 'source', label: 'Source' },
  { value: 'link', label: 'Link' },
];

function normalizeRentFrequency(value) {
  if (!value) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  const upper = raw.toUpperCase();
  const direct = { W: 'pw', M: 'pcm', Q: 'pq', Y: 'pa' };
  if (direct[upper]) {
    return direct[upper];
  }

  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    w: 'pw',
    week: 'pw',
    weeks: 'pw',
    weekly: 'pw',
    perweek: 'pw',
    pw: 'pw',
    m: 'pcm',
    month: 'pcm',
    months: 'pcm',
    monthly: 'pcm',
    permonth: 'pcm',
    pm: 'pcm',
    pcm: 'pcm',
    q: 'pq',
    quarter: 'pq',
    quarters: 'pq',
    quarterly: 'pq',
    perquarter: 'pq',
    pq: 'pq',
    y: 'pa',
    year: 'pa',
    years: 'pa',
    yearly: 'pa',
    annually: 'pa',
    perannum: 'pa',
    peryear: 'pa',
    pa: 'pa',
  };

  return aliases[normalized] || normalized;
}

function formatHeroRent(amount, frequency, currency) {
  if (amount == null || amount === '') {
    return 'Rent not set';
  }

  const numeric = Number(String(amount).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Rent not set';
  }

  const normalisedFrequency = normalizeRentFrequency(frequency);
  const rentCurrency = currency && String(currency).trim() ? String(currency).trim().toUpperCase() : 'GBP';

  let formattedAmount;
  try {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: rentCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formattedAmount = formatter.format(numeric);
  } catch (error) {
    formattedAmount = `£${numeric.toLocaleString('en-GB')}`;
  }

  const frequencyLabel = RENT_FREQUENCY_OPTIONS.find((option) => option.value === normalisedFrequency)?.label;
  return frequencyLabel ? `${formattedAmount} ${frequencyLabel}` : formattedAmount;
}

function cloneFormValues(values) {
  return JSON.parse(JSON.stringify(values));
}

function createFormStateFromListing(listing) {
  if (!listing) {
    return null;
  }

  const marketingLinks = Array.isArray(listing.marketing?.links)
    ? listing.marketing.links.map((link) => ({
        label: link?.label || '',
        type: link?.type || 'link',
        url: link?.url || '',
      }))
    : [];

  const metadata = Array.isArray(listing.metadata)
    ? listing.metadata.map((entry) => ({
        label: entry?.label || '',
        value: entry?.value || '',
      }))
    : [];

  return {
    status: listing.status || 'available',
    availabilityLabel: listing.availabilityLabel || '',
    pricePrefix: listing.pricePrefix || '',
    title: listing.title || '',
    displayAddress: listing.displayAddress || '',
    reference: listing.reference || '',
    rentAmount: listing.rent?.amount != null ? String(listing.rent.amount) : '',
    rentFrequency: normalizeRentFrequency(listing.rent?.frequency) || '',
    rentCurrency: listing.rent?.currency || 'GBP',
    bedrooms: listing.bedrooms != null ? String(listing.bedrooms) : '',
    bathrooms: listing.bathrooms != null ? String(listing.bathrooms) : '',
    receptions: listing.receptions != null ? String(listing.receptions) : '',
    furnished: listing.furnished || '',
    propertyType: listing.propertyType || '',
    addressLine1: listing.address?.line1 || '',
    addressLine2: listing.address?.line2 || '',
    city: listing.address?.city || '',
    county: listing.address?.county || '',
    postalCode: listing.address?.postalCode || '',
    country: listing.address?.country || '',
    matchingAreasText: listing.matchingAreas?.length ? listing.matchingAreas.join('\n') : '',
    latitude: listing.coordinates?.lat != null ? String(listing.coordinates.lat) : '',
    longitude: listing.coordinates?.lng != null ? String(listing.coordinates.lng) : '',
    summary: listing.summary || '',
    description: listing.description || '',
    marketingLinks,
    metadata,
  };
}

function buildUpdatePayload(values) {
  const marketingLinks = (values.marketingLinks || [])
    .map((link) => ({
      label: link.label,
      type: link.type,
      url: link.url,
    }))
    .filter((link) => link.label || link.url);

  const metadata = (values.metadata || [])
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
    .filter((entry) => entry.label || entry.value);

  const matchingAreas = values.matchingAreasText
    ? values.matchingAreasText
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    status: values.status,
    availabilityLabel: values.availabilityLabel,
    pricePrefix: values.pricePrefix,
    title: values.title,
    displayAddress: values.displayAddress,
    reference: values.reference,
    rent: {
      amount: values.rentAmount,
      frequency: values.rentFrequency,
      currency: values.rentCurrency,
    },
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    receptions: values.receptions,
    furnished: values.furnished,
    propertyType: values.propertyType,
    address: {
      line1: values.addressLine1,
      line2: values.addressLine2,
      city: values.city,
      county: values.county,
      postalCode: values.postalCode,
      country: values.country,
    },
    matchingAreas,
    coordinates: {
      lat: values.latitude,
      lng: values.longitude,
    },
    summary: values.summary,
    description: values.description,
    marketing: { links: marketingLinks },
    metadata,
  };
}

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
      return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
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

function renderDefinitionList(items) {
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
}

export default function AdminListingDetailsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

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

  useEffect(() => {
    if (!listing) {
      setFormValues(null);
      setInitialValues(null);
      return;
    }

    const next = createFormStateFromListing(listing);
    const cloned = cloneFormValues(next);
    setFormValues(cloned);
    setInitialValues(cloneFormValues(next));
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, [listing]);

  const pageTitle = useMemo(() => {
    const address = formValues?.displayAddress || listing?.displayAddress;
    return address ? `${address} • Aktonz Admin` : 'Listing details • Aktonz Admin';
  }, [formValues, listing]);

  const formDirty = useMemo(() => {
    if (!formValues || !initialValues) {
      return false;
    }
    return JSON.stringify(formValues) !== JSON.stringify(initialValues);
  }, [formValues, initialValues]);

  const updateForm = useCallback((updater) => {
    setFormValues((prev) => {
      if (!prev) {
        return prev;
      }
      const base = { ...prev };
      return typeof updater === 'function' ? updater(base) : updater;
    });
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, []);

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

  const heroRentLabel = useMemo(() => {
    if (formValues) {
      return formatHeroRent(formValues.rentAmount, formValues.rentFrequency, formValues.rentCurrency);
    }
    return formatHeroRent(listing?.rent?.amount, listing?.rent?.frequency, listing?.rent?.currency);
  }, [formValues, listing]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!formValues || !listingId) {
        return;
      }

      setSaving(true);
      setSaveError('');
      setSaveSuccess('');
      setValidationErrors([]);

      try {
        const payload = buildUpdatePayload(formValues);
        const response = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          const message = errorPayload?.error || 'Failed to save listing changes.';
          setSaveError(message);
          setValidationErrors(Array.isArray(errorPayload?.details) ? errorPayload.details.filter(Boolean) : []);
          return;
        }

        const result = await response.json();
        setListing(result.listing || null);
        setSaveSuccess('Listing changes saved.');
        setValidationErrors([]);
      } catch (err) {
        console.error(err);
        setSaveError('Failed to save listing changes.');
      } finally {
        setSaving(false);
      }
    },
    [formValues, listingId],
  );

  const handleReset = useCallback(() => {
    if (!initialValues) {
      return;
    }
    setFormValues(cloneFormValues(initialValues));
    setSaveError('');
    setSaveSuccess('');
    setValidationErrors([]);
  }, [initialValues]);

  const addMarketingLink = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      marketingLinks: [...(prev.marketingLinks || []), { label: '', type: 'link', url: '' }],
    }));
  }, [updateForm]);

  const updateMarketingLink = useCallback(
    (index, field, value) => {
      updateForm((prev) => {
        const links = [...(prev.marketingLinks || [])];
        const current = links[index] || { label: '', type: 'link', url: '' };
        links[index] = { ...current, [field]: value };
        return { ...prev, marketingLinks: links };
      });
    },
    [updateForm],
  );

  const removeMarketingLink = useCallback(
    (index) => {
      updateForm((prev) => {
        const links = [...(prev.marketingLinks || [])];
        links.splice(index, 1);
        return { ...prev, marketingLinks: links };
      });
    },
    [updateForm],
  );

  const addMetadataEntry = useCallback(() => {
    updateForm((prev) => ({
      ...prev,
      metadata: [...(prev.metadata || []), { label: '', value: '' }],
    }));
  }, [updateForm]);

  const updateMetadataEntry = useCallback(
    (index, field, value) => {
      updateForm((prev) => {
        const entries = [...(prev.metadata || [])];
        const current = entries[index] || { label: '', value: '' };
        entries[index] = { ...current, [field]: value };
        return { ...prev, metadata: entries };
      });
    },
    [updateForm],
  );

  const removeMetadataEntry = useCallback(
    (index) => {
      updateForm((prev) => {
        const entries = [...(prev.metadata || [])];
        entries.splice(index, 1);
        return { ...prev, metadata: entries };
      });
    },
    [updateForm],
  );

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

    if (!listing || !formValues) {
      return <div className={styles.stateMessage}>Listing details unavailable.</div>;
    }

    const statusOption = STATUS_OPTIONS.find((option) => option.value === formValues.status);
    const statusLabel = statusOption ? statusOption.label : listing.statusLabel;
    const statusTone = STATUS_TONES[formValues.status] || 'info';
    const availabilityLabel = formValues.availabilityLabel || listing.availabilityLabel;
    const referenceValue = formValues.reference || '—';
    const updatedLabel = formatDateTime(listing.updatedAt);
    const updatedRelative = formatRelativeTime(listing.updatedAt);

    return (
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <section className={styles.hero}>
          <div className={styles.heroTopRow}>
            <Link href="/admin/lettings/available-archive" className={styles.backLink}>
              ← Back to lettings archive
            </Link>
            <div className={styles.heroActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!formDirty || saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleReset}
                disabled={!formDirty || saving}
              >
                Discard changes
              </button>
            </div>
          </div>

          {saveSuccess ? (
            <p className={`${styles.statusMessage} ${styles.statusSuccess}`}>{saveSuccess}</p>
          ) : null}
          {saveError ? (
            <p className={`${styles.statusMessage} ${styles.statusError}`}>{saveError}</p>
          ) : null}
          {validationErrors.length ? (
            <ul className={`${styles.statusMessage} ${styles.statusError} ${styles.statusDetails}`}>
              {validationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className={styles.heroStatusGroup}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-status">
                Status
              </label>
              <select
                id="listing-status"
                className={styles.select}
                value={formValues.status}
                onChange={(event) => updateForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <span className={styles.statusBadge} data-tone={statusTone}>
              {statusLabel}
            </span>
            {availabilityLabel ? <span className={styles.availability}>{availabilityLabel}</span> : null}
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-availability">
              Availability badge label
            </label>
            <input
              id="listing-availability"
              className={styles.input}
              value={formValues.availabilityLabel}
              onChange={(event) => updateForm((prev) => ({ ...prev, availabilityLabel: event.target.value }))}
              placeholder="e.g. Available now"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-display-address">
              Display address
            </label>
            <input
              id="listing-display-address"
              className={`${styles.input} ${styles.titleInput}`}
              value={formValues.displayAddress}
              onChange={(event) => updateForm((prev) => ({ ...prev, displayAddress: event.target.value }))}
              placeholder="Property headline address"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-title">
              Marketing headline
            </label>
            <input
              id="listing-title"
              className={styles.input}
              value={formValues.title}
              onChange={(event) => updateForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Optional marketing title"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor="listing-rent-amount">
              Headline rent
            </label>
            <div className={styles.inlineFields}>
              <input
                id="listing-rent-amount"
                className={styles.input}
                value={formValues.rentAmount}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentAmount: event.target.value }))}
                placeholder="2500"
              />
              <select
                className={styles.select}
                value={formValues.rentFrequency}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentFrequency: event.target.value }))}
              >
                <option value="">Select frequency</option>
                {RENT_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                value={formValues.rentCurrency}
                onChange={(event) => updateForm((prev) => ({ ...prev, rentCurrency: event.target.value }))}
                placeholder="GBP"
              />
            </div>
          </div>

          <div className={styles.heroRent}>{heroRentLabel}</div>

          <div className={styles.heroMetaRow}>
            <span className={styles.metaPill}>Reference {referenceValue}</span>
            <span className={styles.metaPill}>Updated {updatedLabel}</span>
            <span className={styles.metaMuted}>{updatedRelative}</span>
          </div>
        </section>

        <section className={styles.panelGroup}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Key facts</h2>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-bedrooms">
                    Bedrooms
                  </label>
                  <input
                    id="listing-bedrooms"
                    className={styles.input}
                    value={formValues.bedrooms}
                    onChange={(event) => updateForm((prev) => ({ ...prev, bedrooms: event.target.value }))}
                    placeholder="e.g. 2"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-bathrooms">
                    Bathrooms
                  </label>
                  <input
                    id="listing-bathrooms"
                    className={styles.input}
                    value={formValues.bathrooms}
                    onChange={(event) => updateForm((prev) => ({ ...prev, bathrooms: event.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-receptions">
                    Receptions
                  </label>
                  <input
                    id="listing-receptions"
                    className={styles.input}
                    value={formValues.receptions}
                    onChange={(event) => updateForm((prev) => ({ ...prev, receptions: event.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-furnished">
                    Furnished state
                  </label>
                  <input
                    id="listing-furnished"
                    className={styles.input}
                    value={formValues.furnished}
                    onChange={(event) => updateForm((prev) => ({ ...prev, furnished: event.target.value }))}
                    placeholder="e.g. Furnished"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-property-type">
                    Property type
                  </label>
                  <input
                    id="listing-property-type"
                    className={styles.input}
                    value={formValues.propertyType}
                    onChange={(event) => updateForm((prev) => ({ ...prev, propertyType: event.target.value }))}
                    placeholder="e.g. Apartment"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-reference-input">
                    Reference
                  </label>
                  <input
                    id="listing-reference-input"
                    className={styles.input}
                    value={formValues.reference}
                    onChange={(event) => updateForm((prev) => ({ ...prev, reference: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-price-prefix">
                    Price prefix
                  </label>
                  <input
                    id="listing-price-prefix"
                    className={styles.input}
                    value={formValues.pricePrefix}
                    onChange={(event) => updateForm((prev) => ({ ...prev, pricePrefix: event.target.value }))}
                    placeholder="e.g. Offers over"
                  />
                </div>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Location</h2>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-address-line1">
                    Address line 1
                  </label>
                  <input
                    id="listing-address-line1"
                    className={styles.input}
                    value={formValues.addressLine1}
                    onChange={(event) => updateForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-address-line2">
                    Address line 2
                  </label>
                  <input
                    id="listing-address-line2"
                    className={styles.input}
                    value={formValues.addressLine2}
                    onChange={(event) => updateForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-city">
                    Town/City
                  </label>
                  <input
                    id="listing-city"
                    className={styles.input}
                    value={formValues.city}
                    onChange={(event) => updateForm((prev) => ({ ...prev, city: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-county">
                    County
                  </label>
                  <input
                    id="listing-county"
                    className={styles.input}
                    value={formValues.county}
                    onChange={(event) => updateForm((prev) => ({ ...prev, county: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-postcode">
                    Postcode
                  </label>
                  <input
                    id="listing-postcode"
                    className={styles.input}
                    value={formValues.postalCode}
                    onChange={(event) => updateForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-country">
                    Country
                  </label>
                  <input
                    id="listing-country"
                    className={styles.input}
                    value={formValues.country}
                    onChange={(event) => updateForm((prev) => ({ ...prev, country: event.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="listing-matching-areas">
                  Matching areas
                </label>
                <textarea
                  id="listing-matching-areas"
                  className={styles.textarea}
                  value={formValues.matchingAreasText}
                  onChange={(event) => updateForm((prev) => ({ ...prev, matchingAreasText: event.target.value }))}
                  placeholder="Add one area per line"
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-latitude">
                    Latitude
                  </label>
                  <input
                    id="listing-latitude"
                    className={styles.input}
                    value={formValues.latitude}
                    onChange={(event) => updateForm((prev) => ({ ...prev, latitude: event.target.value }))}
                    placeholder="51.5074"
                  />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel} htmlFor="listing-longitude">
                    Longitude
                  </label>
                  <input
                    id="listing-longitude"
                    className={styles.input}
                    value={formValues.longitude}
                    onChange={(event) => updateForm((prev) => ({ ...prev, longitude: event.target.value }))}
                    placeholder="-0.1278"
                  />
                </div>
              </div>
            </div>
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
            <div className={styles.panelBody}>
              <div className={styles.repeatableList}>
                {(formValues.marketingLinks || []).map((link, index) => (
                  <div key={`marketing-${index}`} className={styles.repeatableItem}>
                    <div className={styles.repeatableHeader}>
                      <h3 className={styles.repeatableTitle}>Link {index + 1}</h3>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeMarketingLink(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formRow}>
                        <label className={styles.formLabel} htmlFor={`marketing-label-${index}`}>
                          Label
                        </label>
                        <input
                          id={`marketing-label-${index}`}
                          className={styles.input}
                          value={link.label}
                          onChange={(event) => updateMarketingLink(index, 'label', event.target.value)}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label className={styles.formLabel} htmlFor={`marketing-type-${index}`}>
                          Type
                        </label>
                        <select
                          id={`marketing-type-${index}`}
                          className={styles.select}
                          value={link.type}
                          onChange={(event) => updateMarketingLink(index, 'type', event.target.value)}
                        >
                          {MARKETING_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`marketing-url-${index}`}>
                        URL
                      </label>
                      <input
                        id={`marketing-url-${index}`}
                        className={styles.input}
                        value={link.url}
                        onChange={(event) => updateMarketingLink(index, 'url', event.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.secondaryButton} onClick={addMarketingLink}>
                Add marketing link
              </button>
              {!formValues.marketingLinks?.length ? (
                <p className={styles.metaMuted}>No marketing links recorded.</p>
              ) : null}
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Property description</h2>
          </header>
          <div className={styles.panelBody}>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-summary">
                Summary
              </label>
              <textarea
                id="listing-summary"
                className={styles.textarea}
                value={formValues.summary}
                onChange={(event) => updateForm((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Short summary used on portals"
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel} htmlFor="listing-description">
                Full description
              </label>
              <textarea
                id="listing-description"
                className={`${styles.textarea} ${styles.descriptionTextarea}`}
                value={formValues.description}
                onChange={(event) => updateForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Detailed property description"
              />
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Additional metadata</h2>
          </header>
          <div className={styles.panelBody}>
            <div className={styles.repeatableList}>
              {(formValues.metadata || []).map((entry, index) => (
                <div key={`metadata-${index}`} className={styles.repeatableItem}>
                  <div className={styles.repeatableHeader}>
                    <h3 className={styles.repeatableTitle}>Entry {index + 1}</h3>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeMetadataEntry(index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`metadata-label-${index}`}>
                        Label
                      </label>
                      <input
                        id={`metadata-label-${index}`}
                        className={styles.input}
                        value={entry.label}
                        onChange={(event) => updateMetadataEntry(index, 'label', event.target.value)}
                        placeholder="e.g. EPC rating"
                      />
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.formLabel} htmlFor={`metadata-value-${index}`}>
                        Value
                      </label>
                      <input
                        id={`metadata-value-${index}`}
                        className={styles.input}
                        value={entry.value}
                        onChange={(event) => updateMetadataEntry(index, 'value', event.target.value)}
                        placeholder="e.g. B"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={styles.secondaryButton} onClick={addMetadataEntry}>
              Add metadata entry
            </button>
            {!formValues.metadata?.length ? (
              <p className={styles.metaMuted}>No additional metadata captured.</p>
            ) : null}
          </div>
        </section>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!formDirty || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReset}
            disabled={!formDirty || saving}
          >
            Discard changes
          </button>
        </div>
      </form>
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
