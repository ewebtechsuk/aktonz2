import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Register.module.css';

export default function Register() {
  const [status, setStatus] = useState('');
  const router = useRouter();

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
    try {
      let res;
      try {
        res = await fetch(`${router.basePath}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (_) {
        // network failure, fall back if possible
      }

      if (!res?.ok && process.env.NEXT_PUBLIC_APEX27_API_KEY) {
        const body = { email };
        if (process.env.NEXT_PUBLIC_APEX27_BRANCH_ID) {
          body.branchId = process.env.NEXT_PUBLIC_APEX27_BRANCH_ID;
        }
        res = await fetch('https://api.apex27.co.uk/contacts', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_APEX27_API_KEY,
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      }

      if (res?.ok) {

        setStatus('Registration successful');
      } else {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {
          // Non-JSON response (e.g., 404/405 HTML)
        }

        setStatus(data.error || 'Registration failed');
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
