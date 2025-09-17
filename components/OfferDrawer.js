import { useState } from 'react';
import { useRouter } from 'next/router';
import PropertyActionDrawer from './PropertyActionDrawer';
import styles from '../styles/OfferDrawer.module.css';

export default function OfferDrawer({ property }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState('pw');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const propertyId = property?.id;
  const propertyTitle = property?.title || '';

  const resetFields = () => {
    setPrice('');
    setFrequency('pw');
    setName('');
    setEmail('');
  };

  const handleClose = () => {
    setOpen(false);
    resetFields();
    setStatus(null);
    setSubmitting(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setStatus(null);

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
          frequency,
          name,
          email,
        }),
      });

      if (!res.ok) throw new Error('Request failed');
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
        </form>
      </PropertyActionDrawer>
    </>
  );
}
