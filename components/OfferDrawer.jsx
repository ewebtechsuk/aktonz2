import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyActionDrawer from './PropertyActionDrawer';
import styles from '../styles/OfferDrawer.module.css';
import {
  isSaleListing as determineSaleListing,
  resolveOfferFrequency,
  OFFER_FREQUENCY_OPTIONS,
} from '../lib/offer-frequency.mjs';

export default function OfferDrawer({ property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const propertyId = property?.id;
  const propertyTitle = property?.title || '';
  const isSaleListing = useMemo(
    () => determineSaleListing(property),
    [property?.rentFrequency, property?.transactionType]
  );
  const defaultFrequency = useMemo(
    () => resolveOfferFrequency(property),
    [propertyId, property?.rentFrequency, property?.transactionType]
  );
  const availableFrequencyValues = useMemo(
    () => OFFER_FREQUENCY_OPTIONS.map((option) => option.value),
    []
  );
  const normalizedDefaultFrequency = useMemo(() => {
    if (isSaleListing) {
      return '';
    }
    if (
      defaultFrequency &&
      availableFrequencyValues.includes(defaultFrequency)
    ) {
      return defaultFrequency;
    }
    return availableFrequencyValues[0] ?? '';
  }, [availableFrequencyValues, defaultFrequency, isSaleListing]);
  const [frequency, setFrequency] = useState(normalizedDefaultFrequency);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [offer, setOffer] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    setFrequency(normalizedDefaultFrequency);
  }, [normalizedDefaultFrequency, propertyId]);

  const resetFields = () => {
    setOfferAmount('');
    setFrequency(normalizedDefaultFrequency);
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
  };

  const handleClose = () => {
    setOpen(false);
    resetFields();
    setStatus(null);
    setSubmitting(false);
    setOffer(null);
    setPaymentError(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setStatus(null);
    setPaymentError(null);

    if (!propertyId) {
      setStatus({ tone: 'error', message: 'Missing property reference.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${router.basePath}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          propertyTitle,
          offerAmount,
          ...(isSaleListing ? {} : { frequency }),
          name,
          email,
          ...(phone ? { phone } : {}),
          ...(message ? { message } : {}),
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      const payload = await res.json();
      if (payload?.offer) {
        setOffer(payload.offer);
      }
      setStatus({
        tone: 'success',
        message: 'Offer submitted successfully. We will be in touch shortly.',
      });
      resetFields();
    } catch {
      setStatus({
        tone: 'error',
        message: 'Failed to submit offer. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const depositLabel = offer?.depositAmount
    ? new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
      }).format(offer.depositAmount)
    : null;

  async function handlePayment() {
    if (!offer || paymentLoading) return;
    setPaymentError(null);
    setPaymentLoading(true);

    try {
      const res = await fetch(`${router.basePath}/api/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.id }),
      });

      if (!res.ok) throw new Error('payment-start-failed');

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error('missing-url');
    } catch (err) {
      console.error('Failed to start payment', err);
      setPaymentError('We were unable to start the payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        Make an offer
      </button>
      <PropertyActionDrawer
        open={open}
        onClose={handleClose}
        title="Make an offer"
        description="Share your best offer for this property and our team will respond as soon as possible."
        property={property}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="offer-price">Offer price</label>
              <input
                id="offer-price"
                type="number"
                min="0"
                name="offerAmount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                autoComplete="off"
                inputMode="decimal"
                required
              />
            </div>
            {!isSaleListing && (
              <div className={styles.field}>
                <label htmlFor="offer-frequency">Frequency</label>
                <select
                  id="offer-frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  autoComplete="off"
                >
                  {OFFER_FREQUENCY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="offer-name">Full name</label>
              <input
                id="offer-name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="offer-email">Email address</label>
              <input
                id="offer-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="offer-phone">Phone number (optional)</label>
              <input
                id="offer-phone"
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="offer-message">Message (optional)</label>
              <textarea
                id="offer-message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Sending offer…' : 'Send my offer'}
          </button>
          {status?.message && (
            <p
              className={`${styles.status} ${
                status.tone === 'error' ? styles.error : styles.success
              }`}
            >
              {status.message}
            </p>
          )}
          {offer && !isSaleListing && (
            <div className={styles.paymentPanel}>
              <h3>Secure this property</h3>
              <p>
                Complete the holding deposit
                {depositLabel ? ` of ${depositLabel}` : ''} to reserve your
                position. You can return to this step at any time from your
                confirmation email.
              </p>
              <button
                type="button"
                className={styles.paymentButton}
                onClick={handlePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Starting secure checkout…' : 'Pay holding deposit'}
              </button>
              {paymentError && (
                <p className={`${styles.status} ${styles.error}`}>
                  {paymentError}
                </p>
              )}
            </div>
          )}
        </form>
      </PropertyActionDrawer>
    </>
  );
}
