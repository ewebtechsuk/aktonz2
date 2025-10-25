import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PropertyActionDrawer from './PropertyActionDrawer';
import styles from '../styles/ViewingForm.module.css';

export default function ViewingForm({ property, selectedSlot = null, onClose }) {
  const router = useRouter();
  const basePath = (router?.basePath ?? '').replace(/\/$/, '');

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const propertyId = property?.id;
  const propertyTitle = property?.title || '';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClose = () => {
    setOpen(false);
    setForm(initialForm);
    setSent(false);
    setError('');
    setSubmitting(false);
    onClose?.();
  };

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      date: selectedSlot.date ?? '',
      time: selectedSlot.time ?? '',
    }));
    setSent(false);
    setError('');
    setSubmitting(false);
    setOpen(true);
  }, [selectedSlot?.triggerKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!propertyId) {
      setError('Missing property reference.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    try {
      const endpoint = process.env.NEXT_PUBLIC_BOOK_VIEWING_API
        ? `${process.env.NEXT_PUBLIC_BOOK_VIEWING_API.replace(/\/$/, '')}/${propertyId}/viewings`
        : `${basePath}/api/book-viewing`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, propertyId, propertyTitle }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
      setForm(initialForm);
    } catch (err) {
      setError('Failed to book viewing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen(true)}
        >
        Book a viewing
      </button>
      <PropertyActionDrawer
        open={open}
        onClose={handleClose}
        title="Book a viewing"
        description="Let us know when you&apos;d like to see this home and we&apos;ll confirm the appointment."
        property={property}
      >
        {sent ? (
          <div className={styles.feedback}>
            <h3>Request received</h3>
            <p>Thank you, we&apos;ll be in touch soon to confirm the viewing.</p>
            <button type="button" className={styles.feedbackButton} onClick={handleClose}>
              Close
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="viewing-name">Full name</label>
                <input
                  id="viewing-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="viewing-email">Email address</label>
                <input
                  id="viewing-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="viewing-phone">Phone number</label>
              <input
                id="viewing-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="viewing-date">Preferred date</label>
                <input
                  id="viewing-date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="viewing-time">Preferred time</label>
                <input
                  id="viewing-time"
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending request…' : 'Request viewing'}
            </button>
          </form>
        )}
      </PropertyActionDrawer>
    </>
  );
}
