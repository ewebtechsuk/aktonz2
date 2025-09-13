import { useState } from 'react';
import styles from '../styles/OfferDrawer.module.css';

export default function OfferDrawer({ propertyTitle, propertyId }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState('pw');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const resetFields = () => {
    setPrice('');
    setFrequency('pw');
    setName('');
    setEmail('');
  };

  const handleClose = () => {
    setOpen(false);
    resetFields();
    setStatus('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    try {
      const res = await fetch('/api/offers', {
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
      setStatus('Offer submitted successfully.');
      resetFields();
    } catch {
      setStatus('Failed to submit offer.');
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.offerButton}
        onClick={() => setOpen(true)}
      >
        Make an offer
      </button>
      {open && (
        <div
          className={styles.overlay}
          role="button"
          tabIndex={0}
          aria-label="Close drawer"
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
        ></div>
      )}
      <aside className={`${styles.drawer} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>Make an offer</h2>
          <button
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <p className={styles.address}>{propertyTitle}</p>
          <label htmlFor="offer-price">Offer price</label>
          <input
            id="offer-price"
            type="number"
            name="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            autoComplete="off"
          />
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
          <label htmlFor="offer-name">Name</label>
          <input
            id="offer-name"
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <label htmlFor="offer-email">Email</label>
          <input
            id="offer-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button type="submit" className={styles.submit}>
            Make an offer
          </button>
          {status && <p className={styles.status}>{status}</p>}
        </form>
      </aside>
    </>
  );
}
