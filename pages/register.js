import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useSession } from '../components/SessionProvider';
import styles from '../styles/Register.module.css';

export default function Register() {
  const router = useRouter();
  const { refresh, setSession, clearSession } = useSession();

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const queryEmail = Array.isArray(router.query.email)
      ? router.query.email[0]
      : router.query.email;

    if (typeof queryEmail === 'string' && queryEmail && !emailValue) {
      setEmailValue(queryEmail);
    }
  }, [router.isReady, router.query.email, emailValue]);

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = (emailValue || formData.get('email') || '').toString().trim();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }

    const branchId = process.env.NEXT_PUBLIC_APEX27_BRANCH_ID;

    const body = { email, password };
    if (branchId) {
      body.branchId = branchId;
    }

    setLoading(true);
    setStatus('Creating your account...');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (parseError) {
        data = {};
      }

      if (!res.ok) {
        setStatus(data?.error || data?.message || 'Registration failed');
        setLoading(false);
        return;
      }

      try {
        setSession({ contact: data?.contact || null, email: data?.email || email || null });
      } catch (sessionError) {
        console.warn('Failed to apply session from registration response', sessionError);
      }

      setStatus('Registration successful. Redirecting...');
      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after registration', refreshError);

      }
      router.push('/account');
    } catch (err) {
      console.error('Registration error', err);
      clearSession();
      setStatus('Registration failed');
      setLoading(false);
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
          <p className={styles.subtitle}>Stay on top of what&rsquo;s happening with your property.</p>
        </div>
        <div className={styles.formSection}>
          <Link href="/">← Back</Link>
          <h2>Create an account</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address *</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={emailValue}
              onChange={(event) => setEmailValue(event.target.value)}
            />
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Creating account…' : 'Register'}
            </button>
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
