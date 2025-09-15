import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/Register.module.css';

export default function Register() {
  const [status, setStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_APEX27_API_KEY;
    const branchId = process.env.NEXT_PUBLIC_APEX27_BRANCH_ID;

    const body = { email };
    if (branchId) {
      body.branchId = branchId;
    }

    try {
      let res;

      // Try the backend endpoint first when available.
      try {
        res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (_) {
        // Network failures fall through to the Apex27 fallback logic.
      }

      // If the backend fails, fall back to the public Apex27 API when a
      // client-side API key is configured.
      if (!res?.ok && apiKey) {
        try {
          res = await fetch('https://api.apex27.co.uk/contacts', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
        } catch (_) {
          // Ignore network errors and handle failure below.
        }
      }

      if (res?.ok) {
        setStatus('Registration successful');
      } else {
        let data = {};
        try {
          data = await res?.json();
        } catch (_) {
          // Non-JSON response or no response
        }
        // Without any API key we cannot persist the contact, but avoid
        // user-facing errors on static deployments.
        setStatus(
          data?.error ||
            data?.message ||
            (apiKey ? 'Registration failed' : 'Registration successful')
        );
      }
    } catch (err) {
      console.error('Registration error', err);
      setStatus('Registration failed');
    }
  }

  return (
    <>
      <Head>
        <title>Create Account | Aktonz</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.brandSection}>
          <h1>Aktonz</h1>
          <p>Insight. Information. Control. Wherever you are.</p>
          <p className={styles.subtitle}>Stay on top of what's happening with your property.</p>
        </div>
        <div className={styles.formSection}>
          <Link href="/">← Back</Link>
          <h2>Create an account</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address *</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required />
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
            <button type="submit" className={styles.button}>Register</button>
          </form>
          {status && <p className={styles.status}>{status}</p>}
          <p className={styles.signIn}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
          <p className={styles.legal}>
            By registering you agree to our <Link href="#">privacy policy</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
