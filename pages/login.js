import Link from 'next/link';
import styles from '../styles/Login.module.css';

export default function Login() {
  return (
    <div className={styles.container}>
      <div className={styles.brandSection}>
        <h1>Aktonz</h1>
        <p>Insight. Information. Control. Wherever you are.</p>
      </div>
      <div className={styles.formSection}>
        <Link href="/">← Back</Link>
        <h2>Sign in</h2>
        <form>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
          />
          <div className={styles.formFooter}>
            <label htmlFor="staySignedIn">
              <input id="staySignedIn" name="staySignedIn" type="checkbox" /> Stay signed in
            </label>
            <Link href="#">Forgot Password?</Link>
          </div>
          <button type="submit" className={styles.button}>Sign in</button>
        </form>
        <p className={styles.createAccount}>
          New to Aktonz? <Link href="/register">Create Account</Link>
        </p>
        <p className={styles.legal}>
          By signing in you agree to our <Link href="#">privacy policy</Link>.
        </p>
      </div>
    </div>

  );
}
