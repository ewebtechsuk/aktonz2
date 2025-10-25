import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AdminNavigation, { ADMIN_NAV_ITEMS } from '../../../components/admin/AdminNavigation';
import { useSession } from '../../../components/SessionProvider';
import adminStyles from '../../../styles/Admin.module.css';
import styles from '../../../styles/AdminLettingsProperty.module.css';
import { formatAdminCurrency } from '../../../lib/admin/formatters';
import { withBasePath } from '../../../lib/base-path';

const INITIAL_FORM_STATE = {
  reference: '',
  title: '',
  description: '',
  status: 'AVAILABLE',
  branchId: '',
  landlordContactId: '',
  price: '',
  rentFrequency: 'monthly',
  bedrooms: '',
  bathrooms: '',
  receptions: '',
  propertyType: '',
  furnishedState: '',
  availableDate: '',
  size: '',
  depositType: 'standard',
  securityDepositFixed: '',
  securityDepositWeeks: '',
  securityDepositMonths: '',
  holdingDepositFixed: '',
  holdingDepositWeeks: '',
  holdingDepositMonths: '',
  features: '',
  address1: '',
  postcode: '',
  externalUrl: '',
  latitude: '',
  longitude: '',
  imageUrls: '',
};

const mapOptions = (entries) => {
  if (Array.isArray(entries)) {
    return entries.map((entry) => {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        return entry;
      }
      if (typeof entry === 'string') {
        return { value: entry, label: entry };
      }
      return null;
    }).filter(Boolean);
  }
  return [];
};

