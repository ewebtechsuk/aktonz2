import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyActionDrawer from './PropertyActionDrawer';
import styles from '../styles/OfferDrawer.module.css';

export default function OfferDrawer({ property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const transactionType = property?.transactionType
    ? String(property.transactionType).toLowerCase()
    : null;
  const isSaleListing = transactionType
    ? transactionType === 'sale'
    : !property?.rentFrequency;
  const defaultFrequency = isSaleListing ? '' : 'pw';
  const [frequency, setFrequency] = useState(defaultFrequency);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [offer, setOffer] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const propertyId = property?.id;
  const propertyTitle = property?.title || '';

  useEffect(() => {
    setFrequency(defaultFrequency);
  }, [defaultFrequency, propertyId]);

  const resetFields = () => {
    setPrice('');
    setFrequency(defaultFrequency);
    setName('');
    setEmail('');
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
          price,
          ...(isSaleListing ? {} : { frequency }),
          name,
          email,
          depositAmount: isSaleListing ? 0 : undefined,
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      const payload = await res.json();
      setOffer(payload?.offer || null);
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
                name="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
                  <option value="pw">Per week</option>
                  <option value="pcm">Per month</option>
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
