import { useState } from 'react';
import styles from '../styles/Home.module.css';
import contactStyles from '../styles/Contact.module.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ message: '', error: false });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: '', error: false });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus({ message: 'Message sent successfully.', error: false });
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setStatus({ message: 'Failed to send message.', error: true });
    }
  };

  return (
    <main className={styles.main}>
      <div className={contactStyles.container}>
        <h1>Contact Us</h1>
        <form className={contactStyles.form} onSubmit={handleSubmit}>
          <div className={contactStyles.field}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className={contactStyles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className={contactStyles.field}>
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              rows="4"
              placeholder="How can we help?"
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>
          <button className={contactStyles.button} type="submit">
            Send Message
          </button>
          {status.message && (
            <p
              className={
                status.error ? contactStyles.error : contactStyles.success
              }
            >
              {status.message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
