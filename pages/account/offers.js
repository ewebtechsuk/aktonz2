import { useEffect, useMemo, useState } from 'react';

import AccountLayout from '../../components/account/AccountLayout';
import { useSession } from '../../components/SessionProvider';
import styles from '../../styles/AccountOffers.module.css';

const FREQUENCY_OPTIONS = [
  { value: 'pcm', label: 'Per calendar month' },
  { value: 'pw', label: 'Per week' },
  { value: 'pa', label: 'Per annum' },
];

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch (error) {
    return `£${value}`;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function sortByDate(a, b) {
  return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
}

const defaultOfferForm = {
  propertyId: '',
  propertyTitle: '',
  propertyAddress: '',
  amount: '',
  frequency: 'pcm',
  message: '',
  name: '',
  email: '',
  phone: '',
};

const defaultViewingForm = {
  propertyId: '',
  date: '',
  time: '',
  message: '',
};

export default function AccountOffersPage() {
  const { user, email, loading: sessionLoading } = useSession();
  const [offers, setOffers] = useState([]);
  const [viewings, setViewings] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [viewingsLoading, setViewingsLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [viewingsError, setViewingsError] = useState('');
  const [offerForm, setOfferForm] = useState(defaultOfferForm);
  const [viewingForm, setViewingForm] = useState(defaultViewingForm);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [offerFeedback, setOfferFeedback] = useState('');
  const [viewingFeedback, setViewingFeedback] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const defaultName = useMemo(() => {
    if (!user) return '';
    return [user.firstName, user.surname].filter(Boolean).join(' ').trim();
  }, [user]);

  const defaultPhone = useMemo(() => {
    if (!user) return '';
    return user.mobilePhone || user.phone || user.homePhone || '';
  }, [user]);

  useEffect(() => {
    setOfferForm((prev) => ({
      ...prev,
      name: prev.name || defaultName,
      email: prev.email || email || '',
      phone: prev.phone || defaultPhone,
    }));
  }, [defaultName, defaultPhone, email]);

  useEffect(() => {
    let cancelled = false;
    async function loadOffers() {
      setOffersLoading(true);
      setOffersError('');
      try {
        const response = await fetch('/api/account/offers', { credentials: 'include' });
        if (cancelled) return;
        if (response.status === 401) {
          setRequiresAuth(true);
          setOffers([]);
          setOffersError('Sign in to review your offers.');
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load offers');
        }
        const payload = await response.json();
        if (cancelled) return;
        const items = Array.isArray(payload?.offers) ? payload.offers : [];
        items.sort(sortByDate);
        setOffers(items);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load offers', error);
        setOffersError('We could not load your offers. Please try again.');
      } finally {
        if (!cancelled) {
          setOffersLoading(false);
        }
      }
    }
    loadOffers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadViewings() {
      setViewingsLoading(true);
      setViewingsError('');
      try {
        const response = await fetch('/api/account/viewings', { credentials: 'include' });
        if (cancelled) return;
        if (response.status === 401) {
          setRequiresAuth(true);
          setViewings([]);
          setViewingsError('Sign in to see your viewing requests.');
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load viewings');
        }
        const payload = await response.json();
        if (cancelled) return;
        const items = Array.isArray(payload?.viewings) ? payload.viewings : [];
        items.sort(sortByDate);
        setViewings(items);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load viewings', error);
        setViewingsError('We could not load your viewing activity. Please try again.');
      } finally {
        if (!cancelled) {
          setViewingsLoading(false);
        }
      }
    }
    loadViewings();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOfferInputChange(event) {
    const { name, value } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleViewingInputChange(event) {
    const { name, value } = event.target;
    setViewingForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleOfferSubmit(event) {
    event.preventDefault();
    if (requiresAuth) {
      setOfferFeedback('Please sign in to submit an offer.');
      return;
    }
    setOfferFeedback('');
    setOfferSubmitting(true);
    try {
      const response = await fetch('/api/account/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(offerForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(payload?.details) ? payload.details.join(' ') : payload?.error;
        throw new Error(detail || 'Unable to submit offer');
      }
      const entry = payload?.offer;
      if (entry) {
        setOffers((prev) => [entry, ...prev.filter((item) => item?.id !== entry.id)].sort(sortByDate));
        setOfferForm((prev) => ({
          ...defaultOfferForm,
          name: prev.name || defaultName,
          email: prev.email || email || '',
          phone: prev.phone || defaultPhone,
        }));
        setOfferFeedback('Offer submitted successfully. Our team will be in touch.');
      }
    } catch (error) {
      console.error('Offer submission failed', error);
      setOfferFeedback(error instanceof Error ? error.message : 'Unable to submit offer.');
    } finally {
      setOfferSubmitting(false);
    }
  }

  async function handleViewingSubmit(event) {
    event.preventDefault();
    if (requiresAuth) {
      setViewingFeedback('Please sign in to request a viewing.');
      return;
    }
    setViewingFeedback('');
    setViewingSubmitting(true);
    try {
      const response = await fetch('/api/account/viewings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(viewingForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(payload?.details) ? payload.details.join(' ') : payload?.error;
        throw new Error(detail || 'Unable to request viewing');
      }
      const entry = payload?.viewing;
      if (entry) {
        setViewings((prev) => [entry, ...prev.filter((item) => item?.id !== entry.id)].sort(sortByDate));
        setViewingForm(defaultViewingForm);
        setViewingFeedback('Viewing request sent. We will confirm the appointment shortly.');
      }
    } catch (error) {
      console.error('Viewing request failed', error);
      setViewingFeedback(error instanceof Error ? error.message : 'Unable to request viewing.');
    } finally {
      setViewingSubmitting(false);
    }
  }

  const isLoading = sessionLoading || offersLoading || viewingsLoading;

  return (
    <AccountLayout
      heroSubtitle="My activity"
      heroTitle="Offers & viewings"
      heroDescription="Track your negotiations and appointments in one place, and raise new requests whenever you are ready."
    >
      {requiresAuth ? (
        <div className={styles.feedback} role="alert">
          Please sign in to manage your offers and viewing requests.
        </div>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Offer history</h2>
            <p>Review recent offers and raise a new one for any property on your shortlist.</p>
          </div>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.formCard}>
            <h3>Create a new offer</h3>
            <p>Submit the details below and our negotiators will follow up straight away.</p>
            <form className={styles.form} onSubmit={handleOfferSubmit}>
              <div className={styles.fieldGroup}>
                <label htmlFor="offer-propertyId">Property reference</label>
                <input
                  id="offer-propertyId"
                  name="propertyId"
                  value={offerForm.propertyId}
                  onChange={handleOfferInputChange}
                  required
                  placeholder="e.g. AKT-12345"
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-propertyTitle">Property name</label>
                  <input
                    id="offer-propertyTitle"
                    name="propertyTitle"
                    value={offerForm.propertyTitle}
                    onChange={handleOfferInputChange}
                    placeholder="Optional"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-propertyAddress">Address</label>
                  <input
                    id="offer-propertyAddress"
                    name="propertyAddress"
                    value={offerForm.propertyAddress}
                    onChange={handleOfferInputChange}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-amount">Offer amount</label>
                  <input
                    id="offer-amount"
                    name="amount"
                    value={offerForm.amount}
                    onChange={handleOfferInputChange}
                    required
                    inputMode="decimal"
                    placeholder="£2,500"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-frequency">Frequency</label>
                  <select
                    id="offer-frequency"
                    name="frequency"
                    value={offerForm.frequency}
                    onChange={handleOfferInputChange}
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-name">Your name</label>
                  <input
                    id="offer-name"
                    name="name"
                    value={offerForm.name}
                    onChange={handleOfferInputChange}
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-email">Email</label>
                  <input
                    id="offer-email"
                    name="email"
                    type="email"
                    value={offerForm.email}
                    onChange={handleOfferInputChange}
                    required
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="offer-phone">Phone number</label>
                <input
                  id="offer-phone"
                  name="phone"
                  value={offerForm.phone}
                  onChange={handleOfferInputChange}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="offer-message">Supporting notes</label>
                <textarea
                  id="offer-message"
                  name="message"
                  value={offerForm.message}
                  onChange={handleOfferInputChange}
                  rows={4}
                  placeholder="Add any conditions or context for your offer"
                />
              </div>
              {offerFeedback ? (
                <p className={styles.feedback} role="alert">
                  {offerFeedback}
                </p>
              ) : null}
              <button type="submit" className={styles.submitButton} disabled={offerSubmitting}>
                {offerSubmitting ? 'Sending offer…' : 'Submit offer'}
              </button>
            </form>
          </div>
          <div className={styles.listingCard}>
            <h3>Recent offers</h3>
            {offersLoading && !offers.length ? (
              <p className={styles.placeholder}>Loading your offers…</p>
            ) : null}
            {offersError ? <p className={styles.feedback}>{offersError}</p> : null}
            {!offersLoading && !offers.length && !offersError ? (
              <p className={styles.placeholder}>No offers yet. Submit one using the form to get started.</p>
            ) : null}
            <ul className={styles.offerList}>
              {offers.map((offer) => (
                <li key={offer.id} className={styles.offerCard}>
                  <header className={styles.offerHeader}>
                    <div>
                      <h4>Property {offer.propertyId}</h4>
                      {offer.propertyTitle ? <p>{offer.propertyTitle}</p> : null}
                      {offer.propertyAddress ? <p className={styles.subtle}>{offer.propertyAddress}</p> : null}
                    </div>
                    <div className={styles.offerMeta}>
                      <span className={styles.offerAmount}>{formatCurrency(offer.amount)}</span>
                      {offer.frequency ? <span className={styles.badge}>{offer.frequency}</span> : null}
                    </div>
                  </header>
                  {offer.message ? <p className={styles.offerMessage}>{offer.message}</p> : null}
                  <footer className={styles.offerFooter}>
                    <span>Status: {offer.status || 'submitted'}</span>
                    <span>{formatDate(offer.createdAt) || 'Pending'}</span>
                  </footer>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Viewing requests</h2>
            <p>Manage upcoming appointments and request new tours with the team.</p>
          </div>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.formCard}>
            <h3>Book a viewing</h3>
            <p>Tell us which property you would like to see and when suits you best.</p>
            <form className={styles.form} onSubmit={handleViewingSubmit}>
              <div className={styles.fieldGroup}>
                <label htmlFor="viewing-propertyId">Property reference</label>
                <input
                  id="viewing-propertyId"
                  name="propertyId"
                  value={viewingForm.propertyId}
                  onChange={handleViewingInputChange}
                  required
                  placeholder="e.g. AKT-12345"
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="viewing-date">Preferred date</label>
                  <input
                    id="viewing-date"
                    name="date"
                    type="date"
                    value={viewingForm.date}
                    onChange={handleViewingInputChange}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="viewing-time">Preferred time</label>
                  <input
                    id="viewing-time"
                    name="time"
                    type="time"
                    value={viewingForm.time}
                    onChange={handleViewingInputChange}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="viewing-message">Notes</label>
                <textarea
                  id="viewing-message"
                  name="message"
                  value={viewingForm.message}
                  onChange={handleViewingInputChange}
                  rows={4}
                  placeholder="Share your availability or key questions"
                />
              </div>
              {viewingFeedback ? (
                <p className={styles.feedback} role="alert">
                  {viewingFeedback}
                </p>
              ) : null}
              <button type="submit" className={styles.submitButton} disabled={viewingSubmitting}>
                {viewingSubmitting ? 'Sending request…' : 'Request viewing'}
              </button>
            </form>
          </div>
          <div className={styles.listingCard}>
            <h3>Upcoming & recent viewings</h3>
            {viewingsLoading && !viewings.length ? (
              <p className={styles.placeholder}>Loading your viewing requests…</p>
            ) : null}
            {viewingsError ? <p className={styles.feedback}>{viewingsError}</p> : null}
            {!viewingsLoading && !viewings.length && !viewingsError ? (
              <p className={styles.placeholder}>No viewing requests yet. Use the form to book your first appointment.</p>
            ) : null}
            <ul className={styles.viewingList}>
              {viewings.map((viewing) => (
                <li key={viewing.id} className={styles.viewingCard}>
                  <header className={styles.viewingHeader}>
                    <div>
                      <h4>Property {viewing.propertyId}</h4>
                      <span className={styles.badge}>{viewing.status || 'requested'}</span>
                    </div>
                    <div className={styles.viewingMeta}>
                      {viewing.preferredDate ? <span>{viewing.preferredDate}</span> : null}
                      {viewing.preferredTime ? <span>{viewing.preferredTime}</span> : null}
                      <span className={styles.subtle}>{formatDate(viewing.createdAt) || 'Pending'}</span>
                    </div>
                  </header>
                  {viewing.message ? <p className={styles.viewingMessage}>{viewing.message}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {isLoading && !offers.length && !viewings.length ? (
        <p className={styles.placeholder}>Loading your activity…</p>
      ) : null}
    </AccountLayout>
  );
}