export default function AdminLettingsPropertyPage() {
  const pageTitle = 'Aktonz Admin — Add lettings property';
  const { user, loading: sessionLoading } = useSession();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();

  const [metadata, setMetadata] = useState({
    loading: true,
    error: null,
    options: {
      statuses: [],
      rentFrequencies: [],
      propertyTypes: [],
      furnishedStates: [],
      depositTypes: [],
    },
    defaults: INITIAL_FORM_STATE,
  });

  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const searchAbortControllerRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setMetadata((prev) => ({ ...prev, loading: false }));
      return;
    }

    const controller = new AbortController();

    const fetchMetadata = async () => {
      setMetadata((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(withBasePath('/api/admin/properties/lettings'), {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to load lettings metadata');
        }

        const payload = await response.json();
        if (controller.signal.aborted) {
          return;
        }

        setMetadata({
          loading: false,
          error: null,
          options: {
            statuses: mapOptions(payload?.options?.statuses),
            rentFrequencies: mapOptions(payload?.options?.rentFrequencies),
            propertyTypes: mapOptions(payload?.options?.propertyTypes),
            furnishedStates: mapOptions(payload?.options?.furnishedStates),
            depositTypes: mapOptions(payload?.options?.depositTypes),
          },
          defaults: {
            ...INITIAL_FORM_STATE,
            status: payload?.defaults?.status || 'AVAILABLE',
            rentFrequency: payload?.defaults?.rentFrequency || 'monthly',
            depositType: payload?.defaults?.depositType || 'standard',
            branchId: payload?.defaults?.branchId || '',
          },
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
        ) {
          return;
        }
        setMetadata((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load lettings metadata',
        }));
      }
    };

    void fetchMetadata();

    return () => {
      controller.abort();
    };
  }, [isAdmin]);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      status: metadata.defaults.status,
      rentFrequency: metadata.defaults.rentFrequency,
      depositType: metadata.defaults.depositType,
      branchId: metadata.defaults.branchId || '',
    }));
  }, [metadata.defaults.depositType, metadata.defaults.branchId, metadata.defaults.rentFrequency, metadata.defaults.status]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSearch = useCallback(
    async (event) => {
      event.preventDefault();

      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }

      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setSearchResults([]);
        setSearchError('Enter a keyword to search existing lettings.');
        setSearchPerformed(false);
        setSearching(false);
        return;
      }

      const controller = new AbortController();
      searchAbortControllerRef.current = controller;

      setSearchError(null);
      setSearching(true);
      setSearchPerformed(false);

      try {
        const params = new URLSearchParams({ search: trimmed });
        const response = await fetch(
          withBasePath(`/api/admin/properties/lettings?${params.toString()}`),
          {
            method: 'GET',
            headers: { accept: 'application/json' },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const payload = await response.json();
        if (controller.signal.aborted) {
          return;
        }
        setSearchResults(Array.isArray(payload?.results) ? payload.results : []);
        setSearchError(null);
        setSearchPerformed(true);
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
        ) {
          return;
        }
        setSearchResults([]);
        setSearchPerformed(false);
        setSearchError(error instanceof Error ? error.message : 'Unable to search lettings right now.');
      } finally {
        if (searchAbortControllerRef.current === controller) {
          setSearching(false);
          searchAbortControllerRef.current = null;
        }
      }
    },
    [searchTerm],
  );

  useEffect(
    () => () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const payload = {
        externalReference: formState.reference,
        title: formState.title,
        description: formState.description,
        status: formState.status,
        branchId: formState.branchId,
        landlordContactId: formState.landlordContactId,
        price: formState.price,
        rentFrequency: formState.rentFrequency,
        bedrooms: formState.bedrooms,
        bathrooms: formState.bathrooms,
        receptions: formState.receptions,
        propertyType: formState.propertyType,
        furnishedState: formState.furnishedState,
        availableDate: formState.availableDate,
        size: formState.size,
        depositType: formState.depositType,
        securityDepositFixed: formState.securityDepositFixed,
        securityDepositWeeks: formState.securityDepositWeeks,
        securityDepositMonths: formState.securityDepositMonths,
        holdingDepositFixed: formState.holdingDepositFixed,
        holdingDepositWeeks: formState.holdingDepositWeeks,
        holdingDepositMonths: formState.holdingDepositMonths,
        features: formState.features,
        address1: formState.address1,
        postcode: formState.postcode,
        externalUrl: formState.externalUrl,
        latitude: formState.latitude,
        longitude: formState.longitude,
        imageUrls: formState.imageUrls,
      };

      try {
        const response = await fetch(withBasePath('/api/admin/properties/lettings'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const message = errorPayload?.error || 'Unable to create the lettings property';
          throw new Error(message);
        }

        const result = await response.json();
        const identifier = result?.listing?.id || result?.listing?.payload?.externalReference || null;
        setSubmitSuccess(
          identifier
            ? `Lettings property created successfully (reference ${identifier}).`
            : 'Lettings property created successfully.',
        );
        setFormState((prev) => ({
          ...INITIAL_FORM_STATE,
          status: metadata.defaults.status,
          rentFrequency: metadata.defaults.rentFrequency,
          depositType: metadata.defaults.depositType,
          branchId: metadata.defaults.branchId || '',
        }));
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Unable to create the lettings property');
      } finally {
        setSubmitting(false);
      }
    },
    [formState, metadata.defaults.branchId, metadata.defaults.depositType, metadata.defaults.rentFrequency, metadata.defaults.status],
  );

  const statusOptions = useMemo(() => metadata.options.statuses, [metadata.options.statuses]);
  const frequencyOptions = useMemo(() => metadata.options.rentFrequencies, [metadata.options.rentFrequencies]);
  const propertyTypeOptions = useMemo(() => metadata.options.propertyTypes, [metadata.options.propertyTypes]);
  const furnishedOptions = useMemo(() => metadata.options.furnishedStates, [metadata.options.furnishedStates]);
  const depositOptions = useMemo(() => metadata.options.depositTypes, [metadata.options.depositTypes]);

  if (sessionLoading) {
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
        </Head>
        <AdminNavigation items={[]} />
        <main className={styles.page}>
          <div className={styles.container}>
            <p className={styles.info}>Checking your admin access…</p>
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
            <section className={`${adminStyles.panel} ${styles.panel}`}>
              <p className={styles.info}>
                You need to <Link href="/login">sign in with an admin account</Link> to add lettings properties.
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
            <div className={styles.headerContent}>
              <div>
                <h1>Add lettings property</h1>
                <p>Publish a new rental instruction to Apex27 and keep your lettings pipeline in sync.</p>
              </div>
            </div>
            {metadata.error ? <div className={styles.error}>{metadata.error}</div> : null}
          </header>

          <div className={styles.layout}>
            <aside className={`${adminStyles.panel} ${styles.searchPanel}`}>
              <div className={styles.panelHeader}>
                <h2>Search existing lettings</h2>
                <p>Check Apex27 records before creating a new property.</p>
              </div>

              <form className={styles.searchForm} onSubmit={handleSearch}>
                <label htmlFor="search" className={styles.label}>
                  Address, postcode or reference
                </label>
                <input
                  id="search"
                  name="search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={styles.input}
                  placeholder="e.g. E3 5AA or Bow apartment"
                />
                <button type="submit" className={styles.button} disabled={searching}>
                  {searching ? 'Searching…' : 'Search lettings'}
                </button>
              </form>

              {searchError ? <p className={styles.error}>{searchError}</p> : null}

              {searchPerformed ? (
                searchResults.length ? (
                  <ul className={styles.resultsList}>
                    {searchResults.map((result) => (
                      <li key={`${result.id || result.title}-${result.postcode || 'unknown'}`}>
                        <div className={styles.resultPrimary}>{result.title}</div>
                        <div className={styles.resultMeta}>
                          {result.status ? <span>{result.status}</span> : null}
                          {result.postcode ? <span>{result.postcode}</span> : null}
                          {result.price ? (
                            <span>
                              {`${
                                formatAdminCurrency(result.price, {
                                  currency: 'GBP',
                                  minimumFractionDigits: 0,
                                }) || '£0'
                              }${result.rentFrequency ? ` / ${result.rentFrequency}` : ''}`}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.info}>No lettings matched your search.</p>
                )
              ) : (
                <p className={styles.info}>Run a search to check for existing lettings instructions.</p>
              )}
            </aside>

            <section className={`${adminStyles.panel} ${styles.formPanel}`}>
              <div className={styles.panelHeader}>
                <h2>Lettings property details</h2>
                <p>Complete the details required by Apex27 before publishing the listing.</p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="reference" className={styles.label}>
                      External reference
                    </label>
                    <input
                      id="reference"
                      name="reference"
                      type="text"
                      value={formState.reference}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional unique ID"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="title" className={styles.label}>
                      Marketing title
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formState.title}
                      onChange={handleInputChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label htmlFor="description" className={styles.label}>
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formState.description}
                      onChange={handleInputChange}
                      className={styles.textarea}
                      rows={6}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="status" className={styles.label}>
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formState.status}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="branchId" className={styles.label}>
                      Branch ID
                    </label>
                    <input
                      id="branchId"
                      name="branchId"
                      type="text"
                      value={formState.branchId}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Defaults to your Apex27 branch"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="landlordContactId" className={styles.label}>
                      Landlord contact ID
                    </label>
                    <input
                      id="landlordContactId"
                      name="landlordContactId"
                      type="text"
                      value={formState.landlordContactId}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional Apex27 contact ID"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="price" className={styles.label}>
                      Rent amount
                    </label>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      inputMode="decimal"
                      value={formState.price}
                      onChange={handleInputChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="rentFrequency" className={styles.label}>
                      Rent frequency
                    </label>
                    <select
                      id="rentFrequency"
                      name="rentFrequency"
                      value={formState.rentFrequency}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      {frequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="bedrooms" className={styles.label}>
                      Bedrooms
                    </label>
                    <input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      inputMode="numeric"
                      value={formState.bedrooms}
                      onChange={handleInputChange}
                      className={styles.input}
                      min="0"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="bathrooms" className={styles.label}>
                      Bathrooms
                    </label>
                    <input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      inputMode="numeric"
                      value={formState.bathrooms}
                      onChange={handleInputChange}
                      className={styles.input}
                      min="0"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="receptions" className={styles.label}>
                      Reception rooms
                    </label>
                    <input
                      id="receptions"
                      name="receptions"
                      type="number"
                      inputMode="numeric"
                      value={formState.receptions}
                      onChange={handleInputChange}
                      className={styles.input}
                      min="0"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="propertyType" className={styles.label}>
                      Property type
                    </label>
                    <select
                      id="propertyType"
                      name="propertyType"
                      value={formState.propertyType}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      <option value="">Select property type</option>
                      {propertyTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="furnishedState" className={styles.label}>
                      Furnishing
                    </label>
                    <select
                      id="furnishedState"
                      name="furnishedState"
                      value={formState.furnishedState}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      <option value="">Select furnishing</option>
                      {furnishedOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="availableDate" className={styles.label}>
                      Available from
                    </label>
                    <input
                      id="availableDate"
                      name="availableDate"
                      type="date"
                      value={formState.availableDate}
                      onChange={handleInputChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="size" className={styles.label}>
                      Size (sq ft or sq m)
                    </label>
                    <input
                      id="size"
                      name="size"
                      type="text"
                      value={formState.size}
                      onChange={handleInputChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="depositType" className={styles.label}>
                      Deposit type
                    </label>
                    <select
                      id="depositType"
                      name="depositType"
                      value={formState.depositType}
                      onChange={handleInputChange}
                      className={styles.select}
                    >
                      {depositOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="securityDepositFixed" className={styles.label}>
                      Security deposit amount (£)
                    </label>
                    <input
                      id="securityDepositFixed"
                      name="securityDepositFixed"
                      type="number"
                      inputMode="decimal"
                      value={formState.securityDepositFixed}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="e.g. 3000"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="securityDepositWeeks" className={styles.label}>
                      Security deposit weeks
                    </label>
                    <input
                      id="securityDepositWeeks"
                      name="securityDepositWeeks"
                      type="number"
                      inputMode="numeric"
                      value={formState.securityDepositWeeks}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="securityDepositMonths" className={styles.label}>
                      Security deposit months
                    </label>
                    <input
                      id="securityDepositMonths"
                      name="securityDepositMonths"
                      type="number"
                      inputMode="numeric"
                      value={formState.securityDepositMonths}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="holdingDepositFixed" className={styles.label}>
                      Holding deposit amount (£)
                    </label>
                    <input
                      id="holdingDepositFixed"
                      name="holdingDepositFixed"
                      type="number"
                      inputMode="decimal"
                      value={formState.holdingDepositFixed}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="holdingDepositWeeks" className={styles.label}>
                      Holding deposit weeks
                    </label>
                    <input
                      id="holdingDepositWeeks"
                      name="holdingDepositWeeks"
                      type="number"
                      inputMode="numeric"
                      value={formState.holdingDepositWeeks}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="holdingDepositMonths" className={styles.label}>
                      Holding deposit months
                    </label>
                    <input
                      id="holdingDepositMonths"
                      name="holdingDepositMonths"
                      type="number"
                      inputMode="numeric"
                      value={formState.holdingDepositMonths}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                      min="0"
                      step="1"
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label htmlFor="features" className={styles.label}>
                      Key features
                    </label>
                    <textarea
                      id="features"
                      name="features"
                      value={formState.features}
                      onChange={handleInputChange}
                      className={styles.textarea}
                      rows={4}
                      placeholder="Separate each feature with a new line"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="address1" className={styles.label}>
                      Primary address line
                    </label>
                    <input
                      id="address1"
                      name="address1"
                      type="text"
                      value={formState.address1}
                      onChange={handleInputChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="postcode" className={styles.label}>
                      Postcode
                    </label>
                    <input
                      id="postcode"
                      name="postcode"
                      type="text"
                      value={formState.postcode}
                      onChange={handleInputChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="externalUrl" className={styles.label}>
                      External URL
                    </label>
                    <input
                      id="externalUrl"
                      name="externalUrl"
                      type="url"
                      value={formState.externalUrl}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional link for marketing sites"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="latitude" className={styles.label}>
                      Latitude
                    </label>
                    <input
                      id="latitude"
                      name="latitude"
                      type="text"
                      value={formState.latitude}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="longitude" className={styles.label}>
                      Longitude
                    </label>
                    <input
                      id="longitude"
                      name="longitude"
                      type="text"
                      value={formState.longitude}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Optional"
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label htmlFor="imageUrls" className={styles.label}>
                      Image URLs
                    </label>
                    <textarea
                      id="imageUrls"
                      name="imageUrls"
                      value={formState.imageUrls}
                      onChange={handleInputChange}
                      className={styles.textarea}
                      rows={4}
                      placeholder="Paste one image URL per line"
                    />
                  </div>
                </div>

                {submitError ? <p className={styles.error}>{submitError}</p> : null}
                {submitSuccess ? <p className={styles.success}>{submitSuccess}</p> : null}

                <div className={styles.actions}>
                  <button type="submit" className={styles.submitButton} disabled={submitting || metadata.loading}>
                    {submitting ? 'Saving…' : 'Create lettings property'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
