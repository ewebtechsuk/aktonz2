import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import styles from '../../styles/AdminOffers.module.css';

const STATUS_OPTIONS = ['new', 'reviewing', 'accepted', 'rejected'];
const PAYMENT_STATUS_OPTIONS = [
  'pending',
  'paid',
  'unpaid',
  'no_payment_required',
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value));
}

function OfferRow({ offer, onStatusChange, onPaymentStatusChange, onSaveNotes }) {
  const [notes, setNotes] = useState(offer.notes || '');
  const hasPayment = offer.payments?.length > 0;
  const latestPayment = hasPayment ? offer.payments[offer.payments.length - 1] : null;
  const paymentAmountLabel =
    latestPayment && Number.isFinite(latestPayment.amount)
      ? formatCurrency(latestPayment.amount / 100)
      : '—';

  useEffect(() => {
    setNotes(offer.notes || '');
  }, [offer.notes]);

  return (
    <tr>
      <td>
        <div className={styles.primaryCell}>
          <strong>{offer.name}</strong>
          <span>{offer.email}</span>
        </div>
      </td>
      <td>
        <div className={styles.primaryCell}>
          <strong>{offer.propertyTitle || offer.propertyId}</strong>
          <span>Offer: {formatCurrency(offer.price)}</span>
          {offer.frequency && <span>Frequency: {offer.frequency}</span>}
        </div>
      </td>
      <td>{formatDate(offer.createdAt)}</td>
      <td>
        <select
          value={offer.status}
          onChange={(event) => onStatusChange(offer.id, event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          value={offer.paymentStatus || 'pending'}
          onChange={(event) =>
            onPaymentStatusChange(offer.id, event.target.value)
          }
        >
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        {latestPayment && (
          <div className={styles.paymentMeta}>
            <span>{paymentAmountLabel}</span>
            <span>Status: {latestPayment.status}</span>
            {latestPayment.receiptUrl && (
              <a href={latestPayment.receiptUrl} target="_blank" rel="noreferrer">
                View receipt
              </a>
            )}
          </div>
        )}
      </td>
      <td>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => onSaveNotes(offer.id, notes)}
          placeholder="Add internal notes"
        />
      </td>
    </tr>
  );
}

export default function AdminOffersPage() {
  const [token, setToken] = useState('');
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = window.localStorage.getItem('aktonz-admin-token');
    if (storedToken) {
      setToken(storedToken);
      setTokenInput(storedToken);
    }
  }, []);

  const headers = useMemo(() => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/admin/offers', { headers })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }
        const data = await response.json();
        setOffers(data.offers || []);
        setError(null);
      })
      .catch(() => {
        setError('Unable to fetch offers. Check your admin token.');
      })
      .finally(() => setLoading(false));
  }, [token, headers]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    setToken(nextToken);
    if (typeof window !== 'undefined') {
      if (nextToken) {
        window.localStorage.setItem('aktonz-admin-token', nextToken);
      } else {
        window.localStorage.removeItem('aktonz-admin-token');
      }
    }
  };

  const updateOfferField = async (id, payload) => {
    try {
      const response = await fetch('/api/admin/offers', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, ...payload }),
      });

      if (!response.ok) throw new Error('Failed to update');

      const data = await response.json();
      setOffers((current) =>
        current.map((offer) => (offer.id === id ? data.offer : offer))
      );
    } catch (err) {
      console.error(err);
      setError('Failed to update offer. Please try again.');
    }
  };

  const handleStatusChange = (id, status) => updateOfferField(id, { status });
  const handlePaymentStatusChange = (id, paymentStatus) =>
    updateOfferField(id, { paymentStatus });
  const handleSaveNotes = (id, notes) => updateOfferField(id, { notes });

  return (
    <div className={styles.page}>
      <Head>
        <title>Offer Management | Admin</title>
      </Head>
      <main className={styles.container}>
        <header className={styles.header}>
          <h1>Offer management</h1>
          <p>Review new offers, track payments, and leave internal notes.</p>
        </header>

        <section className={styles.panel}>
          <form onSubmit={handleSubmit} className={styles.tokenForm}>
            <label htmlFor="admin-token">Admin access token</label>
            <div className={styles.tokenRow}>
              <input
                id="admin-token"
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Enter the token configured on the server"
              />
              <button type="submit">Unlock</button>
            </div>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </section>

        {loading && <p>Loading offers…</p>}

        {!loading && offers.length > 0 && (
          <section className={styles.tableSection}>
            <table>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Property</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    onStatusChange={handleStatusChange}
                    onPaymentStatusChange={handlePaymentStatusChange}
                    onSaveNotes={handleSaveNotes}
                  />
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!loading && token && offers.length === 0 && (
          <p>No offers submitted yet.</p>
        )}
      </main>
    </div>
  );
}
