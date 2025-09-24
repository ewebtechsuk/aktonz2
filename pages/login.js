import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useSession } from '../components/SessionProvider';
import styles from '../styles/Login.module.css';

export default function Login() {
  const router = useRouter();
  const { refresh, setSession, clearSession, user, loading: sessionLoading } = useSession();

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (user?.role === 'admin') {
      router.replace('/admin');
    } else if (user) {
      router.replace('/account');
    }
  }, [router, sessionLoading, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      setStatus('Email and password are required');
      return;
    }

    setLoading(true);
    setStatus('Signing you in...');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      let data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to sign in');
      }

      try {
        setSession({ contact: data?.contact || null, email: data?.email || email || null });
      } catch (sessionError) {
        console.warn('Failed to apply session from login response', sessionError);

      }

      try {
        await refresh();
      } catch (refreshError) {
        console.warn('Failed to refresh session after login', refreshError);
      }

      const isAdminResponse = Boolean(data?.admin || data?.contact?.role === 'admin');
      router.push(isAdminResponse ? '/admin' : '/account');
    } catch (err) {
      console.error('Login failed', err);
      clearSession();

      setStatus(err instanceof Error ? err.message : 'Unable to sign in');
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign in to Aktonz</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.brandSection}>
          <h1>Aktonz</h1>
          <p>Insight. Information. Control. Wherever you are.</p>
        </div>
        <div className={styles.formSection}>
          <Link href="/">← Back</Link>
          <h2>Sign in</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading || sessionLoading}
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading || sessionLoading}
            />
            <div className={styles.formFooter}>
              <label htmlFor="staySignedIn">
                <input
                  id="staySignedIn"
                  name="staySignedIn"
                  type="checkbox"
                  disabled={loading || sessionLoading}
                />{' '}
                Stay signed in
              </label>
              <Link href="#">Forgot Password?</Link>
            </div>
            <button type="submit" className={styles.button} disabled={loading || sessionLoading}>
              {loading || sessionLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {status ? <p className={styles.status}>{status}</p> : null}
          <p className={styles.createAccount}>
            New to Aktonz? <Link href="/register">Create Account</Link>
          </p>
          <p className={styles.legal}>
            By signing in you agree to our <Link href="#">privacy policy</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
