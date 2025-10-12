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

function formatDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

function formatActor(actor) {
  if (!actor) {
    return '';
  }

  if (typeof actor === 'string') {
    return actor;
  }

  if (actor.name) {
    return actor.name;
  }

  if (actor.type === 'admin') {
    return 'Aktonz team';
  }

  if (actor.type === 'applicant') {
    return 'You';
  }

  return '';
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
  moveInDate: '',
  householdSize: '',
  hasPets: false,
  employmentStatus: '',
  proofOfFunds: '',
  referencingConsent: false,
  additionalConditions: '',
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

  function handleOfferCheckboxChange(event) {
    const { name, checked } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: checked }));
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
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-moveInDate">Preferred move-in date</label>
                  <input
                    id="offer-moveInDate"
                    name="moveInDate"
                    type="date"
                    value={offerForm.moveInDate}
                    onChange={handleOfferInputChange}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-householdSize">Occupants</label>
                  <input
                    id="offer-householdSize"
                    name="householdSize"
                    type="number"
                    min="1"
                    value={offerForm.householdSize}
                    onChange={handleOfferInputChange}
                    placeholder="Number of people"
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={`${styles.fieldGroup} ${styles.inlineCheckbox}`}>
                  <label htmlFor="offer-hasPets">
                    <input
                      id="offer-hasPets"
                      name="hasPets"
                      type="checkbox"
                      checked={offerForm.hasPets}
                      onChange={handleOfferCheckboxChange}
                    />
                    Travelling with pets
                  </label>
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="offer-employmentStatus">Employment status</label>
                  <input
                    id="offer-employmentStatus"
                    name="employmentStatus"
                    value={offerForm.employmentStatus}
                    onChange={handleOfferInputChange}
                    placeholder="e.g. Full-time employed"
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="offer-proofOfFunds">Proof of funds & referencing notes</label>
                <textarea
                  id="offer-proofOfFunds"
                  name="proofOfFunds"
                  value={offerForm.proofOfFunds}
                  onChange={handleOfferInputChange}
                  rows={3}
                  placeholder="Share details of your proof of funds or referencing status"
                />
              </div>
              <div className={`${styles.fieldGroup} ${styles.inlineCheckbox}`}>
                <label htmlFor="offer-referencingConsent">
                  <input
                    id="offer-referencingConsent"
                    name="referencingConsent"
                    type="checkbox"
                    checked={offerForm.referencingConsent}
                    onChange={handleOfferCheckboxChange}
                  />
                  I consent to Aktonz commencing referencing checks
                </label>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="offer-conditions">Move-in conditions</label>
                <textarea
                  id="offer-conditions"
                  name="additionalConditions"
                  value={offerForm.additionalConditions}
                  onChange={handleOfferInputChange}
                  rows={3}
                  placeholder="Deposit expectations, break clauses or other conditions"
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
              {offers.map((offer) => {
                const compliance = offer.compliance || {};
                const timeline = Array.isArray(offer.statusHistory) ? offer.statusHistory : [];
                const moveInDate = compliance.moveInDate ? formatDateOnly(compliance.moveInDate) : '';
                const consentLabel = compliance.referencingConsent
                  ? 'Consent provided'
                  : 'Consent pending';

                return (
                  <li key={offer.id} className={styles.offerCard}>
                    <header className={styles.offerHeader}>
                      <div>
                        <h4>Property {offer.propertyId}</h4>
                        {offer.propertyTitle ? <p>{offer.propertyTitle}</p> : null}
                        {offer.propertyAddress ? (
                          <p className={styles.subtle}>{offer.propertyAddress}</p>
                        ) : null}
                      </div>
                      <div className={styles.offerMeta}>
                        <span className={styles.offerAmount}>{formatCurrency(offer.amount)}</span>
                        {offer.frequency ? <span className={styles.badge}>{offer.frequency}</span> : null}
                        <span className={`${styles.badge} ${styles.statusBadge}`}>
                          {offer.statusLabel || 'In review'}
                        </span>
                      </div>
                    </header>

                    <dl className={styles.offerDetailsGrid}>
                      {moveInDate ? (
                        <div>
                          <dt>Move-in target</dt>
                          <dd>{moveInDate}</dd>
                        </div>
                      ) : null}
                      {compliance.householdSize ? (
                        <div>
                          <dt>Household size</dt>
                          <dd>{compliance.householdSize}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Pets</dt>
                        <dd>{compliance.hasPets ? 'Pets included' : 'No pets declared'}</dd>
                      </div>
                      {compliance.employmentStatus ? (
                        <div>
                          <dt>Employment</dt>
                          <dd>{compliance.employmentStatus}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Referencing</dt>
                        <dd>{consentLabel}</dd>
                      </div>
                    </dl>

                    {offer.message ? (
                      <p className={styles.offerMessage}>{offer.message}</p>
                    ) : null}
                    {compliance.proofOfFunds ? (
                      <div className={styles.offerNoteBlock}>
                        <h5>Proof of funds</h5>
                        <p>{compliance.proofOfFunds}</p>
                      </div>
                    ) : null}
                    {compliance.additionalConditions ? (
                      <div className={styles.offerNoteBlock}>
                        <h5>Conditions</h5>
                        <p>{compliance.additionalConditions}</p>
                      </div>
                    ) : null}

                    <div className={styles.timelineSection}>
                      <h5>Timeline</h5>
                      <ol className={styles.timelineList}>
                        {timeline.length ? (
                          timeline.map((event) => (
                            <li key={event.id}>
                              <div className={styles.timelineHeader}>
                                <span className={styles.timelineLabel}>{event.label}</span>
                                {formatActor(event.actor) ? (
                                  <span className={styles.timelineActor}>{formatActor(event.actor)}</span>
                                ) : null}
                              </div>
                              {event.note ? <p className={styles.timelineNote}>{event.note}</p> : null}
                              <time dateTime={event.createdAt || undefined} className={styles.timelineDate}>
                                {formatDate(event.createdAt) || 'Pending'}
                              </time>
                            </li>
                          ))
                        ) : (
                          <li className={styles.timelineEmpty}>Awaiting first update</li>
                        )}
                      </ol>
                    </div>
                  </li>
                );
              })}
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
