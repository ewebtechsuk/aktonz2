import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/ViewingForm.module.css';

export default function ViewingForm({ propertyTitle }) {
  const router = useRouter();

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClose = () => {
    setOpen(false);
    setForm(initialForm);
    setSent(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${router.basePath}/api/book-viewing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, propertyTitle }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
      setForm(initialForm);
    } catch (err) {
      setError('Failed to book viewing');
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.viewingButton}
        onClick={() => setOpen(true)}
      >
        Book a viewing
      </button>
      {open && <div className={styles.overlay} onClick={handleClose}></div>}

      {open && (
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Book a viewing</h2>
            <button
              type="button"
              className={styles.close}
              onClick={handleClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          {sent ? (
            <p className={styles.success}>Thank you, we'll be in touch soon.</p>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <p className={styles.address}>{propertyTitle}</p>
              <label htmlFor="viewing-name">Name</label>
              <input
                id="viewing-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
              <label htmlFor="viewing-email">Email</label>
              <input
                id="viewing-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              <label htmlFor="viewing-phone">Phone</label>
              <input
                id="viewing-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
              <label htmlFor="viewing-date">Preferred Date</label>
              <input
                id="viewing-date"
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                autoComplete="off"
              />
              <label htmlFor="viewing-time">Preferred Time</label>
              <input
                id="viewing-time"
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                autoComplete="off"
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.submit}>
                Request viewing
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
